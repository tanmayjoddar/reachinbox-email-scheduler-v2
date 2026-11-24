import { pool } from '../db/pool';
import { addEmailJobs } from '../queue/emailQueue';
import { logger } from '../utils/logger';

const PAGE = 1000;

export async function recoverScheduledEmails() {
  let lastId = '00000000-0000-0000-0000-000000000000';
  let scanned = 0;

  for (;;) {
    const { rows } = await pool.query(
      `SELECT id, scheduled_at FROM emails
       WHERE (status = 'scheduled' OR (status = 'processing' AND processing_started_at < now() - interval '60 seconds'))
         AND id > $1
       ORDER BY id
       LIMIT $2`,
      [lastId, PAGE],
    );
    if (!rows.length) break;

    await addEmailJobs(rows.map((row) => ({ id: row.id, scheduledAt: row.scheduled_at })));
    scanned += rows.length;
    lastId = rows[rows.length - 1].id;
  }

  logger.info({ scanned }, 'recovery re-enqueued scheduled emails');
}
