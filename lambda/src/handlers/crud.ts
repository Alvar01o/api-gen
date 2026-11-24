import { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { Pool as PgPool, QueryResult } from 'pg';
import { TableManifest, RelationManifest, HasManyManifest } from '../registry';
import { getPool } from '../db/pool';

// ─── Identifier escaping ──────────────────────────────────────────────────────

function esc(engine: string, name: string) {
  if (engine === 'mysql') return `\`${name.replace(/`/g, '``')}\``;
  return `"${name.replace(/"/g, '""')}"`;
}

function placeholder(engine: string, index: number) {
  return engine === 'mysql' ? '?' : `$${index}`;
}

// ─── Low-level executor ───────────────────────────────────────────────────────

async function exec(
  engine: string,
  dbName: string,
  sql: string,
  values: unknown[] = [],
): Promise<unknown[]> {
  const pool = await getPool(engine, dbName);
  if (engine === 'mysql') {
    // mysql2 `execute` (prepared stmts) fails with LIMIT/OFFSET params — use `query` instead
    const [rows] = await (pool as mysql.Pool).query(sql, values as any[]);
    return rows as unknown[];
  }
  const result: QueryResult = await (pool as PgPool).query(sql, values);
  return result.rows;
}

// ─── Query param parsers ──────────────────────────────────────────────────────

interface Pagination { limit: number; offset: number }
interface Sort { column: string; order: 'ASC' | 'DESC' }
type Filters = Record<string, string>;

function parsePagination(q: Request['query']): Pagination {
  return {
    limit: Math.min(Math.max(1, Number(q.limit ?? 50)), 500),
    offset: Math.max(0, Number(q.offset ?? 0)),
  };
}

