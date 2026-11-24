import express from 'express';
import { Registry } from './registry';

const app = express();
app.use(express.json());

const PORT = Number(process.env.LAMBDA_PORT ?? 4000);
const redisConfig = {
  host: process.env.REDIS_HOST ?? 'redis',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

// Dynamic router — routes are mounted here at runtime
const dynamicRouter = express.Router();
app.use('/', dynamicRouter);

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// List registered databases
app.get('/registry', (_req, res) => {
  res.json({ registered: registry.listRegistered() });
});

const registry = new Registry(dynamicRouter, redisConfig);

async function start() {
  await registry.loadExisting();
  await registry.subscribe();

  app.listen(PORT, () => {
    console.log(`[lambda] listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[lambda] startup error:', err);
  process.exit(1);
});
