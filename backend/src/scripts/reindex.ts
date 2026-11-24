import { pool } from '../db/pool';
import { ensureIndex, indexEmails, es, type EmailDoc } from '../services/searchService';

const PAGE = 1000;

async function main() {
  await ensureIndex();

  let lastId = '00000000-0000-0000-0000-000000000000';
  let total = 0;

  for (;;) {
    const { rows } = await pool.query(
      `SELECT e.id, e.user_id, e.batch_id, e.recipient, e.status, e.scheduled_at, e.sent_at,
         b.subject, b.body, s.email AS sender_email
       FROM emails e
       JOIN batches b ON b.id = e.batch_id
       JOIN senders s ON s.id = e.sender_id
       WHERE e.id > $1
       ORDER BY e.id
       LIMIT $2`,
      [lastId, PAGE],
    );
    if (!rows.length) break;

    const docs: EmailDoc[] = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      batchId: row.batch_id,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      status: row.status,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      senderEmail: row.sender_email,
    }));

    await indexEmails(docs);
    total += rows.length;
    lastId = rows[rows.length - 1].id;
  }

  console.log(`reindexed ${total} emails`);
  await es.close();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
