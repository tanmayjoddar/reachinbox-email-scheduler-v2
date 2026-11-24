import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { pool } from './db/pool';
import { redis } from './redis/connection';
import { emailQueue } from './queue/emailQueue';
import { emailRoutes } from './routes/email.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  await redis.ping();
  res.json({ ok: true });
});

app.use('/api/emails', emailRoutes);
app.use(errorHandler);

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'api listening'));

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down api');
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await emailQueue.close();
  await redis.quit();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
