CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id text UNIQUE,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  smtp_host text NOT NULL,
  smtp_port int NOT NULL,
  smtp_user text NOT NULL,
  smtp_pass text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  subject text NOT NULL,
  body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  start_at timestamptz NOT NULL,
  delay_ms int NOT NULL,
  hourly_limit int NOT NULL,
  total int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE batches ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id),
  user_id uuid NOT NULL REFERENCES users(id),
  sender_id uuid NOT NULL REFERENCES senders(id),
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed')),
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  error text,
  message_id text,
  processing_started_at timestamptz,
  is_starred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS emails_user_status_scheduled_idx ON emails (user_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS emails_status_scheduled_idx ON emails (status, scheduled_at);
CREATE INDEX IF NOT EXISTS emails_user_starred_idx ON emails (user_id, is_starred);

CREATE TABLE IF NOT EXISTS slack_connections (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  team_name text NOT NULL,
  channel text NOT NULL,
  webhook_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
