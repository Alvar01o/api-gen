import IORedis from 'ioredis';
import { DatabaseDAG, TableNode } from '../../structures/graf';

export const LAMBDA_MANIFEST_PREFIX = 'lambda:manifest:';
export const LAMBDA_REGISTRY_CHANNEL = 'lambda:registry';

export interface ColumnManifest {
  name: string;
  type: string;
  isPrimary: boolean;
  nullable: boolean;
}

export interface RelationManifest {
  /** FK column in THIS table (e.g. user_id) */
  column: string;
  /** Table being referenced (e.g. users) */
  referencedTable: string;
  /** Column in the referenced table (e.g. id) */
  referencedColumn: string;
  constraintName: string;
}

export interface HasManyManifest {
  /** Detail table that holds the FK (e.g. sales_products) */
  table: string;
  /** FK column in the detail table (e.g. sale_id) */
  foreignKey: string;
  /** PK column in THIS table that is referenced (e.g. id) */
  localKey: string;
}

export interface TableManifest {
  name: string;
  pk: string;
  columns: ColumnManifest[];
  /** Non-cyclic FK relations derived from the DAG (belongsTo — FK owned by this table) */
  relations: RelationManifest[];
  /** Inverse relations — other tables whose FK points to this table */
  hasMany: HasManyManifest[];
}

export interface AuthManifest {
  enabled: boolean;
  /** Table used for authentication */
  table: string;
  /** Column used as username/email identifier */
  usernameField: string;
  /** Column used as password/hash */
  passwordField: string;
  /** Hashing algorithm used to verify passwords */
  hashAlgorithm: 'bcrypt' | 'md5' | 'sha1' | 'sha256' | 'plain';
  /** URL prefix for the login endpoint (e.g. "auth-api-dyn") */
  prefix: string;
  /** Routes that bypass JWT validation: "METHOD /engine/db/table[/:id]" */
  publicEndpoints: string[];
}

export interface LambdaManifest {
  engine: string;
  dbName: string;
  registeredAt: string;
  tables: Record<string, TableManifest>;
  routes: string[];
  /** Present only when JWT auth is enabled for this API */
  auth?: AuthManifest;
}

export interface AuthConfig {
  table: string;
  usernameField: string;
  passwordField: string;
  hashAlgorithm: string;
  publicEndpoints: string[];
}

function buildTableManifest(node: TableNode): TableManifest {
  const pkCol = node.data.columns.find((c) => c.isPrimary)
    ?? node.data.columns.find((c) => c.name === 'id')
    ?? node.data.columns[0];
  if (!node.data.columns.some((c) => c.isPrimary)) {
    console.warn(`[generator] table "${node.id}" has no explicit PK — using "${pkCol?.name ?? 'none'}" as fallback`);
  }

  const relations: RelationManifest[] = node.children
    .filter((c) => c.type === 'fk' && !c.is_cyclic)
    .map((c) => {
      const fk = c as Extract<typeof c, { type: 'fk' }>;
      return {
        column: fk.data.columnName,
        referencedTable: fk.id,
        referencedColumn: fk.data.referencedColumn,
        constraintName: fk.data.constraintName,
      };
    });

  return {
    name: node.id,
    pk: pkCol?.name ?? 'id',
    columns: node.data.columns.map((c) => ({
      name: c.name,
      type: c.type,
      isPrimary: c.isPrimary ?? false,
      nullable: c.nullable ?? true,
    })),
    relations,
    hasMany: [], // populated in second pass inside generateManifest
  };
}

function buildRoutes(engine: string, dbName: string, tables: Record<string, TableManifest>): string[] {
  const base = `/${engine}/${dbName}`;
  const routes: string[] = [];

  for (const t of Object.values(tables)) {
    routes.push(`GET    ${base}/${t.name}?[limit&offset&sort&order&filter[col]=val&include=t1,t2]`);
    routes.push(`GET    ${base}/${t.name}/:id?[include=t1,t2]`);
    for (const rel of t.relations) {
      routes.push(`GET    ${base}/${t.name}/:id/${rel.referencedTable}`);
    }
    routes.push(`POST   ${base}/${t.name}`);
    routes.push(`PUT    ${base}/${t.name}/:id`);
    routes.push(`DELETE ${base}/${t.name}/:id`);
  }

  return routes;
}

