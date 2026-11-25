import { Client } from '@elastic/elasticsearch';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const INDEX = 'emails';

function cleanEsUrl(rawUrl: string): string {
  if (!rawUrl) return 'http://localhost:9200';
  // Strip trailing newlines or extra env vars accidentally pasted in
  const firstLine = rawUrl.split(/[\r\n]+/)[0].trim();
  return firstLine.startsWith('http') ? firstLine : `https://${firstLine}`;
}

let esClient: Client | null = null;
try {
  const esNode = cleanEsUrl(env.ELASTICSEARCH_URL);
  esClient = new Client({ node: esNode });
} catch (err) {
  logger.warn({ err }, 'failed to initialize elasticsearch client; using DB search fallback');
}

export const es = esClient as unknown as Client;

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
  if (ready || !esClient) return;
  const exists = await esClient.indices.exists({ index: INDEX });
  if (!exists) {
    await esClient.indices.create({
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
  if (!rows.length || !esClient) return;
  try {
    await ensureIndex();
    const operations = rows.flatMap((doc) => [{ index: { _index: INDEX, _id: doc.id } }, doc]);
    await esClient.bulk({ operations: operations as never });
  } catch (err) {
    logger.warn({ err }, 'elasticsearch bulk index failed (non-fatal)');
  }
}

export async function updateEmailDoc(id: string, fields: { status: string; sentAt: Date | null }) {
  if (!esClient) return;
  try {
    await ensureIndex();
    // scheduledAt is not updated on rate-limit bounces; only status changes matter here.
    await esClient.update({ index: INDEX, id, doc: fields });
  } catch (err) {
    if ((err as { meta?: { statusCode?: number } }).meta?.statusCode === 404) {
      logger.warn({ id }, 'elasticsearch doc missing; skipping update');
      return;
    }
    logger.warn({ id, err }, 'elasticsearch doc update failed (non-fatal)');
  }
}

export interface SearchInput {
  userId: string;
  q: string;
  status?: 'scheduled' | 'sent';
}

export async function searchEmails({ userId, q, status }: SearchInput) {
  try {
    if (!esClient) throw new Error('elasticsearch client unavailable');
    await ensureIndex();
    const statuses =
      status === 'scheduled' ? ['scheduled', 'processing'] : status === 'sent' ? ['sent', 'failed'] : undefined;

    const result = await esClient.search({
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
  } catch (err) {
    logger.warn({ err }, 'Elasticsearch search failed; falling back to PostgreSQL ILIKE query');
    const statuses =
      status === 'scheduled' ? ['scheduled', 'processing'] : status === 'sent' ? ['sent', 'failed'] : undefined;
    const pattern = `%${q}%`;
    const params: (string | string[])[] = [userId, pattern];
    let querySql = `
      SELECT e.id, e.recipient, e.subject, e.status, e.scheduled_at AS "scheduledAt", e.sent_at AS "sentAt",
             s.email AS "senderEmail", e.is_starred AS "isStarred"
      FROM emails e
      LEFT JOIN senders s ON s.id = e.sender_id
      WHERE e.user_id = $1 AND (e.recipient ILIKE $2 OR e.subject ILIKE $2 OR e.body ILIKE $2)
    `;
    if (statuses) {
      params.push(statuses);
      querySql += ` AND e.status = ANY($3)`;
    }
    querySql += ` ORDER BY e.is_starred DESC, e.created_at DESC LIMIT 20`;
    const { rows } = await pool.query(querySql, params);
    return rows;
  }
}

export const closeEs = () => esClient?.close();