function parseSort(q: Request['query'], table: { columns: { name: string }[] }): Sort | null {
  const col = q.sort as string | undefined;
  if (!col) return null;
  if (!table.columns.find((c) => c.name === col)) return null;
  return { column: col, order: String(q.order ?? 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC' };
}

function parseFilters(q: Request['query'], table: TableManifest): Filters {
  const raw = (q.filter ?? {}) as Record<string, string>;
  const valid = new Set(table.columns.map((c) => c.name));
  return Object.fromEntries(Object.entries(raw).filter(([k]) => valid.has(k)));
}

interface ResolvedBelongsTo {
  kind: 'belongsTo';
  rel: RelationManifest;
  refTable: TableManifest;
}

interface ResolvedHasMany {
  kind: 'hasMany';
  hm: HasManyManifest;
  refTable: TableManifest;
}

type ResolvedInclude = ResolvedBelongsTo | ResolvedHasMany;

function parseInclude(
  q: Request['query'],
  table: TableManifest,
  allTables: Record<string, TableManifest>,
): ResolvedInclude[] {
  const raw = q.include as string | undefined;
  if (!raw) return [];
  const requested = new Set(raw.split(',').map((s) => s.trim()));

  const belongsTo: ResolvedInclude[] = table.relations
    .filter((r) => requested.has(r.referencedTable) && allTables[r.referencedTable])
    .map((r) => ({ kind: 'belongsTo' as const, rel: r, refTable: allTables[r.referencedTable] }));

  const hasMany: ResolvedInclude[] = (table.hasMany ?? [])
    .filter((hm) => requested.has(hm.table) && allTables[hm.table])
    .map((hm) => ({ kind: 'hasMany' as const, hm, refTable: allTables[hm.table] }));

  return [...belongsTo, ...hasMany];
}

// ─── SELECT builder ───────────────────────────────────────────────────────────

interface SelectResult {
  sql: string;
  countSql: string;
  values: unknown[];
}

const REL_PREFIX = '_rel_';

function buildSelect(
  engine: string,
  table: TableManifest,
  pagination: Pagination,
  sort: Sort | null,
  filters: Filters,
  includes: ResolvedInclude[],
  whereExtra?: { sql: string; values: unknown[] },
): SelectResult {
  const e = (n: string) => esc(engine, n);
  const values: unknown[] = [];
  let p = 0;
  const ph = () => placeholder(engine, ++p);

  // Main columns: table.*
  const selectParts = [`${e(table.name)}.*`];
  const joinParts: string[] = [];

  for (const inc of includes) {
    if (inc.kind === 'belongsTo') {
      const { rel, refTable } = inc;
      const alias = `${REL_PREFIX}${rel.referencedTable}`;
      // LEFT JOIN — one-to-one: FK is on this table, no row duplication
      joinParts.push(
        `LEFT JOIN ${e(rel.referencedTable)} AS ${e(alias)} ` +
        `ON ${e(table.name)}.${e(rel.column)} = ${e(alias)}.${e(rel.referencedColumn)}`,
      );
      for (const col of refTable.columns) {
        const colAlias = `${REL_PREFIX}${rel.referencedTable}__${col.name}`;
        selectParts.push(`${e(alias)}.${e(col.name)} AS ${e(colAlias)}`);
      }
    } else {
      // hasMany — correlated subquery returning a JSON array to avoid row duplication
      const { hm, refTable } = inc;
      const hmAlias = `_hm_${hm.table}`;
      const colAlias = `_has_${hm.table}`;
      if (engine === 'postgres') {
        selectParts.push(
          `(SELECT COALESCE(json_agg(row_to_json(${e(hmAlias)})), '[]'::json) ` +
          `FROM ${e(hm.table)} AS ${e(hmAlias)} ` +
          `WHERE ${e(hmAlias)}.${e(hm.foreignKey)} = ${e(table.name)}.${e(hm.localKey)}` +
          `) AS ${e(colAlias)}`,
        );
      } else {
        // MySQL: JSON_OBJECT per column, wrapped in JSON_ARRAYAGG
        const jsonObjArgs = refTable.columns
          .map((c) => `'${c.name.replace(/'/g, "\\'")}', \`${hmAlias}\`.\`${c.name.replace(/`/g, '``')}\``)
          .join(', ');
        selectParts.push(
          `(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(${jsonObjArgs})), JSON_ARRAY()) ` +
          `FROM \`${hm.table.replace(/`/g, '``')}\` AS \`${hmAlias}\` ` +
          `WHERE \`${hmAlias}\`.\`${hm.foreignKey.replace(/`/g, '``')}\` = ${e(table.name)}.${e(hm.localKey)}` +
          `) AS ${e(colAlias)}`,
        );
      }
    }
  }

  // WHERE
  const conditions: string[] = [];
  if (whereExtra) {
    conditions.push(whereExtra.sql);
    whereExtra.values.forEach((v) => { values.push(v); p++; });
  }
  for (const [col, val] of Object.entries(filters)) {
    conditions.push(`${e(table.name)}.${e(col)} = ${ph()}`);
    values.push(val);
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // ORDER
  const orderSql = sort
    ? `ORDER BY ${e(table.name)}.${e(sort.column)} ${sort.order}`
    : `ORDER BY ${e(table.name)}.${e(table.pk)} ASC`;

  const fromClause = `FROM ${e(table.name)} ${joinParts.join(' ')} ${whereSql}`.trim();

  // LIMIT / OFFSET
  values.push(pagination.limit, pagination.offset);
  const limitSql = `LIMIT ${ph()} OFFSET ${ph()}`;

  const sql = `SELECT ${selectParts.join(', ')} ${fromClause} ${orderSql} ${limitSql}`.trim();
  const countSql = `SELECT COUNT(*) AS total ${fromClause}`;

  return { sql, countSql, values };
}

// ─── Row processor: lift _rel_ prefixed cols into nested _relations ───────────

const HAS_PREFIX = '_has_';

