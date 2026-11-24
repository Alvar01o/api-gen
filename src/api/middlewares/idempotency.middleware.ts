import { Request, Response, NextFunction } from 'express';

const TTL_MS = 5 * 60_000; // entries expire after 5 minutes
const MAX_ENTRIES = 10_000; // cap to prevent unbounded growth

interface Entry {
  body: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();

function evict() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  // If still over limit, remove oldest (Map preserves insertion order)
  if (store.size > MAX_ENTRIES) {
    const excess = store.size - MAX_ENTRIES;
    let removed = 0;
    for (const key of store.keys()) {
      store.delete(key);
      if (++removed >= excess) break;
    }
  }
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.SCHEMA_ENABLE_IDEMPOTENCY !== 'true') {
    return next();
  }

  const key = req.headers['idempotency-key'];
  if (!key || typeof key !== 'string') return next();

  evict();

  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.body);
  }

  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    store.set(key, { body, expiresAt: Date.now() + TTL_MS });
    return originalJson(body);
  };

  next();
}