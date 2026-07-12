-- Indexes to speed up per-user queries that run on every page load
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON user_settings(user_id);

-- Partial index on non-deleted batches ordered by sent_at (budget + trends queries)
CREATE INDEX IF NOT EXISTS idx_batches_user_sent_at
  ON laundry_batches(user_id, sent_at)
  WHERE deleted_at IS NULL;
