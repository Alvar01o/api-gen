import { randomUUID } from 'crypto';
import { SchemaJob } from './types';
import { getOrm } from '../core/database/app.orm';
import { SchemaJobRecord } from '../core/database/entities/SchemaJob.entity';

// ─── Mapping helpers ─────────────────────────────────────────────────────────

function toSchemaJob(r: SchemaJobRecord): SchemaJob {
  return {
    id:         r.id,
    userId:     r.userId,
    tenantId:   r.tenantId,
    engine:     r.engine as SchemaJob['engine'],
    dbName:     r.dbName,
    hash:       r.hash,
    schemaPath: r.schemaPath ?? '',
    status:     r.status as SchemaJob['status'],
    progress:   r.progress,
    stage:      r.stage,
    error:      r.error,
    result:     r.result as SchemaJob['result'],
    createdAt:  r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    finishedAt: r.finishedAt instanceof Date ? r.finishedAt.toISOString() : undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createJob(
  init: Pick<SchemaJob, 'engine' | 'dbName' | 'schemaPath'> & { hash?: string; userId?: string; tenantId?: string },
): Promise<SchemaJob> {
  const em = getOrm().em.fork();
  const now = new Date();
  const record = em.create(SchemaJobRecord, {
    id:         randomUUID(),
    userId:     init.userId,
    tenantId:   init.tenantId,
    engine:     init.engine,
    dbName:     init.dbName,
    hash:       init.hash,
    schemaPath: init.schemaPath,
    status:     'queued',
    progress:   0,
    createdAt:  now,
  });
  em.persist(record);
  await em.flush();
  return toSchemaJob(record);
}

export async function updateJob(job: SchemaJob): Promise<void> {
  const em = getOrm().em.fork();
  const record = await em.findOne(SchemaJobRecord, { id: job.id });
  if (!record) return;

  record.status   = job.status;
  record.progress = job.progress;
  record.stage    = job.stage;
  record.error    = job.error;
  record.result   = job.result as object;
  if (job.finishedAt) record.finishedAt = new Date(job.finishedAt);

  await em.flush();
}

export async function getJob(id: string): Promise<SchemaJob | null> {
  const em = getOrm().em.fork();
  const record = await em.findOne(SchemaJobRecord, { id });
  return record ? toSchemaJob(record) : null;
}

export async function getJobsByUser(userId: string): Promise<SchemaJob[]> {
  const em = getOrm().em.fork();
  const records = await em.find(SchemaJobRecord, { userId }, { orderBy: { createdAt: 'DESC' } });
  return records.map(toSchemaJob);
}

export async function getJobsByTenant(tenantId: string): Promise<SchemaJob[]> {
  const em = getOrm().em.fork();
  const records = await em.find(SchemaJobRecord, { tenantId }, { orderBy: { createdAt: 'DESC' } });
  return records.map(toSchemaJob);
}

export async function findSuccessfulJobByHash(engine: string, hash: string, tenantId?: string): Promise<SchemaJob | null> {
  const em = getOrm().em.fork();
  const where: Record<string, unknown> = { engine, hash, status: 'success' };
  if (tenantId) where['tenantId'] = tenantId;
  const record = await em.findOne(SchemaJobRecord, where);
  return record ? toSchemaJob(record) : null;
}
