import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/postgresql';
import bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/User.entity';
import { Tenant } from './entities/Tenant.entity';
import { SchemaJobRecord } from './entities/SchemaJob.entity';
import { InspectResult } from './entities/InspectResult.entity';
import { GeneratedApi } from './entities/GeneratedApi.entity';
import { PublicEndpoint } from './entities/PublicEndpoint.entity';

let orm: MikroORM | null = null;

async function tryConnect(retries = 10, delay = 3000): Promise<MikroORM> {
  for (let i = 0; i < retries; i++) {
    try {
      const instance = await MikroORM.init({
        host:     process.env.APP_DB_HOST     ?? 'app-db',
        port:     Number(process.env.APP_DB_PORT ?? 5432),
        user:     process.env.APP_DB_USER     ?? 'app',
        password: process.env.APP_DB_PASSWORD ?? 'apppass',
        dbName:   process.env.APP_DB_NAME     ?? 'appdyn',
        entities: [User, Tenant, SchemaJobRecord, InspectResult, GeneratedApi, PublicEndpoint],
        allowGlobalContext: true,
      });
      return instance;
    } catch (err: any) {
      if (i < retries - 1) {
        console.warn(`[app-db] connection failed (attempt ${i + 1}/${retries}): ${err.message} — retrying in ${delay / 1000}s`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error('[app-db] could not connect after retries');
}

export async function initAppOrm(): Promise<MikroORM> {
  if (orm) return orm;

  orm = await tryConnect();

  const generator = orm.getSchemaGenerator();
  await generator.ensureDatabase();
  await generator.updateSchema({ safe: true });

  await seedAdmin();

  console.log('[app-db] ready');
  return orm;
}

async function seedAdmin() {
  if (!orm) return;
  const em = orm.em.fork();
  const email = process.env.ADMIN_EMAIL ?? 'admin@apidyn.dev';

  const existing = await em.findOne(User, { email });
  if (existing) return;

  const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
  const passwordHash = await bcrypt.hash(password, 12);

  const now = new Date();
  const admin = em.create(User, { email, name: 'Admin', passwordHash, role: UserRole.ADMIN, createdAt: now, updatedAt: now });
  await em.persist(admin);
  await em.flush();
  console.log(`[app-db] admin created → ${email}`);
}

export function getOrm(): MikroORM {
  if (!orm) throw new Error('[app-db] ORM not initialized — call initAppOrm() first');
  return orm;
}
