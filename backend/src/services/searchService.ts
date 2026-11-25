import { Client } from '@elastic/elasticsearch';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const INDEX = 'emails';

const esNode = env.ELASTICSEARCH_URL.startsWith('http')
  ? env.ELASTICSEARCH_URL
  : `https://${env.ELASTICSEARCH_URL}`;
export const es = new Client({ node: esNode });

export interface EmailDoc {
  id: string;
  userId: string;
  batchId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt: Date | null;
  senderEmail: string;
}

let ready = false;

// Only mark ready after the explicit mapping exists: a dynamic auto-create would make ids analyzed text and break the filters.
export async function ensureIndex() {
  if (ready) return;
  const exists = await es.indices.exists({ index: INDEX });
  if (!exists) {
    await es.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          userId: { type: 'keyword' },
          batchId: { type: 'keyword' },
          status: { type: 'keyword' },
          recipient: { type: 'text' },
          subject: { type: 'text' },
          body: { type: 'text' },
          senderEmail: { type: 'text' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' },
        },
      },
    });
  }
  ready = true;
}

export async function indexEmails(rows: EmailDoc[]) {
  if (!rows.length) return;
  await ensureIndex();
  const operations = rows.flatMap((doc) => [{ index: { _index: INDEX, _id: doc.id } }, doc]);
  await es.bulk({ operations: operations as never });
}

export async function updateEmailDoc(id: string, fields: { status: string; sentAt: Date | null }) {
  await ensureIndex();
  try {
    // scheduledAt is not updated on rate-limit bounces; only status changes matter here.
    await es.update({ index: INDEX, id, doc: fields });
  } catch (err) {
    if ((err as { meta?: { statusCode?: number } }).meta?.statusCode === 404) {
      logger.warn({ id }, 'elasticsearch doc missing; skipping update');
      return;
    }
    throw err;
  }
}

export interface SearchInput {
  userId: string;
  q: string;
  status?: 'scheduled' | 'sent';
}

export async function searchEmails({ userId, q, status }: SearchInput) {
  await ensureIndex();
  const statuses =
    status === 'scheduled' ? ['scheduled', 'processing'] : status === 'sent' ? ['sent', 'failed'] : undefined;

  const result = await es.search({
    index: INDEX,
    size: 20,
    _source: { excludes: ['body'] },
    query: {
      bool: {
        must: [{ multi_match: { query: q, fields: ['recipient', 'subject', 'body'] } }],
        filter: [{ term: { userId } }, ...(statuses ? [{ terms: { status: statuses } }] : [])],
      },
    },
  });

  const hits = result.hits.hits.map((hit) => hit._source as EmailDoc);
  if (!hits.length) return [];

  const ids = hits.map((h) => h.id);
  const { rows } = await pool.query(
    'SELECT id, is_starred FROM emails WHERE id = ANY($1)',
    [ids],
  );
  const starMap = new Map<string, boolean>(rows.map((r) => [r.id, r.is_starred]));

  return hits
    .map((doc) => ({
      id: doc.id,
      recipient: doc.recipient,
      subject: doc.subject,
      status: doc.status,
      scheduledAt: doc.scheduledAt,
      sentAt: doc.sentAt,
      senderEmail: doc.senderEmail,
      isStarred: Boolean(starMap.get(doc.id)),
    }))
    .sort((a, b) => (b.isStarred ? 1 : 0) - (a.isStarred ? 1 : 0));
}

export const closeEs = () => es.close();
