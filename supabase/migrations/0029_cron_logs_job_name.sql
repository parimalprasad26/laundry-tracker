-- cron_logs had no way to distinguish which cron job produced a given row —
-- both send-reminders and auto-close write the same shape to the same table.
-- Needed so a health check can verify each job's freshness independently
-- instead of only knowing "some cron ran recently."
ALTER TABLE cron_logs
  ADD COLUMN job_name TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name_ran_at
  ON cron_logs(job_name, ran_at DESC);
