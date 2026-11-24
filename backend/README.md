# ReachInbox email job scheduler — backend

## Quick start

```sh
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run seed:senders -- 3 --force
npm run dev:api
npm run dev:worker
npm run make-token
```

The example `DATABASE_URL` is a Neon-shaped placeholder using `sslmode=verify-full`. If you use the bundled Compose Postgres instead, set `DATABASE_URL=postgres://postgres:postgres@localhost:55432/outbox`.

`dev:api` / `dev:worker` use `tsx watch`; `build` + `start:api` / `start:worker` run compiled JS with `node --env-file`.
`make-token` prints a dev JWT and a ready `Cookie: token=...` header. Pass an email (`npm run make-token -- dev2@example.com`) for a second dev user.
Seeding creates Ethereal SMTP test accounts and prints each web inbox URL. Messages never leave the machine; open that URL to inspect them.

## Env setup

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | API port. |
| `NODE_ENV` | `development` | Cookie `secure` flag in production. |
| `DATABASE_URL` | required | Postgres connection (local compose or Neon). |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ, gates and notification dedupe. |
| `JWT_SECRET` | required | Signs session and Slack `state` tokens. |
| `WORKER_CONCURRENCY` | `5` | Parallel jobs per worker process. |
| `MIN_DELAY_MS` | `2000` | Minimum per-sender spacing, also the gate TTL. |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Per-sender hourly cap. The requested batch limit is never clamped. |
| `LOG_LEVEL` | `info` | pino level. |
| `GOOGLE_CLIENT_ID` | required | Google OAuth client id. |
| `GOOGLE_CLIENT_SECRET` | required | Google OAuth secret. |
| `BASE_URL` | `http://localhost:3000` | Backend URL used to build the Google redirect URI. |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin and post-login / post-Slack redirect target. |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch 8 node. |
| `SLACK_CLIENT_ID` | required | Slack app client id. |
| `SLACK_CLIENT_SECRET` | required | Slack app client secret. |
| `SLACK_REDIRECT_URL` | required | Public HTTPS URL ending in `/slack/callback`. |
| `ADMIN_USER` | required | Basic-auth user for Bull Board. |
| `ADMIN_PASS` | required | Basic-auth password for Bull Board. |
| `USER_ID` | optional | Dev user id for `npm run load-test`; copy the id belonging to the `make-token` user. |

**Google:** create a Web application OAuth client in the Google console, add `http://localhost:3000/auth/google/callback` as an authorized redirect, then copy id/secret into `.env`. Google accepts plain HTTP on localhost, so the callback is derived from `BASE_URL`. Cookies are not port-scoped, so the frontend on :5173 and API on :3000 share the `token` cookie on localhost.

**Slack:** create a Slack app, add the `incoming-webhook` scope, and set its redirect URL to a public HTTPS tunnel such as `https://<tunnel>/slack/callback`. Install the app for a workspace and copy id/secret into `.env`. Set `SLACK_REDIRECT_URL` to that exact same URL — it is used both in the authorize URL and in the code exchange, and Slack rejects plain HTTP redirects. Unlike Google, it cannot point at localhost. If the tunnel URL changes, update **both** `SLACK_REDIRECT_URL` and the Slack app's redirect setting.

## Architecture

- `POST /api/emails/schedule` validates recipients, round-robins senders, and inserts the batch plus all email rows in one transaction. Delayed BullMQ jobs are added after COMMIT; Elasticsearch docs follow without blocking the response.
- The worker claims a row with one guarded `UPDATE` (`scheduled` or `processing` stale for 60s), reserves a slot, sends via Nodemailer, stamps `sent_at`, and updates the ES doc. Job ids equal email ids, so a BullMQ retry cannot claim the same row twice.
- Postgres rows are the source of truth. On boot the worker re-enqueues due `scheduled` rows; a crashed worker's `processing` rows become claimable after 60s. At-least-once remains possible only if the process dies after SMTP accepts a message but before the DB update.
- `src/services/rateLimiter.ts` is one Lua script: a per-sender gate for `MIN_DELAY_MS`, a per-sender hourly counter, a per-batch hourly counter, and overflow counters. All windows are UTC clock hours.
- The batch limit is per batch and shared by all senders (key `rlb:<batchId>:<hour>`), not per batch+sender. Overflow jobs get one final `scheduled_at` in a future hour, spaced in arrival order; they can bounce again but are never dropped.
- The requested `hourlyLimit` is honored exactly; it is a per-batch cap shared by all senders, never clamped by `MAX_EMAILS_PER_HOUR_PER_SENDER`. With S senders the sender cap is S × 200/hour, and the smaller of that and the batch limit wins.
- Concurrency is per worker process (`WORKER_CONCURRENCY=5`); running more worker processes multiplies it. Search always filters by the authenticated `userId`.

