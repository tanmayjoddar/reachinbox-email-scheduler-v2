import { createHash, timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from '../config/env';
import { emailQueue } from '../queue/emailQueue';

const digest = (value: string) => createHash('sha256').update(value).digest();

// Hashing both sides keeps timingSafeEqual from throwing on different-length input.
function basicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const [user, pass] = header.startsWith('Basic ')
    ? Buffer.from(header.slice(6), 'base64').toString().split(':')
    : [];
  const valid =
    user !== undefined &&
    pass !== undefined &&
    timingSafeEqual(digest(`${user}:${pass}`), digest(`${env.ADMIN_USER}:${env.ADMIN_PASS}`));

  if (!valid) {
    res.set('WWW-Authenticate', 'Basic realm="queues"');
    res.status(401).send('auth required');
    return;
  }
  next();
}

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });

export const adminRoutes = Router();
adminRoutes.use(basicAuth, serverAdapter.getRouter());
