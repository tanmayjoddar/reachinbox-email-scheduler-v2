import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    req.userId = verifyToken(token).userId;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
