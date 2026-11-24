import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initAppOrm } from './core/database/app.orm';
import schemaRoutes from './api/routes/schema.routes';
import jobRoutes from './api/routes/job.routes';
import authRoutes from './api/routes/auth.routes';
import tenantsRoutes from './api/routes/tenants.routes';
import { errorHandler } from './api/middlewares/error.middleware';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn('[warn] JWT_SECRET is not set — using insecure default. Set it in production.');
}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '1mb' }));

// Request timeout: respond 503 if handler takes longer than 30s
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(30_000, () => {
    if (!res.headersSent) res.status(503).json({ error: 'Request timeout' });
  });
  next();
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Init app DB before mounting routes
initAppOrm()
  .then(() => {
    app.use(authRoutes);
    app.use(tenantsRoutes);
    // Legacy routes kept for backwards compatibility
    app.use(jobRoutes);
    app.use(schemaRoutes);
    app.use(errorHandler);
    console.log('[api] routes mounted');
  })
  .catch((err) => {
    console.error('[api] failed to init app DB:', err);
    process.exit(1);
  });

export default app;