## Behavior under load

Measured on this machine with the local Redis, Neon Postgres, ES 8 container, 3 Ethereal senders, `MIN_DELAY_MS=2000`, cap 200, and worker concurrency 5. Hour buckets below use `date_trunc('hour', sent_at AT TIME ZONE 'UTC')`.

- 1200 emails, `hourlyLimit=20`, delay 2000 (`npm run load-test`): 20 sent in the first clock hour, 1180 scheduled across 59 later UTC windows, exactly 20 per window, 0 failed. The script prints this expectation before scheduling.
- 300 emails, `hourlyLimit=1000`, delay 2000, worker killed mid-run with `Stop-Process -Force` (Windows equivalent of `kill -9`, used because the service runs under PowerShell) and restarted: 44 sent before the kill, final 300 sent, 0 failed, 0 duplicate recipients, 300 distinct `message_id`, and 0 rate-limit bounces.
- After the run the queue was empty (`delayed=0`, `waiting=0`); the next UTC window (10:00 on 2026-11-24) starts with fresh shared batch/sender counters. This assumes no other job is sent in that window.
- Per-sender consecutive `sent_at` gaps on that run: min 610 / 773 / 1248 ms, median 2401 / 2445 / 2560 ms, and 10 / 11 / 14 gaps under 2000 ms out of 99 per sender. Sub-2s gaps come from SMTP latency skew: the gate is set before SMTP and `sent_at` is stamped after it. No fixed tolerance is enforced.
- Per-sender per-hour maximum was 100, below the cap of 200.
- Slack dedupe without mocks: 3 POSTs (one per sender) for a burst, 0 POSTs before a connection row existed, and a 500 response was followed by a successful retry for the same sender.

## Feature checklist

- Dockerized Postgres, Redis and Elasticsearch: done.
- Postgres schema and idempotent migration: done.
- Ethereal sender pool and seeding: done.
- Validated bulk scheduling API with start time, delay and hourly limit: done.
- Durable rows and boot recovery after restart/crash: done.
- Atomic Lua rate limiter, minimum delay, sender cap and one-move overflow: done.
- BullMQ delayed queue, worker concurrency and idempotency guard: done.
- SMTP sending with per-sender round-robin: done.
- Elasticsearch indexing, user-isolated search and `npm run reindex`: done.
- Google OAuth session, `/api/me`, logout: done.
- Slack connection, status, disconnect and deduplicated rate-limit notifications: done.
- Bull Board behind HTTP basic auth at `/admin/queues`: done.
- Load test script (`npm run load-test [count] [hourlyLimit] [delayMs]`): done.
- README: done.
- Frontend login, dashboard, schedule form, search UI and Slack connect button: pending (no frontend in this repo).

## API reference

| Method | Path | Auth | Result |
| --- | --- | --- | --- |
| GET | `/health` | none | DB + Redis ping. |
| POST | `/api/emails/schedule` | cookie | `{ batchId, total, firstSendAt, lastSendAt }`. |
| GET | `/api/emails?status=&page=&limit=` | cookie | Paginated scheduled/sent rows. |
| GET | `/api/emails/search?q=&status=` | cookie | Up to 20 ES hits without body. |
| GET | `/auth/google` | none | 302 to Google with signed `state`. |
| GET | `/auth/google/callback` | state | Sets `token`, redirects to dashboard. |
| GET | `/api/me` | cookie | Current user. |
| POST | `/auth/logout` | none | Clears `token`. |
| GET | `/api/slack/connect` | cookie | `{ url }` for `incoming-webhook` authorize. |
| GET | `/slack/callback` | state | Saves webhook, redirects with `slack=connected` / `slack=error`. |
| GET | `/api/slack/status` | cookie | `{ connected, team, channel }`. |
| DELETE | `/api/slack` | cookie | Removes the connection. |
| GET | `/admin/queues` | basic auth | Bull Board dashboard. |

## Assumptions and trade-offs

- The 2s minimum delay is per sender; with S senders, S emails can leave at the same instant. Throughput scales with sender count by design.
- Default hourly cap is 200 per sender; the batch limit is taken from the request as-is.
- A worker crash between SMTP success and the DB update can resend that one message (at-least-once).
- A slot is consumed before the send is attempted, so SMTP failures still use capacity.
- An overflowed job can bounce again, but is never dropped.
- Slack webhook URLs are stored unencrypted in Postgres.
- Elasticsearch `scheduledAt` is not updated on bounces; only status and `sentAt` are updated after sends.
- Emails scheduled while Elasticsearch is down are searchable only after `npm run reindex`.
- Hourly windows are UTC clock hours, not rolling 60-minute intervals.
- There are no automated tests; the definition of done is run by hand and recorded here.
- Google and Slack credentials in `.env.example` are placeholders; real browser login requires manual console setup.
