import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { pool } from '../db/pool';
import { signToken } from '../utils/jwt';
import { requireAuth } from '../middleware/requireAuth';
import { logger } from '../utils/logger';

const redirectUri = `${env.BASE_URL}/auth/google/callback`;
const google = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri,
});

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
};

export const authRoutes = Router();

authRoutes.get('/auth/google', (req, res) => {
  const state = randomUUID();
  res.cookie('oauth_state', state, { ...cookieBase, maxAge: 10 * 60 * 1000 });

  // Remember frontend origin so we redirect back to either Cloudflare Workers or localhost
  const referer = req.headers.referer;
  if (referer) {
    try {
      const origin = new URL(referer).origin;
      res.cookie('oauth_origin', origin, { ...cookieBase, maxAge: 10 * 60 * 1000 });
    } catch {
      // ignore invalid referer URL
    }
  }

  const url = google.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
  });
  res.redirect(url);
});

authRoutes.get('/auth/google/callback', async (req, res) => {
  const targetFrontend = req.cookies?.oauth_origin || env.FRONTEND_URL || 'http://localhost:5241';
  try {
    const { code, state } = req.query;
    if (typeof code !== 'string' || typeof state !== 'string' || state !== req.cookies?.oauth_state) {
      res.redirect(`${targetFrontend}/login?error=auth_failed`);
      return;
    }

    const { tokens } = await google.getToken(code);
    const ticket = await google.verifyIdToken({ idToken: tokens.id_token!, audience: env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload()!;

    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
       RETURNING id`,
      [profile.sub, profile.email, profile.name, profile.picture],
    );

    // Set auth cookie
    res.cookie('token', signToken(rows[0].id), { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.clearCookie('oauth_state');
    res.clearCookie('oauth_origin');
    res.redirect(`${targetFrontend}/dashboard`);
  } catch (err) {
    logger.warn({ err }, 'google auth failed');
    res.redirect(`${targetFrontend}/login?error=auth_failed`);
  }
});

authRoutes.get('/api/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [req.userId]);
  if (!rows.length) {
    res.status(404).json({ message: 'user not found' });
    return;
  }
  const user = rows[0];
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url });
});

authRoutes.post('/auth/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});
