# ReachInbox — Full-Stack Email Job Scheduler

A production-grade, persistent email job scheduler and inbox dashboard built with TypeScript, Express 5, BullMQ, Redis, PostgreSQL, Elasticsearch 8, and React 19.

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Quick Start (4 Terminals)](#quick-start-4-terminals)
- [Ethereal Email & Environment Variables](#ethereal-email--environment-variables)
- [Architecture & Engineering Overview](#architecture--engineering-overview)
  - [1. End-to-End Scheduling & Delivery Flow](#1-end-to-end-scheduling--delivery-flow)
  - [2. Throughput, Rate Limiting & Concurrency](#2-throughput-rate-limiting--concurrency)
  - [3. Persistence, Idempotency & Crash Recovery](#3-persistence-idempotency--crash-recovery)
  - [4. Behavior Under Load (1,000+ Emails)](#4-behavior-under-load-1000-emails)
  - [5. Elasticsearch Indexing & Live Search](#5-elasticsearch-indexing--live-search)
  - [6. Slack OAuth & Rate-Limit Alerts](#6-slack-oauth--rate-limit-alerts)
  - [7. Bull Board Queue Dashboard](#7-bull-board-queue-dashboard)
- [Features Implemented (Backend & Frontend)](#features-implemented-backend--frontend)
- [Engineering Trade-offs & Assumptions](#engineering-trade-offs--assumptions)

---

## Tech Stack

### Backend (`backend/`)
- **Runtime:** Node.js (v20+) with TypeScript (`tsc`, `tsx`)
- **Framework:** Express 5
- **Queue Engine:** BullMQ backed by Redis (Strictly zero cron jobs)
- **Database:** PostgreSQL (`pg` pool, transactional batch inserts, guarded row locking)
- **Search Engine:** Elasticsearch 8 (`@elastic/elasticsearch`, user-isolated multi-match search)
- **Email Delivery:** Nodemailer over Ethereal SMTP (multi-sender round-robin pool)
- **Monitoring:** `@bull-board/express` mounted at `/admin/queues` behind HTTP basic auth

### Frontend (`frontend/`)
- **Framework:** React 19 + TypeScript (strict)
- **Build & Styling:** Vite + Tailwind CSS v4 (`@tailwindcss/vite`)
- **Routing:** React Router v7
- **State & Data:** `@tanstack/react-query` (5s background polling with `keepPreviousData`)
- **Notifications:** Sonner toast system

---

## Quick Start (4 Terminals)

### Terminal 1 — Start Infrastructure (Docker)
Starts PostgreSQL (`55432`), Redis (`6379`), and Elasticsearch (`9200`):
```sh
cd backend
docker compose up -d
```

### Terminal 2 — Backend Setup & Express API Server
```sh
cd backend
npm install
cp .env.example .env       # Configure your Google/Slack/DB credentials
npm run migrate            # Run PostgreSQL schema migrations
npm run seed:senders -- 3 --force   # Create 3 Ethereal SMTP sender accounts
npm run dev:api            # Starts Express API on http://localhost:3000
```

### Terminal 3 — BullMQ Queue Worker
Run the worker in its own terminal so it can be stopped and restarted independently:
```sh
cd backend
npm run dev:worker
```

### Terminal 4 — Frontend Dashboard
```sh
cd frontend
npm install
npm run dev                # Starts Vite dev server on http://localhost:5241
```

> **Note:** On Windows hosts with Hyper-V/WSL2 port exclusions around `5173`, `vite.config.ts` binds to **`http://localhost:5241`**.

---

## Ethereal Email & Environment Variables

### Ethereal SMTP Setup
Running `npm run seed:senders -- 3 --force` automatically generates 3 Ethereal Email test accounts via `nodemailer.createTestAccount()` and stores their SMTP credentials in PostgreSQL (`senders` table). Each delivered message logs its Ethereal preview URL and can be inspected in the Ethereal web inbox.

### Environment Variables (`backend/.env`)

| Variable | Default / Example | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Express API port |
| `NODE_ENV` | `development` | Enables `secure` cookie flag in `production` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:55432/outbox` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis instance for BullMQ, rate limiter & dedupe |
| `JWT_SECRET` | `local-dev-secret-change-me` | Signs auth session cookies and OAuth `state` tokens |
| `WORKER_CONCURRENCY` | `5` | Parallel jobs processed per worker instance |
| `MIN_DELAY_MS` | `2000` | **Minimum 2 seconds** delay between sends per sender |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Configurable per-sender SMTP hourly ceiling |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud OAuth Client Secret |
| `BASE_URL` | `http://localhost:3000` | Backend base URL for Google OAuth callback |
| `FRONTEND_URL` | `http://localhost:5241` | Allowed CORS origin & post-auth redirect target |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch 8 node URL |
| `SLACK_CLIENT_ID` | `...` | Slack App Client ID |
| `SLACK_CLIENT_SECRET` | `...` | Slack App Client Secret |
| `SLACK_REDIRECT_URL` | `https://<tunnel>/slack/callback` | Public HTTPS callback URL for Slack OAuth |
| `ADMIN_USER` | `admin` | HTTP Basic Auth username for `/admin/queues` |
| `ADMIN_PASS` | `admin` | HTTP Basic Auth password for `/admin/queues` |

---

## Architecture & Engineering Overview

### 1. End-to-End Scheduling & Delivery Flow

```mermaid
flowchart LR
    UI["React Dashboard / Compose"] -->|POST /api/emails/schedule| API["Express 5 API"]
    API -->|Single Transaction| PG[("PostgreSQL\nbatches & emails")]
    API -->|Delayed Jobs| Redis[("Redis / BullMQ\n(delay = scheduledAt - now)")]
    API -.->|Async Bulk Index| ES[("Elasticsearch 8\n(emails index)")]

    Redis -->|Job Ready| Worker["BullMQ Worker\n(Concurrency = 5)"]
    Worker -->|1. Guarded Lock| PG
    Worker -->|2. Atomic Lua Check| RateLimiter["Redis Rate Limiter\n(Gate + Sender + User Cap)"]
    RateLimiter -->|Allowed| SMTP["Ethereal SMTP\n(Round-Robin Senders)"]
    RateLimiter -->|Limit Hit| Defer["Move Job to Next UTC Hour\n+ Trigger Slack Alert"]
    SMTP -->|Sent| PG
    SMTP -.->|Update Status| ES
```

* **Transactional Atomicity:** `POST /api/emails/schedule` inserts the `batches` row and all `emails` rows inside a single PostgreSQL `BEGIN ... COMMIT` transaction before dispatching jobs to BullMQ.
* **Sender Round-Robin:** Recipients are distributed round-robin across active Ethereal senders in the `senders` table so aggregate throughput scales linearly with sender count while each sender remains throttled.
* **No Cron Jobs:** All scheduling relies strictly on BullMQ delayed jobs (`delay: Math.max(0, scheduledAt - now)`).

---

### 2. Throughput, Rate Limiting & Concurrency

```mermaid
flowchart TD
    Job["Worker Claims Email"] --> Hydrate{"Redis key\nrlu:userId:window\nexists?"}
    Hydrate -->|No| DBCount["Hydrate from PostgreSQL\nCOUNT(sent in current UTC hour)"]
    DBCount --> Lua
    Hydrate -->|Yes| Lua["Execute Atomic Lua Script"]

    Lua --> SenderCheck{"Sender Count >=\nMAX_EMAILS_PER_HOUR_PER_SENDER?"}
    SenderCheck -->|Yes| Overflow["Increment overflow counter\nCompute next UTC hour slot"]

    SenderCheck -->|No| UserCheck{"User Count >=\nhourlyLimit?"}
    UserCheck -->|Yes| Overflow

    UserCheck -->|No| GateCheck{"Min Delay Gate\ngate:senderId active?"}
    GateCheck -->|Yes| DelayRetry["Delay by remaining PTTL + jitter"]
    GateCheck -->|No| Allow["Increment Counters\nSet Gate PX = MIN_DELAY_MS\nAllow Send"]

    Overflow --> Reschedule["DB: releaseEmail(nextWindow)\nBullMQ: moveToDelayed(nextWindow)\nNotify Slack (1h Redis dedupe)"]
```

* **Worker Concurrency:** Configured via `WORKER_CONCURRENCY=5` (`backend/src/queue/emailWorker.ts`). Multiple worker processes can run in parallel safely.
* **Delay Between Sends:** Enforces a **minimum 2 seconds (`MIN_DELAY_MS=2000`)** gap between individual sends per sender using a Redis TTL gate (`gate:<senderId>`).
* **Atomic Redis Lua Limiter:** A single Lua script (`backend/src/services/rateLimiter.ts`) atomically checks both the per-sender cap (`rl:<senderId>:<window>`) and the user/tenant hourly limit (`rlu:<userId>:<window>`).
* **Zero Dropped Jobs:** When an hourly limit is reached, jobs are never dropped or failed—they are placed directly into deterministic slots in the next UTC hour window (`nextHourStart + offset`), preserving arrival order.

---

### 3. Persistence, Idempotency & Crash Recovery
* **PostgreSQL as Source of Truth:** BullMQ jobs carry only `emailId`; all state lives in PostgreSQL.
* **Guarded Idempotency Lock (`claimEmail`):** Workers claim rows via a single atomic SQL update:
  ```sql
  UPDATE emails e SET status = 'processing', processing_started_at = now()
  FROM senders s, batches b, users u
  WHERE e.id = $1 AND e.sender_id = s.id AND e.batch_id = b.id AND e.user_id = u.id
    AND (e.status = 'scheduled' OR (e.status = 'processing' AND e.processing_started_at < now() - interval '60 seconds'))
  ```
* **Restart Recovery:** On boot (`src/worker.ts`), `recoverScheduledEmails()` queries PostgreSQL for pending `scheduled` rows and re-enqueues missing BullMQ jobs using `jobId = email.id`. Completed (`sent`) rows are never re-sent.

---

### 4. Behavior Under Load (1,000+ Emails)
When 1,000+ emails are scheduled for the same timestamp:
1. All rows are bulk-inserted via `unnest(...)` in one PostgreSQL transaction and enqueued in BullMQ.
2. Up to the configured hourly limit (e.g., `hourlyLimit` or `S * MAX_EMAILS_PER_HOUR_PER_SENDER`) is dispatched in the current UTC hour, spaced by `MIN_DELAY_MS` per sender.
3. Remaining emails hit the Redis Lua limiter, receive a deterministic future `retryAt` across subsequent UTC hour windows (`Math.floor((k - 1) / limit) * HOUR`), and are moved once via `job.moveToDelayed()`—preventing busy-loop retries.
4. You can verify this locally with the built-in load test script:
   ```sh
   cd backend
   npm run load-test -- 1200 20 2000
   ```

---

### 5. Elasticsearch Indexing & Live Search
* `backend/src/services/searchService.ts` defines explicit mappings (`keyword` for `id`, `userId`, `batchId`, `status`; `text` for `recipient`, `subject`, `body`, `senderEmail`).
* On schedule, `indexEmails()` bulk-indexes all recipients. On send, `updateEmailDoc()` updates `status` and `sentAt`.
* `GET /api/emails/search?q=...` runs user-isolated `multi_match` queries. In the dashboard, typing in the search bar displays a live `[Elasticsearch]` match counter banner above the table.

---

### 6. Slack OAuth & Rate-Limit Alerts
* Users connect Slack via OAuth 2.0 (`GET /api/slack/connect` &rarr; `GET /slack/callback` with signed JWT `state`).
* Webhook credentials (`team_name`, `channel`, `webhook_url`) are stored per user in `slack_connections`.
* On rate-limit hit, `notifyRateLimit()` posts a live alert using a 1-hour Redis deduplication lock (`slack:notified:<userId>:<senderId>:<hourWindow>`):
  > ⚠️ **Rate Limit Alert:** Sender `user@gmail.com` hit the batch limit of **10 emails/hour**. ⏳ **96 emails** for this sender are currently pending. 🕒 Next sending window starts at **11:00 PM** (`2026-11-24T23:00:00.000Z`).
* If Slack is disconnected, rate-limit hits are silently ignored without crashing. Reconnecting enables alerts immediately without a redeploy.

---

### 7. Bull Board Queue Dashboard
* Real-time queue visibility (`delayed`, `active`, `completed`, `failed`, `waiting`) via `@bull-board/express` at `/admin/queues`, protected by HTTP Basic Auth (`ADMIN_USER` / `ADMIN_PASS`).

---

## Features Implemented (Backend & Frontend)

### Backend
* **Scheduler:** Express 5 API (`POST /api/emails/schedule`), PostgreSQL transactional batches, BullMQ delayed jobs (no cron), Ethereal multi-sender SMTP pool.
* **Persistence & Idempotency:** PostgreSQL state machine, guarded `claimEmail` lock, boot recovery (`recoverScheduledEmails()`), stale lock reclamation after 60s.
* **Rate Limiting & Concurrency:** Configurable `WORKER_CONCURRENCY`, `MIN_DELAY_MS` per-sender Redis gate, atomic Redis Lua hourly limiter with DB hydration, deterministic next-hour rescheduling.
* **Search, Monitoring & Alerts:** Elasticsearch 8 indexing + `/api/emails/search`, Bull Board at `/admin/queues`, real Slack OAuth + live webhook alerts, Google OAuth2 session cookies.

### Frontend
* **Authentication:** Real Google OAuth login (`/login` &rarr; `/auth/google`), top/sidebar user profile (name, email, avatar), and logout.
* **Dashboard:** Scheduled & Sent tabs with live counts, status pills, filter funnel (`All`, `Scheduled`, `Sending`), pagination, loading spinners, empty states, and 5s React Query polling.
* **Compose (`/compose`):** WYSIWYG `contentEditable` rich-text editor (Bold, Italic, Underline, Strikethrough, Quote, Lists, Headings, Undo/Redo), `.csv`/`.txt` lead upload with count & chips, real file attachments, delay & hourly limit controls, and unified **Send** / **Send Later** clock popover with auto-reset.
* **Detail View & Search:** Click any email row to view full formatted body, real attachments, Google sender header, full-stack star toggle (`PATCH /api/emails/:id/star`), and live Elasticsearch search bar.

---

## Engineering Trade-offs & Assumptions

1. **UTC Clock Hour Windows:** Rate-limit windows align to UTC clock hours (`Math.floor(nowMs / 3_600_000)`) rather than sliding 60-minute windows for deterministic O(1) Redis keys and predictable next-window scheduling.
2. **Pre-SMTP Slot Reservation:** Rate-limit slots are reserved before SMTP transmission; if an SMTP attempt fails, that slot still counts toward capacity, preventing retry storms from exceeding provider limits.
3. **At-Least-Once Crash Edge Case:** A crash occurring in the narrow window after SMTP accepts a message but before PostgreSQL marks `status = 'sent'` will make the row reclaimable after 60s.
4. **Sender Round-Robin:** Senders are assigned round-robin across the Ethereal pool to scale aggregate throughput while respecting each sender's `MIN_DELAY_MS` gate.
5. **Dev Port Fallback on Windows:** `vite.config.ts` binds to `5241` to avoid Windows Hyper-V/WSL2 dynamic port exclusion ranges around `5173`.
