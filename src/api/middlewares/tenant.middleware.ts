import { Request, Response, NextFunction } from 'express';
import { getOrm } from '../../core/database/app.orm';
import { Tenant } from '../../core/database/entities/Tenant.entity';

/**
 * Verifies that :tenantId exists and belongs to the authenticated user.
 * Attaches the tenant to req.tenant for downstream handlers.
 */
export async function requireTenantAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const { tenantId } = req.params;

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  try {
    const em = getOrm().em.fork();
    const tenant = await em.findOne(Tenant, { id: tenantId });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Admins can access any tenant; clients only their own
    if (user?.role !== 'admin' && tenant.userId !== user?.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    (req as any).tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}