function processRows(rows: unknown[]): unknown[] {
  return (rows as Record<string, unknown>[]).map((row) => {
    const clean: Record<string, unknown> = {};
    const relations: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(row)) {
      if (key.startsWith(REL_PREFIX) && key.includes('__')) {
        // belongsTo: _rel_tableName__colName → relations.tableName = { colName: val }
        const withoutPrefix = key.slice(REL_PREFIX.length);
        const sep = withoutPrefix.indexOf('__');
        const relTable = withoutPrefix.slice(0, sep);
        const relCol = withoutPrefix.slice(sep + 2);
        if (!relations[relTable]) relations[relTable] = {};
        (relations[relTable] as Record<string, unknown>)[relCol] = val;
      } else if (key.startsWith(HAS_PREFIX)) {
        // hasMany: _has_tableName → relations.tableName = [...] (JSON from subquery)
        const relTable = key.slice(HAS_PREFIX.length);
        // pg driver auto-parses JSON; mysql2 returns a string
        relations[relTable] = typeof val === 'string' ? JSON.parse(val) : (val ?? []);
      } else {
        clean[key] = val;
      }
    }

    if (Object.keys(relations).length) clean._relations = relations;
    return clean;
  });
}

// ─── Count helper ─────────────────────────────────────────────────────────────

async function countRows(
  engine: string,
  dbName: string,
  countSql: string,
  filterValues: unknown[],
): Promise<number> {
  const rows = await exec(engine, dbName, countSql, filterValues);
  const row = (rows as Record<string, unknown>[])[0];
  return Number(row?.total ?? row?.count ?? 0);
}

// ─── INSERT builder ───────────────────────────────────────────────────────────

function buildInsert(engine: string, table: TableManifest, body: Record<string, unknown>) {
  const e = (n: string) => esc(engine, n);
  const cols = table.columns.filter((c) => !c.isPrimary && body[c.name] !== undefined);
  if (cols.length === 0) throw new Error('No valid columns provided in body');
  let p = 0;
  const values = cols.map((c) => body[c.name]);
  const names = cols.map((c) => e(c.name)).join(', ');
  const phs = cols.map(() => placeholder(engine, ++p)).join(', ');
  const suffix = engine === 'postgres' ? ' RETURNING *' : '';
  return { sql: `INSERT INTO ${e(table.name)} (${names}) VALUES (${phs})${suffix}`, values };
}

// ─── UPDATE builder ───────────────────────────────────────────────────────────

function buildUpdate(engine: string, table: TableManifest, body: Record<string, unknown>, id: unknown) {
  const e = (n: string) => esc(engine, n);
  const cols = table.columns.filter((c) => !c.isPrimary && body[c.name] !== undefined);
  if (cols.length === 0) throw new Error('No valid columns provided in body');
  let p = 0;
  const values = [...cols.map((c) => body[c.name]), id];
  const sets = cols.map((c) => `${e(c.name)} = ${placeholder(engine, ++p)}`).join(', ');
  const pkPh = placeholder(engine, ++p);
  const suffix = engine === 'postgres' ? ' RETURNING *' : '';
  return { sql: `UPDATE ${e(table.name)} SET ${sets} WHERE ${e(table.pk)} = ${pkPh}${suffix}`, values };
}

// ─── Handler factory ──────────────────────────────────────────────────────────

