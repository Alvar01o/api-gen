import { Request, Response } from 'express';
import { getOrm } from '../../core/database/app.orm';
import { Tenant } from '../../core/database/entities/Tenant.entity';

const VALID_NAME = /^[a-zA-Z0-9_\- ]{1,100}$/;

export async function createTenantHandler(req: Request, res: Response) {
  const userId: string = (req as any).user?.sub;
  const { name } = req.body as { name?: string };

  if (!name?.trim() || !VALID_NAME.test(name.trim())) {
    return res.status(400).json({ error: 'Invalid tenant name (1-100 alphanumeric/dash/underscore/space)' });
  }

  const em = getOrm().em.fork();
  const now = new Date();
  const tenant = em.create(Tenant, { userId, name: name.trim(), createdAt: now, updatedAt: now });
  em.persist(tenant);
  await em.flush();

  return res.status(201).json({ tenant: tenantDto(tenant) });
}

export async function listTenantsHandler(req: Request, res: Response) {
  const userId: string = (req as any).user?.sub;
  const em = getOrm().em.fork();
  const tenants = await em.find(Tenant, { userId }, { orderBy: { createdAt: 'DESC' } });
  return res.json({ tenants: tenants.map(tenantDto) });
}

export async function updateTenantHandler(req: Request, res: Response) {
  const tenant: Tenant = (req as any).tenant;
  const { name } = req.body as { name?: string };

  if (!name?.trim() || !VALID_NAME.test(name.trim())) {
    return res.status(400).json({ error: 'Invalid tenant name' });
  }

  tenant.name = name.trim();
  const em = getOrm().em.fork();
  em.assign(tenant, { name: tenant.name });
  await em.nativeUpdate(Tenant, { id: tenant.id }, { name: tenant.name, updatedAt: new Date() });

  return res.json({ tenant: tenantDto(tenant) });
}

export async function deleteTenantHandler(req: Request, res: Response) {
  const tenant: Tenant = (req as any).tenant;
  const em = getOrm().em.fork();
  await em.nativeDelete(Tenant, { id: tenant.id });
  return res.status(204).send();
}

function tenantDto(t: Tenant) {
  return { id: t.id, name: t.name, createdAt: t.createdAt, updatedAt: t.updatedAt };
}
