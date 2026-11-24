import { env } from './config/env';
import { recoverScheduledEmails } from './services/recovery';
import { emailWorker } from './queue/emailWorker';
import { emailQueue } from './queue/emailQueue';
import { redis } from './redis/connection';
import { pool } from './db/pool';
import { closeEs } from './services/searchService';
import { logger } from './utils/logger';

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down worker');
  await emailWorker.close();
  await emailQueue.close();
  await redis.quit();
  await closeEs();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

async function main() {
  await recoverScheduledEmails();
  await emailWorker.run();
  logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'worker started');
}

main().catch((err) => {
  logger.error({ err }, 'worker failed to start');
  process.exit(1);
});
