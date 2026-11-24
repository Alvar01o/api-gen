import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireTenantAccess } from '../middlewares/tenant.middleware';
import { uploadSchema } from '../middlewares/upload.middleware';
import { schemaRateLimiter } from '../middlewares/rateLimit.middleware';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware';
import {
  createTenantHandler,
  listTenantsHandler,
  updateTenantHandler,
  deleteTenantHandler,
} from '../controllers/tenants.controller';
import { uploadSchemaHandler } from '../controllers/schema.controller';
import { inspectSchemaHandler } from '../controllers/schema.inspect.controller';
import { generateApisHandler } from '../controllers/schema.generate.controller';
import { listMyProjectsHandler } from '../controllers/my-projects.controller';
import { getJobHandler, listJobsHandler } from '../controllers/job.controller';
import {
  listEndpointsHandler,
  toggleEndpointHandler,
  bulkToggleEndpointsHandler,
} from '../controllers/public-endpoints.controller';

const router = Router();

// ─── Tenant CRUD ─────────────────────────────────────────────────────────────
router.post('/tenants', requireAuth, createTenantHandler);
router.get('/tenants', requireAuth, listTenantsHandler);
router.patch('/tenants/:tenantId', requireAuth, requireTenantAccess, updateTenantHandler);
router.delete('/tenants/:tenantId', requireAuth, requireTenantAccess, deleteTenantHandler);

// ─── Tenant-scoped schema/job/project routes ─────────────────────────────────
router.post(
  '/tenants/:tenantId/schema/upload',
  requireAuth,
  requireTenantAccess,
  schemaRateLimiter,
  idempotencyMiddleware,
  uploadSchema.single('schema'),
  uploadSchemaHandler,
);

router.get(
  '/tenants/:tenantId/schema/inspect/:engine/:dbName',
  requireAuth,
  requireTenantAccess,
  inspectSchemaHandler,
);

router.post(
  '/tenants/:tenantId/schema/generate/:engine/:dbName',
  requireAuth,
  requireTenantAccess,
  generateApisHandler,
);

router.get('/tenants/:tenantId/schema/jobs', requireAuth, requireTenantAccess, listJobsHandler);
router.get('/tenants/:tenantId/schema/job/:id', requireAuth, requireTenantAccess, getJobHandler);
router.get('/tenants/:tenantId/projects', requireAuth, requireTenantAccess, listMyProjectsHandler);

// ─── Public endpoint management ───────────────────────────────────────────────
router.get(
  '/tenants/:tenantId/projects/:projectId/endpoints',
  requireAuth,
  requireTenantAccess,
  listEndpointsHandler,
);
router.patch(
  '/tenants/:tenantId/projects/:projectId/endpoints',
  requireAuth,
  requireTenantAccess,
  bulkToggleEndpointsHandler,
);
router.patch(
  '/tenants/:tenantId/projects/:projectId/endpoints/:endpointId',
  requireAuth,
  requireTenantAccess,
  toggleEndpointHandler,
);

export default router;
