import { pool } from '../db/pool';
import { env } from '../config/env';
import { addEmailJobs } from '../queue/emailQueue';
import { indexEmails, type EmailDoc } from './searchService';
import { logger } from '../utils/logger';
import type { Sender } from './senders';

export interface ScheduleInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}

export interface ScheduleResult {
  batchId: string;
  total: number;
  firstSendAt: string;
  lastSendAt: string;
}

export async function scheduleEmails(
  userId: string,
  input: ScheduleInput,
  senders: Sender[],
): Promise<ScheduleResult> {
  const start = Date.parse(input.startTime);
  const effectiveDelay = Math.max(input.delayBetweenMs, env.MIN_DELAY_MS);
  const total = input.recipients.length;

  // Sender round-robins so each sender is spaced by the delay while total throughput scales with sender count.
  const scheduledAt = input.recipients.map(
    (_, i) => new Date(start + Math.floor(i / senders.length) * effectiveDelay),
  );
  const senderIds = input.recipients.map((_, i) => senders[i % senders.length].id);

  const client = await pool.connect();
  let batchId: string;
  let rows: { id: string; recipient: string; sender_id: string; scheduled_at: Date }[];
  try {
    await client.query('BEGIN');
    const batch = await client.query(
      `INSERT INTO batches (user_id, subject, body, start_at, delay_ms, hourly_limit, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, input.subject, input.body, new Date(start), effectiveDelay, input.hourlyLimit, total],
    );
    batchId = batch.rows[0].id;

    const inserted = await client.query(
      `INSERT INTO emails (batch_id, user_id, sender_id, recipient, scheduled_at)
       SELECT $1, $2, unnest($3::uuid[]), unnest($4::text[]), unnest($5::timestamptz[])
       RETURNING id, recipient, sender_id, scheduled_at`,
      [batchId, userId, senderIds, input.recipients, scheduledAt.map((d) => d.toISOString())],
    );
    rows = inserted.rows;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await addEmailJobs(rows.map((row) => ({ id: row.id, scheduledAt: row.scheduled_at })));

  const senderEmailById = new Map(senders.map((sender) => [sender.id, sender.email]));
  const docs: EmailDoc[] = rows.map((row) => ({
    id: row.id,
    userId,
    batchId,
    recipient: row.recipient,
    subject: input.subject,
    body: input.body,
    status: 'scheduled',
    scheduledAt: row.scheduled_at,
    sentAt: null,
    senderEmail: senderEmailById.get(row.sender_id)!,
  }));
  indexEmails(docs).catch((err) => logger.warn({ err, batchId }, 'elasticsearch index failed'));

  return {
    batchId,
    total,
    firstSendAt: scheduledAt[0].toISOString(),
    lastSendAt: scheduledAt[total - 1].toISOString(),
  };
}
