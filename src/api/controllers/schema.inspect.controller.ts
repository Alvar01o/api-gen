import { Request, Response } from 'express';
import { MysqlConnector } from '../../core/connectors/mysql.connector';
import { PostgresConnector } from '../../core/connectors/postgres.connector';
import { DatabaseDAG } from '../../structures/graf';
import { Engine } from '../../shared/types';
import { getOrm } from '../../core/database/app.orm';
import { InspectResult } from '../../core/database/entities/InspectResult.entity';

const VALID_DB_NAME = /^[a-zA-Z0-9_]{1,100}$/;

export async function inspectSchemaHandler(req: Request, res: Response) {
  const { engine, dbName } = req.params as { engine: Engine; dbName: string };
  const userId: string | undefined = (req as any).user?.sub;
  const tenantId: string | undefined = (req as any).tenant?.id ?? req.params?.tenantId;

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

    const result = {
      engine,
      dbName,
      tables: dag.size(),
      cyclic: dag.hasCycle(),
      graph: dag.toJSON(),
    };

    // Persist inspect result
    try {
      const em = getOrm().em.fork();
      const record = em.create(InspectResult, { userId, tenantId, engine, dbName, data: result, createdAt: new Date() });
      em.persist(record);
      await em.flush();
    } catch (err: any) {
      console.warn('[inspect] could not persist result:', err.message);
    }

    return res.json(result);
  } finally {
    await connector.close();
  }
}
