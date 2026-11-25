import { pool } from '../db/pool';
import { redis } from '../redis/connection';
import { env } from '../config/env';
import { hourWindow } from '../utils/time';
import { logger } from '../utils/logger';

export interface SlackConnection {
  team_name: string;
  channel: string;
  webhook_url: string;
}

export function slackAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: 'incoming-webhook',
    redirect_uri: env.SLACK_REDIRECT_URL,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export async function exchangeSlackCode(code: string) {
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URL,
    }),
  });
  return (await res.json()) as {
    ok: boolean;
    error?: string;
    team?: { name: string };
    incoming_webhook?: { url: string; channel: string };
  };
}

export async function saveSlackConnection(userId: string, teamName: string, channel: string, webhookUrl: string) {
  await pool.query(
    `INSERT INTO slack_connections (user_id, team_name, channel, webhook_url) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET team_name = EXCLUDED.team_name, channel = EXCLUDED.channel, webhook_url = EXCLUDED.webhook_url`,
    [userId, teamName, channel, webhookUrl],
  );
}

export async function getSlackConnection(userId: string): Promise<SlackConnection | undefined> {
  const { rows } = await pool.query(
    'SELECT team_name, channel, webhook_url FROM slack_connections WHERE user_id = $1',
    [userId],
  );
  return rows[0];
}

export async function deleteSlackConnection(userId: string) {
  await pool.query('DELETE FROM slack_connections WHERE user_id = $1', [userId]);
}

export interface RateLimitHit {
  scope: 'sender' | 'batch';
  value: number;
}

export async function notifyRateLimit(
  userId: string,
  sender: { id: string; email: string },
  limit: RateLimitHit,
  nextWindowStart: number,
) {
  const key = `slack:notified:${userId}:${sender.id}:${hourWindow(Date.now())}`;
  let claimed = false;
  try {
    const connection = await getSlackConnection(userId);
    if (!connection) return;
    if (!(await redis.set(key, '1', 'EX', 3600, 'NX'))) return;
    claimed = true;

    const { rows } = await pool.query(
      `SELECT count(*)::int AS pending FROM emails
       WHERE user_id = $1 AND sender_id = $2 AND status IN ('scheduled', 'processing')`,
      [userId, sender.id],
    );

    const pendingCount = rows[0]?.pending ?? 0;
    const nextDate = new Date(nextWindowStart);
    const nextTimeFormatted = nextDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const nextIso = nextDate.toISOString();

    const text = `⚠️ *Rate Limit Alert:* Sender \`${sender.email}\` hit the batch limit of *${limit.value} emails/hour*. ⏳ *${pendingCount} emails* for this sender are currently pending. 🕒 Next sending window starts at *${nextTimeFormatted}* (\`${nextIso}\`).`;

    const res = await fetch(connection.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`slack webhook responded ${res.status}`);
  } catch (err) {
    if (claimed) await redis.del(key);
    logger.warn({ err, userId, senderId: sender.id }, 'slack rate-limit notification failed');
  }
}
