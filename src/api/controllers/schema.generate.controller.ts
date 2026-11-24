import { Request, Response } from 'express';
import IORedis from 'ioredis';
import { MysqlConnector } from '../../core/connectors/mysql.connector';
import { PostgresConnector } from '../../core/connectors/postgres.connector';
import { DatabaseDAG } from '../../structures/graf';
import { generateManifest, buildCleanRouteKeys } from '../../core/generator/crud.generator';
import { Engine } from '../../shared/types';
import { getOrm } from '../../core/database/app.orm';
import { GeneratedApi } from '../../core/database/entities/GeneratedApi.entity';
import { PublicEndpoint } from '../../core/database/entities/PublicEndpoint.entity';
import { detectAuthTable } from '../../core/auth-detection/user-table-detector';

const VALID_DB_NAME = /^[a-zA-Z0-9_]{1,100}$/;

const redis = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

export async function generateApisHandler(req: Request, res: Response) {
  const { engine, dbName } = req.params as { engine: Engine; dbName: string };
  const userId: string | undefined = (req as any).user?.sub;
  const tenantId: string | undefined = (req as any).tenant?.id ?? req.params?.tenantId;

  const {
    requiresAuth = false,
    hashAlgorithm = 'bcrypt',
  } = req.body as { requiresAuth?: boolean; hashAlgorithm?: string };

  if (!engine || !['mysql', 'postgres'].includes(engine)) {
    return res.status(400).json({ error: 'Invalid engine. Use "mysql" or "postgres"' });
  }
  if (!dbName || !VALID_DB_NAME.test(dbName)) {
    return res.status(400).json({ error: 'Invalid database name' });
  }

  const connector = engine === 'mysql' ? new MysqlConnector() : new PostgresConnector();

  try {
    await connector.connect(dbName);
    const schema = await connector.loadSchema();
    const dag = DatabaseDAG.fromDatabaseStructure(schema);
    const graph = dag.toJSON();

    // ── Auth detection ────────────────────────────────────────────────────────
    let authConfig: Parameters<typeof generateManifest>[4] | undefined;
    let authDetection: {
      detected: boolean;
      table?: string;
      usernameField?: string;
      passwordField?: string;
      source?: string;
    } = { detected: false };

    if (requiresAuth) {
      const tableNames = Object.keys(graph);
      const tableColumns: Record<string, string[]> = {};
      for (const [name, node] of Object.entries(graph)) {
        tableColumns[name] = (node as any).data.columns.map((c: any) => c.name);
      }

      const detection = await detectAuthTable({ tableNames, tableColumns });

      if (detection.found) {
        authDetection = {
          detected: true,
          table: detection.table,
          usernameField: detection.usernameField,
          passwordField: detection.passwordField,
          source: detection.source,
        };
        // Start with no public endpoints — all routes require JWT by default
        authConfig = {
          table: detection.table,
          usernameField: detection.usernameField,
          passwordField: detection.passwordField,
          hashAlgorithm,
          publicEndpoints: [],
        };
      } else {
        authDetection = { detected: false, source: detection.source };
      }
    }

    // ── Generate + publish manifest ───────────────────────────────────────────
    const manifest = await generateManifest(engine, dbName, dag, redis, authConfig);

    // ── Persist generated API ─────────────────────────────────────────────────
    const em = getOrm().em.fork();
    try {
      const record = em.create(GeneratedApi, {
        userId,
        tenantId,
        engine,
        dbName,
        manifest: manifest as unknown as object,
        routes: manifest.routes,
        createdAt: new Date(),
        authEnabled:       authDetection.detected ? true : undefined,
        authTable:         authDetection.table,
        authUsernameField: authDetection.usernameField,
        authPasswordField: authDetection.passwordField,
        authHashAlgorithm: authDetection.detected ? hashAlgorithm : undefined,
      });
      em.persist(record);
      await em.flush();

      // ── Create PublicEndpoint records (all private by default) ───────────
      if (tenantId) {
        const cleanRoutes = buildCleanRouteKeys(engine, dbName, manifest.tables);
        for (const r of cleanRoutes) {
          const ep = em.create(PublicEndpoint, {
            generatedApiId: record.id,
            tenantId,
            method: r.method,
            route: r.route,
            routeKey: r.routeKey,
            isPublic: false,
            createdAt: new Date(),
          });
          em.persist(ep);
        }
        await em.flush();
      }
    } catch (err: any) {
      console.warn('[generate] could not persist result:', err.message);
    }

    return res.json({
      success: true,
      engine,
      dbName,
      tables: Object.keys(manifest.tables).length,
      routes: manifest.routes,
      auth: requiresAuth
        ? {
            enabled: authDetection.detected,
            table: authDetection.table,
            usernameField: authDetection.usernameField,
            passwordField: authDetection.passwordField,
            source: authDetection.source,
            hashAlgorithm: authDetection.detected ? hashAlgorithm : undefined,
            loginEndpoint: authDetection.detected
              ? `POST /${engine}/${dbName}/${process.env.LAMBDA_AUTH_PREFIX ?? 'auth-api-dyn'}/login`
              : undefined,
          }
        : undefined,
    });
  } finally {
    await connector.close();
  }
}
