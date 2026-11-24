import { Worker } from 'bullmq';
import fs from 'fs';
import { getJob, updateJob } from '../shared/jobStore.service';
import { pub, progressChannel } from '../core/queue/publisher';
import { sanitizeSchemaFile } from '../shared/sqlGuard.service';
import { MysqlConnector } from '../core/connectors/mysql.connector';
import { PostgresConnector } from '../core/connectors/postgres.connector';
console.log('🚀 Schema worker booting...');
function envBool(name: string, def = false) {
  const v = process.env[name];
  if (v === undefined) return def;
  return v === 'true';
}

async function publish(jobId: string, payload: any) {
  await pub.publish(progressChannel(jobId), JSON.stringify(payload));
}

export function startSchemaWorker(connection: any) {
  return new Worker(
    'schema-jobs',
    async (bullJob) => {
      const { jobId } = bullJob.data as { jobId: string };
      const job = await getJob(jobId);
      console.log('📦 Processing job:', job?.id);
      if (!job) throw new Error(`Job not found: ${jobId}`);

      job.status = 'running';
      job.stage = 'starting';
      job.progress = 1;
      await updateJob(job);
      await publish(jobId, { type: 'progress', ...job });

      const dropOnFail = envBool('SCHEMA_DROP_DB_ON_FAILURE', true);
      const deleteAfter = envBool('DELETE_SCHEMA_AFTER_APPLY', true);
      let connector: MysqlConnector | PostgresConnector | null = null;
      let createdDb = false;

      try {
        // Sanitize: strip GRANT/REVOKE statements before validation and apply
        job.stage = 'sanitizing';
        job.progress = 3;
        await updateJob(job);
        await publish(jobId, { type: 'progress', ...job });
        await sanitizeSchemaFile(job.schemaPath);

        // SQL guard (sin cargar todo si es gigante: guard “light” por chunks)
        if (envBool('SCHEMA_ENABLE_SQL_GUARD', true)) {
          job.stage = 'validating';
          job.progress = 5;
          await updateJob(job);
          await publish(jobId, { type: 'progress', ...job });

          // Validación “streaming”: escanea chunks y busca keywords
          const forbidden = (process.env.SCHEMA_FORBIDDEN_KEYWORDS || '')
            .split(',')
            .map((k) => k.trim().toUpperCase())
            .filter(Boolean);

          await new Promise<void>((resolve, reject) => {
            const stream = fs.createReadStream(job.schemaPath, { encoding: 'utf8' });
            stream.on('data', (chunk) => {
              const upper = String(chunk).toUpperCase();
              for (const w of forbidden) {
                if (upper.includes(w)) {
                  stream.destroy();
                  return reject(new Error(`Forbidden SQL keyword detected: ${w}`));
                }
              }
            });
            stream.on('error', reject);
            stream.on('close', resolve);
            stream.on('end', resolve);
          });
        }

        if (process.env.SCHEMA_DRY_RUN === 'true') {
          job.status = 'success';
          job.stage = 'dry-run';
          job.progress = 100;
          job.finishedAt = new Date().toISOString();
          await updateJob(job);
          await publish(jobId, { type: 'done', ...job });
          return;
        }

        connector = job.engine === 'mysql' ? new MysqlConnector() : new PostgresConnector();

        const failIfExists = envBool('SCHEMA_FAIL_IF_DB_EXISTS', true);
        const exists = await connector.databaseExists(job.dbName);
        if (exists && failIfExists) throw new Error('Database already exists');

        job.stage = 'creating-db';
        job.progress = 15;
        await updateJob(job);
        await publish(jobId, { type: 'progress', ...job });

        if (!exists) {
          await connector.createDatabase(job.dbName);
          createdDb = true;
        }

        job.stage = 'applying-schema';
        job.progress = 35;
        await updateJob(job);
        await publish(jobId, { type: 'progress', ...job });

        // Progreso por bytes leídos (aprox)
        const size = fs.statSync(job.schemaPath).size || 1;
        let readBytes = 0;
        const rs = fs.createReadStream(job.schemaPath);
        rs.on('data', (buf) => {
          readBytes += buf.length;
          const pct = 35 + Math.floor((readBytes / size) * 60); // 35..95
          if (pct !== job.progress) {
            job.progress = Math.min(95, pct);
            job.stage = 'applying-schema';
            updateJob(job)
              .then(() => publish(jobId, { type: 'progress', ...job }))
              .catch((err) => console.warn(`[worker] progress update failed for job ${jobId}:`, err?.message));
          }
        });
        rs.close(); // solo para cálculo de progreso; el apply hace su propio stream

        await connector.applySchema(job.dbName, job.schemaPath);

        job.status = 'success';
        job.stage = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = { createdDb, applied: true };
        await updateJob(job);
        await publish(jobId, { type: 'done', ...job });

        if (deleteAfter) {
          try { fs.unlinkSync(job.schemaPath); } catch {}
        }
      } catch (e: any) {
        job.status = 'failed';
        job.stage = 'failed';
        job.error = e.message;
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        await updateJob(job);
        await publish(jobId, { type: 'failed', ...job });

        if (createdDb && dropOnFail && connector) {
          try { await connector.dropDatabase(job.dbName); } catch {}
        }

        throw e;
      }
    },
    { connection }
  );
}