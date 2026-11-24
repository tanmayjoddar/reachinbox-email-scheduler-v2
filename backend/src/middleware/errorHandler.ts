import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'invalid request' });
    return;
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json({ error: 'internal server error' });
}