export function makeCrudHandlers(
  engine: string,
  dbName: string,
  table: TableManifest,
  allTables: Record<string, TableManifest>,
) {
  return {

    // GET /:engine/:dbName/:table?limit&offset&sort&order&filter[col]=val&include=t1,t2
    async getAll(req: Request, res: Response) {
      try {
        const pagination = parsePagination(req.query);
        const sort = parseSort(req.query, table);
        const filters = parseFilters(req.query, table);
        const includes = parseInclude(req.query, table, allTables);

        const { sql, countSql, values } = buildSelect(engine, table, pagination, sort, filters, includes);

        // count uses only filter values (strip limit+offset at the end)
        const filterValues = values.slice(0, -(pagination.limit !== undefined ? 2 : 0));

        const [rows, total] = await Promise.all([
          exec(engine, dbName, sql, values),
          countRows(engine, dbName, countSql, filterValues),
        ]);

        res.json({
          data: processRows(rows),
          meta: { total, limit: pagination.limit, offset: pagination.offset, pages: Math.ceil(total / pagination.limit) },
        });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },

    // GET /:engine/:dbName/:table/:id?include=t1,t2
    async getById(req: Request, res: Response) {
      try {
        const { id } = req.params;
        const includes = parseInclude(req.query, table, allTables);

        const whereExtra = {
          sql: `${esc(engine, table.name)}.${esc(engine, table.pk)} = ${placeholder(engine, 1)}`,
          values: [id],
        };

        const { sql, values } = buildSelect(engine, table, { limit: 1, offset: 0 }, null, {}, includes, whereExtra);
        const rows = await exec(engine, dbName, sql, values);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json({ data: processRows(rows)[0] });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },

    // GET /:engine/:dbName/:table/:id/:relation
    async getRelation(req: Request, res: Response) {
      try {
        const { id, relation } = req.params;
        const rel = table.relations.find((r) => r.referencedTable === relation);
        if (!rel) return res.status(404).json({ error: `No relation "${relation}" on table "${table.name}"` });

        const e = (n: string) => esc(engine, n);

        // 1. Get FK value from parent row
        const parentSql = `SELECT ${e(rel.column)} FROM ${e(table.name)} WHERE ${e(table.pk)} = ${placeholder(engine, 1)} LIMIT 1`;
        const parentRows = await exec(engine, dbName, parentSql, [id]) as Record<string, unknown>[];
        if (!parentRows.length) return res.status(404).json({ error: `${table.name} ${id} not found` });

        const fkValue = parentRows[0][rel.column];
        if (fkValue === null || fkValue === undefined) return res.json({ data: null });

        // 2. Fetch related rows
        const pagination = parsePagination(req.query);
        const refTableMeta = allTables[rel.referencedTable];
        const sort = refTableMeta ? parseSort(req.query, refTableMeta) : null;

        let p = 0;
        const ph = () => placeholder(engine, ++p);
        const relatedSql =
          `SELECT * FROM ${e(rel.referencedTable)} WHERE ${e(rel.referencedColumn)} = ${ph()} ` +
          (sort ? `ORDER BY ${e(sort.column)} ${sort.order} ` : '') +
          `LIMIT ${ph()} OFFSET ${ph()}`;

        const countSql = `SELECT COUNT(*) AS total FROM ${e(rel.referencedTable)} WHERE ${e(rel.referencedColumn)} = ${placeholder(engine, 1)}`;

        const [relRows, countResult] = await Promise.all([
          exec(engine, dbName, relatedSql, [fkValue, pagination.limit, pagination.offset]),
          countRows(engine, dbName, countSql, [fkValue]),
        ]);

        res.json({
          data: relRows,
          relation: { from: table.name, fk: rel.column, to: rel.referencedTable, on: rel.referencedColumn },
          meta: { total: countResult, limit: pagination.limit, offset: pagination.offset, pages: Math.ceil(countResult / pagination.limit) },
        });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },

    // POST /:engine/:dbName/:table
    async create(req: Request, res: Response) {
      try {
        const { sql, values } = buildInsert(engine, table, req.body as Record<string, unknown>);
        const rows = await exec(engine, dbName, sql, values) as Record<string, unknown>[];
        if (engine === 'postgres') {
          res.status(201).json({ data: rows[0] });
        } else {
          res.status(201).json({ data: { insertId: (rows as any).insertId } });
        }
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },

    // PUT /:engine/:dbName/:table/:id
    async update(req: Request, res: Response) {
      try {
        const { id } = req.params;
        const { sql, values } = buildUpdate(engine, table, req.body as Record<string, unknown>, id);
        const rows = await exec(engine, dbName, sql, values) as Record<string, unknown>[];
        if (engine === 'postgres') {
          if (!rows.length) return res.status(404).json({ error: 'Not found' });
          res.json({ data: rows[0] });
        } else {
          const r = rows as any;
          if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
          res.json({ data: { affected: r.affectedRows } });
        }
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },

    // DELETE /:engine/:dbName/:table/:id
    async remove(req: Request, res: Response) {
      try {
        const { id } = req.params;
        const e = (n: string) => esc(engine, n);
        const sql = `DELETE FROM ${e(table.name)} WHERE ${e(table.pk)} = ${placeholder(engine, 1)}`;
        const rows = await exec(engine, dbName, sql, [id]);
        const affected = engine === 'mysql' ? (rows as any).affectedRows : rows.length;
        if (affected === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ data: { deleted: true, id } });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  };
}
