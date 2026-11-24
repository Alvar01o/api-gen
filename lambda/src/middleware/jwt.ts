import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthManifest } from '../registry';

/**
 * Returns an Express middleware that:
 * 1. Checks if the route is in `auth.publicEndpoints` → skips JWT validation
 * 2. Otherwise validates the Bearer token from the Authorization header
 */
export function makeJwtMiddleware(auth: AuthManifest) {
  return function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
    // Build the route key: "METHOD /path" (e.g. "GET /postgres/mydb/users/:id")
    // Express stores the matched route pattern in req.route.path
    const method = req.method.toUpperCase();
    const routePath = req.route?.path ?? req.path;
    const routeKey = `${method} ${routePath}`;

    if (auth.publicEndpoints.includes(routeKey)) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[jwt] JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    try {
      const payload = jwt.verify(token, secret);
      (req as any).jwtPayload = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
