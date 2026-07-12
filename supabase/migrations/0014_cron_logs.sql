CREATE TABLE cron_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent        INT         NOT NULL DEFAULT 0,
  skipped     INT         NOT NULL DEFAULT 0,
  errors      INT         NOT NULL DEFAULT 0,
  duration_ms INT         NOT NULL,
  dry_run     BOOLEAN     NOT NULL DEFAULT false
);

-- Only service-role key can read/write cron_logs (no user-facing RLS needed)
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
