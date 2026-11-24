import { Router } from 'express';
import { uploadSchema } from '../middlewares/upload.middleware';
import { uploadSchemaHandler } from '../controllers/schema.controller';
import { inspectSchemaHandler } from '../controllers/schema.inspect.controller';
import { generateApisHandler } from '../controllers/schema.generate.controller';
import { listMyProjectsHandler } from '../controllers/my-projects.controller';
import { schemaRateLimiter } from '../middlewares/rateLimit.middleware';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post(
  '/schema/upload',
  requireAuth,
  schemaRateLimiter,
  idempotencyMiddleware,
  uploadSchema.single('schema'),
  uploadSchemaHandler,
);

router.get('/schema/inspect/:engine/:dbName', requireAuth, inspectSchemaHandler);
router.post('/schema/generate/:engine/:dbName', requireAuth, generateApisHandler);
router.get('/schema/my-projects', requireAuth, listMyProjectsHandler);

export default router;
