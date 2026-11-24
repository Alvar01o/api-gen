import { Request, Response } from 'express';
import { getOrm } from '../../core/database/app.orm';
import { User } from '../../core/database/entities/User.entity';
import { SchemaJobRecord } from '../../core/database/entities/SchemaJob.entity';
import { InspectResult } from '../../core/database/entities/InspectResult.entity';
import { GeneratedApi } from '../../core/database/entities/GeneratedApi.entity';

export async function listUsersHandler(_req: Request, res: Response) {
  const em = getOrm().em.fork();
  const users = await em.findAll(User, { orderBy: { createdAt: 'DESC' } });
  res.json({ users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })) });
}

export async function listAllJobsHandler(_req: Request, res: Response) {
  const em = getOrm().em.fork();
  const jobs = await em.findAll(SchemaJobRecord, { orderBy: { createdAt: 'DESC' }, limit: 200 });
  res.json({ jobs });
}

export async function listAllInspectsHandler(_req: Request, res: Response) {
  const em = getOrm().em.fork();
  const results = await em.findAll(InspectResult, { orderBy: { createdAt: 'DESC' }, limit: 200 });
  res.json({ results });
}

export async function listAllGeneratedHandler(_req: Request, res: Response) {
  const em = getOrm().em.fork();
  const apis = await em.findAll(GeneratedApi, { orderBy: { createdAt: 'DESC' }, limit: 200 });
  res.json({ apis });
}
