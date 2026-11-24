import IORedis from 'ioredis';
import { Router, Request, Response, NextFunction } from 'express';
import { makeCrudHandlers } from './handlers/crud';
import { makeLoginHandler } from './handlers/auth';
import { makeJwtMiddleware } from './middleware/jwt';
import { buildOpenApiSpec, buildSwaggerHtml } from './swagger';

export interface ColumnManifest {
  name: string;
  type: string;
  isPrimary: boolean;
  nullable: boolean;
}

export interface RelationManifest {
  column: string;
  referencedTable: string;
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
  /** belongsTo — FK owned by this table */
  relations: RelationManifest[];
  /** hasMany — other tables whose FK points to this table */
  hasMany: HasManyManifest[];
}

export interface AuthManifest {
  enabled: boolean;
  table: string;
  usernameField: string;
  passwordField: string;
  hashAlgorithm: 'bcrypt' | 'md5' | 'sha1' | 'sha256' | 'plain';
  prefix: string;
  publicEndpoints: string[];
}

export interface LambdaManifest {
  engine: string;
  dbName: string;
  registeredAt: string;
  tables: Record<string, TableManifest>;
  routes: string[];
  auth?: AuthManifest;
}

const MANIFEST_PREFIX = 'lambda:manifest:';
const REGISTRY_CHANNEL = 'lambda:registry';

export class Registry {
  private router: Router;
  // Maps "engine:dbName" → its current sub-router (replaced on re-registration)
  private subRouters = new Map<string, Router>();
  private pub: IORedis;
  private sub: IORedis;

  constructor(router: Router, redisConfig: { host: string; port: number }) {
    this.router = router;
    this.pub = new IORedis({ ...redisConfig, maxRetriesPerRequest: null });
    this.sub = new IORedis({ ...redisConfig, maxRetriesPerRequest: null });

    // Single dispatch middleware — chains all active sub-routers.
    // Registered once; re-registrations only replace the Map entry, never stack new handlers.
    this.router.use((req, res, next) => {
      const subs = Array.from(this.subRouters.values());
      let i = 0;
      function dispatch() {
        if (i >= subs.length) return next();
        subs[i++](req, res, dispatch);
      }
      dispatch();
    });
  }

  async loadExisting() {
    const keys = await this.pub.keys(`${MANIFEST_PREFIX}*`);
    if (keys.length === 0) return;
    const values = await this.pub.mget(...keys);
    for (const v of values) {
      if (v) this.mountManifest(JSON.parse(v) as LambdaManifest);
    }
  }

  async subscribe() {
    await this.sub.subscribe(REGISTRY_CHANNEL);
    this.sub.on('message', async (_channel: string, message: string) => {
      const { key } = JSON.parse(message) as { engine: string; dbName: string; key: string };
      const raw = await this.pub.get(key);
      if (raw) this.mountManifest(JSON.parse(raw) as LambdaManifest);
    });
  }

  private isValidManifest(m: unknown): m is LambdaManifest {
    const ID  = /^[a-zA-Z0-9_]{1,100}$/;          // strict: table/db/pk names
    const COL = /^[a-zA-Z0-9_\- .]{1,100}$/;      // loose: column names (quoted identifiers)
    if (!m || typeof m !== 'object') return false;
    const man = m as Record<string, unknown>;
    if (!['mysql', 'postgres'].includes(man.engine as string)) {
      console.error('[registry] invalid engine:', man.engine); return false;
    }
    if (typeof man.dbName !== 'string' || !ID.test(man.dbName)) {
      console.error('[registry] invalid dbName:', man.dbName); return false;
    }
    if (!man.tables || typeof man.tables !== 'object') {
      console.error('[registry] missing tables'); return false;
    }
    for (const [tableName, table] of Object.entries(man.tables as Record<string, unknown>)) {
      if (!ID.test(tableName)) {
        console.error('[registry] invalid tableName:', tableName); return false;
      }
      const t = table as Record<string, unknown>;
      if (typeof t.pk !== 'string' || !ID.test(t.pk)) {
        console.error(`[registry] invalid pk on table ${tableName}:`, t.pk); return false;
      }
      if (!Array.isArray(t.columns)) {
        console.error(`[registry] columns not array on table ${tableName}`); return false;
      }
      for (const col of t.columns as Record<string, unknown>[]) {
        if (typeof col.name !== 'string' || !COL.test(col.name)) {
          console.error(`[registry] invalid column name on table ${tableName}:`, JSON.stringify(col.name), 'charCodes:', String(col.name).split('').map(c => c.charCodeAt(0)));
          return false;
        }
      }
    }
    return true;
  }

