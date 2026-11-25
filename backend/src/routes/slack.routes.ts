import { Router } from 'express';
import { env } from '../config/env';
import { requireAuth } from '../middleware/requireAuth';
import { signToken, verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import {
  slackAuthorizeUrl,
  exchangeSlackCode,
  saveSlackConnection,
  getSlackConnection,
  deleteSlackConnection,
} from '../services/slackService';

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
};

export const slackRoutes = Router();

slackRoutes.get('/api/slack/connect', requireAuth, (req, res) => {
  const referer = req.headers.referer;
  if (referer) {
    try {
      const origin = new URL(referer).origin;
      res.cookie('slack_origin', origin, { ...cookieBase, maxAge: 10 * 60 * 1000 });
    } catch {
      // ignore invalid referer URL
    }
  }
  res.json({ url: slackAuthorizeUrl(signToken(req.userId!, '10m')) });
});

slackRoutes.get('/slack/callback', async (req, res) => {
  const targetFrontend = req.cookies?.slack_origin || env.FRONTEND_URL || 'http://localhost:5241';
  res.clearCookie('slack_origin');
  try {
    const { code, state } = req.query;
    if (typeof code !== 'string' || typeof state !== 'string') throw new Error('missing code or state');
    const { userId } = verifyToken(state);

    const data = await exchangeSlackCode(code);
    if (!data.ok || !data.team || !data.incoming_webhook) throw new Error(data.error ?? 'slack oauth failed');

    await saveSlackConnection(userId, data.team.name, data.incoming_webhook.channel, data.incoming_webhook.url);
    res.redirect(`${targetFrontend}/dashboard?slack=connected`);
  } catch (err) {
    logger.warn({ err }, 'slack oauth failed');
    res.redirect(`${targetFrontend}/dashboard?slack=error`);
  }
});

slackRoutes.get('/api/slack/status', requireAuth, async (req, res) => {
  const connection = await getSlackConnection(req.userId!);
  res.json(
    connection
      ? { connected: true, team: connection.team_name, channel: connection.channel }
      : { connected: false, team: null, channel: null },
  );
});

slackRoutes.delete('/api/slack', requireAuth, async (req, res) => {
  await deleteSlackConnection(req.userId!);
  res.json({ ok: true });
});
