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

export const slackRoutes = Router();

slackRoutes.get('/api/slack/connect', requireAuth, (req, res) => {
  res.json({ url: slackAuthorizeUrl(signToken(req.userId!, '10m')) });
});

slackRoutes.get('/slack/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (typeof code !== 'string' || typeof state !== 'string') throw new Error('missing code or state');
    const { userId } = verifyToken(state);

    const data = await exchangeSlackCode(code);
    if (!data.ok || !data.team || !data.incoming_webhook) throw new Error(data.error ?? 'slack oauth failed');

    await saveSlackConnection(userId, data.team.name, data.incoming_webhook.channel, data.incoming_webhook.url);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err) {
    logger.warn({ err }, 'slack oauth failed');
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
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
