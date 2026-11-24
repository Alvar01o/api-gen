import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';

type PoolEntry =
  | { engine: 'mysql'; pool: mysql.Pool; lastUsed: number }
  | { engine: 'postgres'; pool: PgPool; lastUsed: number };

const MAX_POOLS = 50;
const pools = new Map<string, PoolEntry>();

function poolKey(engine: string, dbName: string) {
  return `${engine}:${dbName}`;
}

async function evictLRU() {
  if (pools.size < MAX_POOLS) return;
  // Find least recently used entry
  let oldestKey = '';
  let oldestTime = Infinity;
  for (const [key, entry] of pools) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestKey = key;
    }
  }
  if (!oldestKey) return;
  const entry = pools.get(oldestKey)!;
  pools.delete(oldestKey);
  try {
    if (entry.engine === 'mysql') await (entry.pool as mysql.Pool).end();
    else await (entry.pool as PgPool).end();
    console.log(`[pool] evicted LRU pool: ${oldestKey}`);
  } catch {
    // ignore close errors
  }
}

export async function getPool(engine: string, dbName: string): Promise<mysql.Pool | PgPool> {
  const key = poolKey(engine, dbName);

  if (pools.has(key)) {
    pools.get(key)!.lastUsed = Date.now();
    return pools.get(key)!.pool;
  }

  await evictLRU();

  if (engine === 'mysql') {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 5,
    });
    pools.set(key, { engine: 'mysql', pool, lastUsed: Date.now() });
    return pool;
  } else {
    const pool = new PgPool({
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: dbName,
      max: 5,
    });
    pools.set(key, { engine: 'postgres', pool, lastUsed: Date.now() });
    return pool;
  }
}

export async function closeAll() {
  for (const entry of pools.values()) {
    try {
      if (entry.engine === 'mysql') await (entry.pool as mysql.Pool).end();
      else await (entry.pool as PgPool).end();
    } catch { /* ignore */ }
  }
  pools.clear();
}
