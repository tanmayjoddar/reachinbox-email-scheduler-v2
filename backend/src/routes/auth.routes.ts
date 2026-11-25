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

interface OAuthStatePayload {
  nonce: string;
  origin: string;
  callbackUrl: string;
}

function parseState(stateParam: unknown): OAuthStatePayload | null {
  if (typeof stateParam !== 'string') return null;
  try {
    const json = Buffer.from(stateParam, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.origin === 'string') return parsed;
  } catch {
    // not JSON base64url
  }
  return null;
}

export const authRoutes = Router();

authRoutes.get('/auth/google', (req, res) => {
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined) || 'https';

  // Determine frontend origin
  let frontendOrigin = 'https://outbox-scheduler-frontend.outbox-frontend.workers.dev';
  if (forwardedHost) {
    frontendOrigin = `${forwardedProto}://${forwardedHost}`;
  } else if (req.headers.referer) {
    try {
      frontendOrigin = new URL(req.headers.referer).origin;
    } catch {}
  } else if (env.FRONTEND_URL && !env.FRONTEND_URL.includes('localhost')) {
    frontendOrigin = env.FRONTEND_URL;
  }

  // Determine redirect URI for Google
  const callbackUrl = `${env.BASE_URL}/auth/google/callback`;

  const nonce = randomUUID();
  res.cookie('oauth_state', nonce, { ...cookieBase, maxAge: 10 * 60 * 1000 });

  const statePayload: OAuthStatePayload = {
    nonce,
    origin: frontendOrigin,
    callbackUrl,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const url = google.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    redirect_uri: callbackUrl,
  });
  res.redirect(url);
});

authRoutes.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const parsedState = parseState(state);

  const targetFrontend =
    parsedState?.origin ||
    req.cookies?.oauth_origin ||
    (env.FRONTEND_URL && !env.FRONTEND_URL.includes('localhost') ? env.FRONTEND_URL : null) ||
    'https://outbox-scheduler-frontend.outbox-frontend.workers.dev';

  try {
    if (typeof code !== 'string') {
      res.redirect(`${targetFrontend}/login?error=auth_failed`);
      return;
    }

    const callbackUrl = parsedState?.callbackUrl || `${env.BASE_URL}/auth/google/callback`;

    const { tokens } = await google.getToken({
      code,
      redirect_uri: callbackUrl,
    });
    const ticket = await google.verifyIdToken({ idToken: tokens.id_token!, audience: env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload()!;

    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
       RETURNING id`,
      [profile.sub, profile.email, profile.name, profile.picture],
    );

    const authToken = signToken(rows[0].id);

    // Set auth cookie
    res.cookie('token', authToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.clearCookie('oauth_state');
    res.clearCookie('oauth_origin');

    // If user's browser is currently on a different domain than targetFrontend,
    // bridge the cookie by redirecting to targetFrontend/auth/session?token=...
    const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
    const targetHost = new URL(targetFrontend).host;

    if (reqHost && targetHost && reqHost !== targetHost) {
      res.redirect(`${targetFrontend}/auth/session?token=${encodeURIComponent(authToken)}`);
    } else {
      res.redirect(`${targetFrontend}/dashboard`);
    }
  } catch (err) {
    logger.warn({ err }, 'google auth failed');
    res.redirect(`${targetFrontend}/login?error=auth_failed`);
  }
});

authRoutes.get('/auth/session', (req, res) => {
  const token = req.query.token;
  if (typeof token === 'string' && token) {
    res.cookie('token', token, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
  res.redirect('/dashboard');
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
