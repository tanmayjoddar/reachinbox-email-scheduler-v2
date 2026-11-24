import { pool } from '../db/pool';

export interface ClaimedEmail {
  id: string;
  batch_id: string;
  user_id: string;
  sender_id: string;
  recipient: string;
  scheduled_at: Date;
  sender_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  subject: string;
  body: string;
  hourly_limit: number;
  delay_ms: number;
}

// Single guarded UPDATE is the DB-level idempotency lock; a stale processing row is reclaimable after 60s.
export async function claimEmail(id: string): Promise<ClaimedEmail | null> {
  const { rows } = await pool.query(
    `UPDATE emails e SET status = 'processing', processing_started_at = now()
     FROM senders s, batches b
     WHERE e.id = $1 AND e.sender_id = s.id AND e.batch_id = b.id
       AND (e.status = 'scheduled' OR (e.status = 'processing' AND e.processing_started_at < now() - interval '60 seconds'))
     RETURNING e.id, e.batch_id, e.user_id, e.sender_id, e.recipient, e.scheduled_at,
       s.email AS sender_email, s.smtp_host, s.smtp_port, s.smtp_user, s.smtp_pass,
       b.subject, b.body, b.hourly_limit, b.delay_ms`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getEmailStatus(id: string): Promise<string | null> {
  const { rows } = await pool.query('SELECT status FROM emails WHERE id = $1', [id]);
  return rows[0]?.status ?? null;
}

export async function releaseEmail(id: string, scheduledAt: Date) {
  await pool.query(
    `UPDATE emails SET status = 'scheduled', scheduled_at = $2, processing_started_at = NULL WHERE id = $1`,
    [id, scheduledAt],
  );
}

export async function markSent(id: string, messageId: string): Promise<Date> {
  const { rows } = await pool.query(
    `UPDATE emails SET status = 'sent', sent_at = now(), message_id = $2, attempts = attempts + 1, error = NULL
     WHERE id = $1
     RETURNING sent_at`,
    [id, messageId],
  );
  return rows[0].sent_at;
}

export async function markFailed(id: string, error: string) {
  await pool.query(
    `UPDATE emails SET status = 'failed', error = $2, attempts = attempts + 1, processing_started_at = NULL
     WHERE id = $1`,
    [id, error],
  );
}

export interface EmailListQuery {
  status: 'scheduled' | 'sent';
  page: number;
  limit: number;
}

export async function listEmails(userId: string, { status, page, limit }: EmailListQuery) {
  const statuses = status === 'scheduled' ? ['scheduled', 'processing'] : ['sent', 'failed'];
  const order = status === 'scheduled' ? 'e.scheduled_at ASC' : 'e.sent_at DESC NULLS LAST';

  const items = await pool.query(
    `SELECT e.id, e.recipient, b.subject, b.body, e.status, e.scheduled_at AS "scheduledAt",
       e.sent_at AS "sentAt", s.email AS "senderEmail", e.is_starred AS "isStarred",
       e.created_at AS "createdAt"
     FROM emails e
     JOIN batches b ON b.id = e.batch_id
     JOIN senders s ON s.id = e.sender_id
     WHERE e.user_id = $1 AND e.status = ANY($2)
     ORDER BY ${order}
     LIMIT $3 OFFSET $4`,
    [userId, statuses, limit, (page - 1) * limit],
  );

  const total = await pool.query(
    'SELECT count(*)::int AS total FROM emails WHERE user_id = $1 AND status = ANY($2)',
    [userId, statuses],
  );

  return { items: items.rows, total: total.rows[0].total as number };
}

export async function getEmailById(userId: string, emailId: string) {
  const { rows } = await pool.query(
    `SELECT e.id, e.recipient, b.subject, b.body, e.status, e.scheduled_at AS "scheduledAt",
       e.sent_at AS "sentAt", s.email AS "senderEmail", e.is_starred AS "isStarred",
       e.created_at AS "createdAt"
     FROM emails e
     JOIN batches b ON b.id = e.batch_id
     JOIN senders s ON s.id = e.sender_id
     WHERE e.id = $1 AND e.user_id = $2`,
    [emailId, userId],
  );
  return rows[0] ?? null;
}

export async function toggleEmailStar(userId: string, emailId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `UPDATE emails
     SET is_starred = NOT is_starred
     WHERE id = $1 AND user_id = $2
     RETURNING is_starred AS "isStarred"`,
    [emailId, userId],
  );
  return rows[0]?.isStarred ?? false;
}

export async function deleteEmailById(userId: string, emailId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM emails WHERE id = $1 AND user_id = $2`,
    [emailId, userId],
  );
  return (rowCount ?? 0) > 0;
}
