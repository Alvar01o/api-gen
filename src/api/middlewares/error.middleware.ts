import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const apiErr = err instanceof ApiError ? err : null;
  const status = apiErr?.status ?? 500;

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    error: apiErr?.message ?? 'Internal Server Error',
    code: apiErr?.code ?? 'INTERNAL',
    ...(apiErr?.details !== undefined && { details: apiErr.details }),
  });
}