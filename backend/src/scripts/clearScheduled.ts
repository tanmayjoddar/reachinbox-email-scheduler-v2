import { Client } from 'pg';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { Client as EsClient } from '@elastic/elasticsearch';
import { env } from '../config/env';

async function clean() {
  console.log('--- Starting Complete Email & Queue Cleanup ---');

  // 1. Database Cleanup (Emails and Batches)
  const pg = new Client({ connectionString: env.DATABASE_URL });
  await pg.connect();

  const delEmails = await pg.query('DELETE FROM emails RETURNING id');
  console.log(`[DB] Deleted ${delEmails.rowCount ?? 0} total emails (scheduled, sent, failed)`);

  const delBatches = await pg.query('DELETE FROM batches RETURNING id');
  console.log(`[DB] Deleted ${delBatches.rowCount ?? 0} batches`);

  await pg.end();

  // 2. BullMQ & Redis Rate Limiter Cleanup
  const redis = new Redis(env.REDIS_URL);
  const queue = new Queue('emails', { connection: redis });

  await queue.drain();
  const states = ['delayed', 'wait', 'completed', 'failed', 'paused', 'prioritized'] as const;
  for (const state of states) {
    try {
      const cleaned = await queue.clean(0, 100000, state);
      if (cleaned.length > 0) {
        console.log(`[BullMQ] Cleaned ${cleaned.length} ${state} jobs`);
      }
    } catch {
      // Ignored if state not supported
    }
  }

  // Clear rate limiter tracking keys and Slack notification cooldowns
  const keys = await redis.keys('{bull:emails}*');
  const rlKeys = await redis.keys('rl*');
  const gateKeys = await redis.keys('gate*');
  const overflowKeys = await redis.keys('overflow*');
  const slackKeys = await redis.keys('slack:notified*');
  const allKeysToDel = [...rlKeys, ...gateKeys, ...overflowKeys, ...slackKeys];

  if (allKeysToDel.length > 0) {
    await redis.del(...allKeysToDel);
    console.log(`[Redis] Reset ${allKeysToDel.length} rate limiter and alert keys`);
  }

  await queue.close();
  await redis.quit();

  // 3. Elasticsearch Index Cleanup
  try {
    const es = new EsClient({ node: env.ELASTICSEARCH_URL });
    await es.deleteByQuery({
      index: 'emails',
      query: { match_all: {} },
      refresh: true,
    });
    console.log('[Elasticsearch] Cleared all indexed email documents');
  } catch (e: any) {
    console.log('[Elasticsearch] Cleanup notice:', e.message);
  }

  console.log('--- Complete Cleanup Succeeded! Users, Senders & Slack preserved ---');
}

clean().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
