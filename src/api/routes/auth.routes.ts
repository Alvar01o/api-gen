import { Router } from 'express';
import { registerHandler, loginHandler, meHandler } from '../controllers/auth.controller';
import { listUsersHandler, listAllJobsHandler, listAllInspectsHandler, listAllGeneratedHandler } from '../controllers/admin.controller';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';
import { contactHandler } from '../controllers/contact.controller';
import { authRateLimiter, contactRateLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post('/auth/register', authRateLimiter, registerHandler);
router.post('/auth/login', authRateLimiter, loginHandler);
router.get('/auth/me', requireAuth, meHandler);

router.post('/contact', contactRateLimiter, contactHandler);

// Admin
router.get('/admin/users',     requireAuth, requireAdmin, listUsersHandler);
router.get('/admin/jobs',      requireAuth, requireAdmin, listAllJobsHandler);
router.get('/admin/inspects',  requireAuth, requireAdmin, listAllInspectsHandler);
router.get('/admin/generated', requireAuth, requireAdmin, listAllGeneratedHandler);

export default router;