  private mountManifest(manifest: LambdaManifest) {
    if (!this.isValidManifest(manifest)) {
      console.error('[registry] rejected invalid or untrusted manifest:', JSON.stringify(manifest).slice(0, 200));
      return;
    }

    const key = `${manifest.engine}:${manifest.dbName}`;
    const isUpdate = this.subRouters.has(key);
    console.log(`[registry] ${isUpdate ? 're-registering' : 'registering'} ${key}`);

    const { engine, dbName, tables, auth } = manifest;

    // Build a fresh sub-router for this manifest — replaces the old one atomically
    const sub = Router();

    // ── Swagger docs ─────────────────────────────────────────────────────────
    const docsBase = `/${engine}/${dbName}`;
    const specUrl  = `${docsBase}/openapi.json`;
    const spec     = buildOpenApiSpec(manifest);

    sub.get(specUrl, (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(spec);
    });

    sub.get(`${docsBase}/docs`, (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(buildSwaggerHtml(specUrl, `${engine}/${dbName}`));
    });

    // ── Auth: login endpoint (no JWT required) ────────────────────────────────
    if (auth?.enabled) {
      const loginPath = `/${engine}/${dbName}/${auth.prefix}/login`;
      sub.post(loginPath, makeLoginHandler(engine, dbName, auth));
      console.log(`[registry] auth login at POST ${loginPath}`);
    }

    // ── JWT middleware (applied only when auth is enabled) ────────────────────
    const jwtMiddleware = auth?.enabled ? makeJwtMiddleware(auth) : null;

    // ── CRUD routes ───────────────────────────────────────────────────────────
    for (const table of Object.values(tables)) {
      const handlers = makeCrudHandlers(engine, dbName, table, tables);
      const base = `/${engine}/${dbName}/${table.name}`;

      if (jwtMiddleware) {
        sub.get(base, jwtMiddleware, handlers.getAll);
        sub.get(`${base}/:id`, jwtMiddleware, handlers.getById);
        sub.get(`${base}/:id/:relation`, jwtMiddleware, handlers.getRelation as (req: Request, res: Response, next: NextFunction) => void);
        sub.post(base, jwtMiddleware, handlers.create);
        sub.put(`${base}/:id`, jwtMiddleware, handlers.update);
        sub.delete(`${base}/:id`, jwtMiddleware, handlers.remove);
      } else {
        sub.get(base, handlers.getAll);
        sub.get(`${base}/:id`, handlers.getById);
        sub.get(`${base}/:id/:relation`, handlers.getRelation as (req: Request, res: Response, next: NextFunction) => void);
        sub.post(base, handlers.create);
        sub.put(`${base}/:id`, handlers.update);
        sub.delete(`${base}/:id`, handlers.remove);
      }
    }

    // Atomic replace — the dispatch middleware in the constructor always reads
    // the current Map entry, so no stale handlers remain.
    this.subRouters.set(key, sub);
    console.log(`[registry] ${Object.keys(tables).length} tables live at /${engine}/${dbName}`);
  }

  listRegistered(): string[] {
    return Array.from(this.subRouters.keys());
  }
}
