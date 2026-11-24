import { Queue } from 'bullmq';

export const schemaQueue = new Queue('schema-jobs', {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
});