/** Generate clean route keys for public endpoint records */
export function buildCleanRouteKeys(
  engine: string,
  dbName: string,
  tables: Record<string, TableManifest>,
): Array<{ method: string; route: string; routeKey: string }> {
  const base = `/${engine}/${dbName}`;
  const result: Array<{ method: string; route: string; routeKey: string }> = [];

  for (const t of Object.values(tables)) {
    const b = `${base}/${t.name}`;
    result.push({ method: 'GET',    route: b,              routeKey: `GET ${b}` });
    result.push({ method: 'GET',    route: `${b}/:id`,     routeKey: `GET ${b}/:id` });
    for (const rel of t.relations) {
      const r = `${b}/:id/${rel.referencedTable}`;
      result.push({ method: 'GET', route: r, routeKey: `GET ${r}` });
    }
    result.push({ method: 'POST',   route: b,              routeKey: `POST ${b}` });
    result.push({ method: 'PUT',    route: `${b}/:id`,     routeKey: `PUT ${b}/:id` });
    result.push({ method: 'DELETE', route: `${b}/:id`,     routeKey: `DELETE ${b}/:id` });
  }

  return result;
}

export async function generateManifest(
  engine: string,
  dbName: string,
  dag: DatabaseDAG,
  redis: IORedis,
  authConfig?: AuthConfig,
): Promise<LambdaManifest> {
  const graph = dag.toJSON();
  const tables: Record<string, TableManifest> = {};

  for (const node of Object.values(graph)) {
    tables[node.id] = buildTableManifest(node as TableNode);
  }

  // Second pass: populate hasMany by scanning all belongsTo relations
  for (const table of Object.values(tables)) {
    for (const rel of table.relations) {
      const parent = tables[rel.referencedTable];
      if (!parent) continue;
      const already = parent.hasMany.some(
        (hm) => hm.table === table.name && hm.foreignKey === rel.column,
      );
      if (!already) {
        parent.hasMany.push({
          table: table.name,
          foreignKey: rel.column,
          localKey: rel.referencedColumn,
        });
      }
    }
  }

  const manifest: LambdaManifest = {
    engine,
    dbName,
    registeredAt: new Date().toISOString(),
    tables,
    routes: buildRoutes(engine, dbName, tables),
  };

  if (authConfig) {
    const prefix = process.env.LAMBDA_AUTH_PREFIX ?? 'auth-api-dyn';
    manifest.auth = {
      enabled: true,
      table: authConfig.table,
      usernameField: authConfig.usernameField,
      passwordField: authConfig.passwordField,
      hashAlgorithm: authConfig.hashAlgorithm as AuthManifest['hashAlgorithm'],
      prefix,
      publicEndpoints: authConfig.publicEndpoints,
    };
  }

  const key = `${LAMBDA_MANIFEST_PREFIX}${engine}:${dbName}`;
  await redis.set(key, JSON.stringify(manifest));
  await redis.publish(LAMBDA_REGISTRY_CHANNEL, JSON.stringify({ engine, dbName, key }));

  return manifest;
}

export async function listManifests(redis: IORedis): Promise<LambdaManifest[]> {
  const keys = await redis.keys(`${LAMBDA_MANIFEST_PREFIX}*`);
  if (keys.length === 0) return [];
  const values = await redis.mget(...keys);
  return values
    .filter((v): v is string => v !== null)
    .map((v) => JSON.parse(v) as LambdaManifest);
}

/** Update only the publicEndpoints list in an existing manifest */
export async function updateManifestPublicEndpoints(
  engine: string,
  dbName: string,
  publicEndpoints: string[],
  redis: IORedis,
): Promise<void> {
  const key = `${LAMBDA_MANIFEST_PREFIX}${engine}:${dbName}`;
  const raw = await redis.get(key);
  if (!raw) return;

  const manifest = JSON.parse(raw) as LambdaManifest;
  if (manifest.auth) {
    manifest.auth.publicEndpoints = publicEndpoints;
    manifest.registeredAt = new Date().toISOString();
    await redis.set(key, JSON.stringify(manifest));
    await redis.publish(LAMBDA_REGISTRY_CHANNEL, JSON.stringify({ engine, dbName, key }));
  }
}
