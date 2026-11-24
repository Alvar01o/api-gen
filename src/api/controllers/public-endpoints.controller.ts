import { Request, Response } from 'express';
import IORedis from 'ioredis';
import { getOrm } from '../../core/database/app.orm';
import { PublicEndpoint } from '../../core/database/entities/PublicEndpoint.entity';
import { GeneratedApi } from '../../core/database/entities/GeneratedApi.entity';
import { updateManifestPublicEndpoints } from '../../core/generator/crud.generator';

const redis = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

/** GET /tenants/:tenantId/projects/:projectId/endpoints */
export async function listEndpointsHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const tenantId: string = (req as any).tenant?.id ?? req.params.tenantId;

  const em = getOrm().em.fork();
  const endpoints = await em.find(
    PublicEndpoint,
    { generatedApiId: projectId, tenantId },
    { orderBy: { route: 'ASC', method: 'ASC' } },
  );

  return res.json({ endpoints: endpoints.map(epDto) });
}

/** PATCH /tenants/:tenantId/projects/:projectId/endpoints/:endpointId */
export async function toggleEndpointHandler(req: Request, res: Response) {
  const { projectId, endpointId } = req.params;
  const tenantId: string = (req as any).tenant?.id ?? req.params.tenantId;
  const { isPublic } = req.body as { isPublic?: boolean };

  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ error: 'isPublic (boolean) is required' });
  }

  const em = getOrm().em.fork();

  const endpoint = await em.findOne(PublicEndpoint, { id: endpointId, generatedApiId: projectId, tenantId });
  if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });

  await em.nativeUpdate(PublicEndpoint, { id: endpointId }, { isPublic });

  // Re-publish manifest with updated public endpoints list
  const api = await em.findOne(GeneratedApi, { id: projectId });
  if (api?.authEnabled) {
    const allEndpoints = await em.find(PublicEndpoint, { generatedApiId: projectId, tenantId });
    // Apply the just-toggled value (not yet persisted when we re-queried)
    const publicRouteKeys = allEndpoints
      .map((ep) => (ep.id === endpointId ? { ...ep, isPublic } : ep))
      .filter((ep) => ep.isPublic)
      .map((ep) => ep.routeKey);

    await updateManifestPublicEndpoints(api.engine, api.dbName, publicRouteKeys, redis);
  }

  return res.json({ endpoint: { ...epDto(endpoint), isPublic } });
}

/** PATCH /tenants/:tenantId/projects/:projectId/endpoints — bulk toggle all */
export async function bulkToggleEndpointsHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const tenantId: string = (req as any).tenant?.id ?? req.params.tenantId;
  const { isPublic } = req.body as { isPublic?: boolean };

  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ error: 'isPublic (boolean) is required' });
  }

  const em = getOrm().em.fork();
  await em.nativeUpdate(PublicEndpoint, { generatedApiId: projectId, tenantId }, { isPublic });

  const api = await em.findOne(GeneratedApi, { id: projectId });
  if (api?.authEnabled) {
    const publicRouteKeys = isPublic
      ? (await em.find(PublicEndpoint, { generatedApiId: projectId, tenantId })).map((ep) => ep.routeKey)
      : [];
    await updateManifestPublicEndpoints(api.engine, api.dbName, publicRouteKeys, redis);
  }

  return res.json({ updated: true, isPublic });
}

function epDto(ep: PublicEndpoint) {
  return {
    id: ep.id,
    method: ep.method,
    route: ep.route,
    routeKey: ep.routeKey,
    isPublic: ep.isPublic,
  };
}
