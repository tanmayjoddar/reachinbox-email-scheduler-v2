import { env } from '../config/env';
import { pool } from '../db/pool';
import { redis } from '../redis/connection';
import { emailQueue } from '../queue/emailQueue';
import { closeEs } from '../services/searchService';
import { listSenders } from '../services/senders';
import { scheduleEmails } from '../services/scheduleEmails';

async function main() {
  if (!env.USER_ID) throw new Error('USER_ID is not set; copy the make-token dev user id into .env');

  const count = Number(process.argv[2]) || 1200;
  const hourlyLimit = Number(process.argv[3]) || 20;
  const delayMs = Number(process.argv[4]) || 2000;

  const senders = await listSenders();
  if (!senders.length) throw new Error('no senders configured; run npm run seed:senders');

  // rateLimiter keys the batch limit as rlb:<batchId>:<hour> (per batch, shared by every sender)
  // and the sender cap as rl:<senderId>:<hour> (per sender); a send needs room in both.
  const firstHour = Math.min(count, hourlyLimit, senders.length * env.MAX_EMAILS_PER_HOUR_PER_SENDER);
  const overflow = count - firstHour;
  const windows = Math.ceil(overflow / hourlyLimit);
  console.log('batch hourly limit is counted per batch, shared by all senders (not per batch+sender)');
  console.log(`sender cap is per sender (MAX_EMAILS_PER_HOUR_PER_SENDER=${env.MAX_EMAILS_PER_HOUR_PER_SENDER})`);
  console.log(
    `expected: ${firstHour} in the first clock hour, ${overflow} moved to later windows spanning ~${windows} more hourly windows`,
  );

  const recipients = Array.from(
    { length: count },
    (_, i) => `load-${String(i + 1).padStart(4, '0')}@example.test`,
  );
  const result = await scheduleEmails(env.USER_ID, {
    subject: 'Load test',
    body: 'Load test email',
    recipients,
    startTime: new Date(Date.now() + 10_000).toISOString(),
    delayBetweenMs: delayMs,
    hourlyLimit,
  }, senders);
  console.log(`scheduled ${result.total} emails in batch ${result.batchId}`);

  // scheduleEmails indexes into Elasticsearch without awaiting it.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await emailQueue.close();
  await redis.quit();
  await closeEs();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
