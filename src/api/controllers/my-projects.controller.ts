import { Request, Response } from 'express';
import { getOrm } from '../../core/database/app.orm';
import { GeneratedApi } from '../../core/database/entities/GeneratedApi.entity';

export async function listMyProjectsHandler(req: Request, res: Response) {
  const userId: string | undefined = (req as any).user?.sub;
  const tenantId: string | undefined = (req as any).tenant?.id ?? (req as any).params?.tenantId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const em = getOrm().em.fork();
    const where = tenantId ? { tenantId } : { userId };
    const apis = await em.find(GeneratedApi, where, { orderBy: { createdAt: 'DESC' } });

    return res.json({
      projects: apis.map((a) => ({
        id: a.id,
        engine: a.engine,
        dbName: a.dbName,
        routes: a.routes,
        createdAt: a.createdAt,
        tenantId: a.tenantId,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
}
