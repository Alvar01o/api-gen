import { Request, Response } from 'express';
import { getJob, getJobsByTenant, getJobsByUser } from '../../shared/jobStore.service';

export async function getJobHandler(req: Request, res: Response) {
  const job = await getJob(String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const user = (req as any).user;
  const tenantId: string | undefined = (req as any).tenant?.id ?? req.params?.tenantId;

  if (tenantId) {
    if (job.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } else if (user?.role === 'client' && job.userId && job.userId !== user.sub) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(job);
}

export async function listJobsHandler(req: Request, res: Response) {
  const user = (req as any).user;
  const tenantId: string | undefined = (req as any).tenant?.id ?? req.params?.tenantId;

  const jobs = tenantId
    ? await getJobsByTenant(tenantId)
    : await getJobsByUser(user.sub);

  res.json({ jobs });
}
