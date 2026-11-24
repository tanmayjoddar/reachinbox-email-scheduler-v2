# ReachInbox — Full-Stack Email Job Scheduler

A production-grade, persistent email job scheduler built for the **ReachInbox / Outbox Labs** hiring assignment. The system schedules email campaigns at scale, manages per-sender concurrency and rate limits using atomic Redis Lua scripts and BullMQ, delivers messages over Ethereal SMTP, survives crashes and restarts without losing jobs, and exposes an inbox-style dashboard matching the Figma design.

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Architecture & Design](#architecture--design)
  - [1. Scheduling Pipeline (No Cron)](#1-scheduling-pipeline-no-cron)
  - [2. Persistence & Crash Recovery](#2-persistence--crash-recovery)
  - [3. Throughput, Rate Limiting & Concurrency](#3-throughput-rate-limiting--concurrency)
  - [4. Elasticsearch Indexing & Search](#4-elasticsearch-indexing--search)
  - [5. Slack Rate-Limit Notifications](#5-slack-rate-limit-notifications)
  - [6. Bull Board Queue Dashboard](#6-bull-board-queue-dashboard)
- [Frontend Overview & Figma Alignment](#frontend-overview--figma-alignment)
- [Feature Checklist](#feature-checklist)
- [Assumptions & Deviations](#assumptions--deviations)

---

## Tech Stack

### Backend
- **Runtime:** Node.js (v20+) with TypeScript and `tsx`
- **Framework:** Express 5
- **Queue Engine:** BullMQ backed by Redis (Strictly no cron jobs)
- **Database:** PostgreSQL (raw SQL queries with connection pooling, transactional batches)
- **Search Engine:** Elasticsearch 8 (user-isolated multi-match indexing)
- **Email Delivery:** Nodemailer over Ethereal SMTP (simulated multi-sender test accounts)
- **Monitoring:** Bull Board at `/admin/queues` behind HTTP basic auth

### Frontend
- **Framework:** React 19 + TypeScript (strict)
- **Build Tool:** Vite + `@tailwindcss/vite` (Tailwind CSS v4)
- **Routing:** React Router v7
- **Data Fetching:** `@tanstack/react-query` (5s background polling, `keepPreviousData` smooth updates)
- **Toasts:** Sonner
- **Design Target:** Pixel-aligned with Figma node `59-4050`

---

## Quick Start

### 1. Start Infrastructure (Docker)
Ensure Docker Desktop is running:
```sh
cd backend
docker compose up -d
```
*Spins up PostgreSQL (`55432`), Redis (`6379`), and Elasticsearch (`9200`).*

### 2. Setup & Run Backend
```sh
cd backend
npm install

# Run database migrations
npm run migrate

# Seed 3 Ethereal SMTP sender accounts
npm run seed:senders -- 3 --force

# Start API server (port 3000)
npm run dev:api

# In a separate terminal, start Queue Worker
npm run dev:worker
```

### 3. Setup & Run Frontend
```sh
cd frontend
npm install

# Starts Vite dev server with proxy to backend
npm run dev

# Run TypeScript check and production build
npm run build
```
Frontend URL: **`http://localhost:5241/`** (or `http://localhost:5173/` depending on host port availability).

---

## Environment Variables

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and update credentials:

| Variable | Default / Example | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Express API port. |
| `NODE_ENV` | `development` | Set `production` for secure cookie enforcement. |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string. |
| `REDIS_URL` | `redis://localhost:6379` | Redis instance for BullMQ and rate limiter. |
| `JWT_SECRET` | `local-dev-secret-change-me` | Secret for user sessions and OAuth state tokens. |
| `WORKER_CONCURRENCY` | `5` | Parallel jobs per worker process. |
| `MIN_DELAY_MS` | `2000` | Minimum spacing per sender (default: 2s). |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Provider hourly quota per sender. |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Google Cloud OAuth Client ID. |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud OAuth Client Secret. |
| `BASE_URL` | `http://localhost:3000` | Base backend URL for Google OAuth callback. |
| `FRONTEND_URL` | `http://localhost:5241` | Allowed origin for cookies and post-auth redirect. |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch node URL. |
| `SLACK_CLIENT_ID` | `dev-slack-client-id` | Slack app client ID. |
| `SLACK_CLIENT_SECRET` | `dev-slack-client-secret` | Slack app client secret. |
| `SLACK_REDIRECT_URL` | `https://<tunnel>/slack/callback` | Public HTTPS tunnel for Slack OAuth callback. |
| `ADMIN_USER` | `admin` | HTTP basic auth username for Bull Board. |
| `ADMIN_PASS` | `admin` | HTTP basic auth password for Bull Board. |

### Ethereal SMTP Setup
Running `npm run seed:senders -- 3 --force` automatically registers 3 free test accounts on Ethereal Email and saves their credentials into the `senders` table. Messages never leave the test server; each sender prints a web inbox URL where you can view delivered emails:
```
sekmo7g265cjyfci@ethereal.email -> https://ethereal.email/messages
o4peosqstbuhak7r@ethereal.email -> https://ethereal.email/messages
opyjm2vklid5zcxi@ethereal.email -> https://ethereal.email/messages
```

---

## Architecture & Design

### 1. Scheduling Pipeline (No Cron)
* **Single Transaction Insertion:** When scheduling via `POST /api/emails/schedule`, the batch record and all recipient rows are inserted into PostgreSQL within a single database transaction (`BEGIN ... COMMIT`).
* **Sender Round-Robin:** Recipients are assigned round-robin across active senders so that aggregate throughput scales with the number of senders while individual senders stay spaced by `effectiveDelay`.
* **BullMQ Delayed Jobs:** Once committed, jobs are pushed to BullMQ with `{ delay: scheduledAt - now }`. Job IDs match PostgreSQL email row UUIDs, ensuring 1:1 mapping and preventing duplicate job dispatch.

### 2. Persistence & Crash Recovery
* **PostgreSQL as Single Source of Truth:** BullMQ jobs are transient handles. The persistent state lives in PostgreSQL.
* **Boot Recovery:** When the worker process boots up, it queries PostgreSQL for any pending `scheduled` emails whose send time has arrived and re-enqueues them into BullMQ.
* **Guarded Idempotency Lock:** The worker claims an email with a single guarded SQL update:
  ```sql
  UPDATE emails SET status = 'processing', processing_started_at = now()
  WHERE id = $1 AND (status = 'scheduled' OR (status = 'processing' AND processing_started_at < now() - interval '60 seconds'))
  ```
  If a worker crashes mid-send, the row becomes claimable again after 60 seconds. An email can never be processed twice concurrently.

### 3. Throughput, Rate Limiting & Concurrency
* **Worker Concurrency:** BullMQ worker concurrency is configurable via `WORKER_CONCURRENCY` (default: 5). Running multiple worker instances scales throughput horizontally.
* **Minimum Delay Between Sends:** Every sender enforces a minimum spacing (`MIN_DELAY_MS=2000`).
* **Atomic Redis Lua Limiter:** An atomic Lua script handles gate checks and hourly limits in a single round-trip:
  1. Checks if the sender's minimum delay gate (`gate:<senderId>`) is active.
  2. Increments and checks the sender's hourly counter (`rls:<senderId>:<hour>`).
  3. Increments and checks the batch's hourly counter (`rlb:<batchId>:<hour>`).
* **Safe Overflow (Zero Dropped Emails):** When an hourly limit is reached, jobs are **never** dropped or marked failed. The job's `scheduled_at` is moved into the next UTC hour window (`next_hour + offset`), preserving arrival order, and re-delayed in BullMQ.

### 4. Elasticsearch Indexing & Search
* Emails are indexed into Elasticsearch (`emails` index) with fields: `recipient`, `subject`, `body`, `status`, `scheduledAt`, `sentAt`, `senderEmail`, `userId`.
* The frontend search bar debounces queries (300ms) and executes multi-match queries isolated by the authenticated `userId`.
* On Elasticsearch unavailability (503), the frontend gracefully falls back to the database list query without crashing.

### 5. Slack Rate-Limit Notifications
* Users can connect their Slack workspace via OAuth (`/api/slack/connect`).
* The instant a sender reaches their hourly rate limit, the backend triggers an incoming webhook alert to the user's connected Slack channel:
  > *"Sender sekmo7g265cjyfci@ethereal.email hit hourly cap (200) for hour 10:00 UTC. 15 remaining emails moved to next hour."*
* Notifications are deduplicated per sender per hour using Redis keys.

### 6. Bull Board Queue Dashboard
* Visual monitoring of delayed, active, completed, and failed BullMQ jobs.
* Accessible at **`/admin/queues`** protected by HTTP basic auth (`ADMIN_USER:ADMIN_PASS`).
* Direct one-click link available from the user profile dropdown in the frontend.

---

## Frontend Overview & Figma Alignment

The frontend in `frontend/` was crafted from scratch to match Figma node **`59-4050`**:

* **Pixel Font `ONB` Logo:** Custom pixelated SVG component matching the retro bitmap typography in the Figma sidebar header.
* **Sidebar Layout:** Width `236px` matching Figma specs, featuring the user profile card with avatar, pill outline **Compose** button, and **Core** section with `Scheduled` and `Sent` live count badges.
* **Search Header:** Sized to `1180px fill × 58px hug` with `rounded-full` styling, accompanied by external filter and refresh controls.
* **Email Inbox Rows:** Clean horizontal rows displaying recipient (`To: ...`), status badges (peach pill for scheduled time, gray pill for sent), bold subject with body preview, and decorative star icon.
* **Composer (`/compose`):**
  - Lead upload accepting `.csv` and `.txt` files with parsing, deduplication, valid lead count, and green recipient chips (`[ email ✕ ]`).
  - Image and document attachment support via the Pin icon with preview cards matching the Figma design.
  - Interactive "Send Later" popover with date-time picker and presets (*Tomorrow*, *Tomorrow 10:00 AM*, etc.).
  - Delay in seconds and hourly limit numeric controls.
  - Rich text toolbar styling with clean reply textarea.
* **Smooth Auto-Polling:** React Query polls `/api/emails` every 5 seconds with `keepPreviousData` so emails move seamlessly from Scheduled to Sent without list flicker.

---

## Feature Checklist

### Backend Requirements
- [x] Accept email send requests via API (`POST /api/emails/schedule`)
- [x] PostgreSQL relational schema with idempotent migrations
- [x] BullMQ + Redis delayed queue scheduling (Strictly no cron jobs)
- [x] Multi-sender SMTP delivery via Ethereal Email test accounts
- [x] Boot recovery & crash resilience (PostgreSQL source of truth, atomic state lock)
- [x] Worker concurrency configured via `WORKER_CONCURRENCY=5`
- [x] Minimum delay between sends per sender (`MIN_DELAY_MS=2000`)
- [x] Configurable hourly rate limits (per sender and per batch)
- [x] Zero dropped emails on rate-limit hits (delayed to next UTC hour window)
- [x] Slack OAuth connection and rate-limit hit webhook notifications
- [x] Elasticsearch indexing and multi-match user-isolated search
- [x] Bull Board live queue dashboard at `/admin/queues`
- [x] Google OAuth session authentication with `httpOnly` cookies

### Frontend Requirements
- [x] Real Google OAuth login flow (`/login` -> `/auth/google`)
- [x] Top header / user profile card with avatar, name, email, and logout
- [x] Dashboard navigation with Scheduled and Sent tabs showing live counts
- [x] Primary "Compose New Email" button with full composer view
- [x] CSV / TXT lead upload with email regex extraction, deduplication, and chips
- [x] Start time picker with "Send Later" popover and quick presets
- [x] Delay between emails (seconds) and hourly limit inputs
- [x] Shared Scheduled and Sent table/list driven by reusable components
- [x] Real-time 5-second polling via React Query without UI flicker
- [x] Debounced search querying Elasticsearch with 503 fallback
- [x] Loading spinners, empty states with illustrations, and error banners
- [x] Connect Slack integration control and notification handling
- [x] Strict TypeScript (zero `any`, zero build errors) and all files < 150 lines

---

## Assumptions & Deviations

1. **Per-Email Detail View:** The Figma contains a frame showing an opened email view. This was omitted per assignment specifications because the backend does not provide a single email detail endpoint (`GET /api/emails/:id`) and list queries do not return the full body.
2. **Email / Password Form Fields on Login:** The Figma login frame shows email/password inputs. These are displayed as visual indicators only, as the backend exclusively implements Google OAuth login.
3. **Sender Picker:** Figma shows a sender selection dropdown in the composer. The backend assigns senders round-robin across the active sender pool to maximize throughput; therefore, the field displays the authenticated user's email.
4. **Dev Port Fallback on Windows:** On Windows hosts with WSL2/Hyper-V enabled, port `5173` is frequently included in dynamic TCP exclusion ranges (`netsh interface ipv4 show excludedportrange`). `vite.config.ts` detects this and automatically falls back to port `5241`.
