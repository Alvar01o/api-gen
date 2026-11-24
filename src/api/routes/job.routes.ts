import { Router } from 'express';
import { getJobHandler, listJobsHandler } from '../controllers/job.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
router.get('/schema/job/:id', requireAuth, getJobHandler);
router.get('/schema/jobs',    requireAuth, listJobsHandler);
export default router;
