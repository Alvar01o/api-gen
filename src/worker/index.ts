import 'reflect-metadata';
import IORedis from 'ioredis';
import { initAppOrm } from '../core/database/app.orm';
import { startSchemaWorker } from './schema.worker';

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

initAppOrm()
  .then(() => {
    startSchemaWorker(connection);
    console.log('Schema worker started');
  })
  .catch((err) => {
    console.error('[worker] failed to init app DB:', err);
    process.exit(1);
  });
