import { schemaQueue } from '../../core/queue/queue';
import { createJob, findSuccessfulJobByHash } from '../../shared/jobStore.service';
import { sha256File } from '../../shared/hash';
import { Engine } from '../../shared/types';
import IORedis from 'ioredis';
import { unlink } from 'fs/promises';

const VALID_DB_NAME = /^[a-zA-Z0-9_]{1,100}$/;
const DEDUP_LOCK_TTL_MS = 30_000;

const redis = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

function envBool(name: string, def = false) {
  const v = process.env[name];
  if (v === undefined) return def;
  return v === 'true';
}

export async function uploadSchemaHandler(req: any, res: any) {
  const { engine, name } = req.body as { engine: Engine; name: string };
  const userId: string | undefined = req.user?.sub;
  const tenantId: string | undefined = req.tenant?.id ?? req.params?.tenantId;

  if (!engine || !['mysql', 'postgres'].includes(engine)) {
    return res.status(400).json({ error: 'Invalid engine type' });
  }
  if (!name || !VALID_DB_NAME.test(name)) {
    return res.status(400).json({ error: 'Invalid database name' });
  }
  if (!req.file?.path) {
    return res.status(400).json({ error: 'Schema file is required' });
  }

  const schemaPath = req.file.path;
  const hash = await sha256File(schemaPath);

  const dedupe = envBool('SCHEMA_DEDUPLICATE_BY_HASH', true);
  if (dedupe) {
    const lockKey = `dedup:lock:${tenantId ?? userId}:${engine}:${hash}`;
    const acquired = await redis.set(lockKey, '1', 'PX', DEDUP_LOCK_TTL_MS, 'NX');

    if (!acquired) {
      return res.status(409).json({ error: 'Same schema is already being processed. Retry shortly.' });
    }

    const existing = await findSuccessfulJobByHash(engine, hash, tenantId);
    if (existing) {
      await redis.del(lockKey);
      await unlink(schemaPath).catch(() => {});
      return res.json({ success: true, deduped: true, jobId: existing.id });
    }
  }

  let job;
  try {
    job = await createJob({ engine, dbName: name, hash, schemaPath, userId, tenantId });
    await schemaQueue.add(
      'apply-schema',
      { jobId: job.id },
      { removeOnComplete: true, removeOnFail: true },
    );
  } catch (err) {
    await unlink(schemaPath).catch(() => {});
    throw err;
  }

  res.json({ success: true, jobId: job.id });
}
