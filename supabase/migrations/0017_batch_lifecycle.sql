-- Migration 0017: Batch lifecycle
-- Adds returned → closed states, immutable event log, disputes, inspection policies.
-- Migrates all existing "completed" batches (all items returned) to closed.

-- 1. Drop view before altering underlying tables
DROP VIEW IF EXISTS batch_with_status;

-- 2. Extend laundry_batches with lifecycle columns
ALTER TABLE laundry_batches
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS version   integer NOT NULL DEFAULT 0;

-- 3. Migrate existing completed batches → closed
--    "completed" was: sent_at IS NOT NULL AND SUM(returned) >= SUM(sent) AND COUNT > 0
UPDATE laundry_batches b
SET
  closed_at  = COALESCE(b.returned_at, b.updated_at),
  updated_at = now()
WHERE b.sent_at    IS NOT NULL
  AND b.deleted_at IS NULL
  AND b.closed_at  IS NULL
  AND b.id IN (
    SELECT bi.batch_id
    FROM   batch_items bi
    WHERE  bi.deleted_at IS NULL
    GROUP  BY bi.batch_id
    HAVING COUNT(*) > 0
       AND SUM(bi.quantity_returned) >= SUM(bi.quantity_sent)
  );

-- 4. Recreate batch_with_status with 4-state lifecycle
CREATE VIEW batch_with_status AS
SELECT
  b.*,
  COALESCE(s.total_qty,    0) AS total_items,
  COALESCE(s.returned_qty, 0) AS returned_items,
  s.calculated_cost,
  CASE
    WHEN b.sent_at   IS NULL                                                THEN 'draft'
    WHEN b.closed_at IS NOT NULL                                            THEN 'closed'
    WHEN b.sent_at   IS NOT NULL
      AND COALESCE(s.total_qty, 0) > 0
      AND COALESCE(s.total_qty, 0) = COALESCE(s.returned_qty, 0)          THEN 'returned'
    ELSE                                                                         'in_laundry'
  END AS status,
  v.name AS vendor_name
FROM laundry_batches b
LEFT JOIN (
  SELECT
    batch_id,
    SUM(quantity_sent)     AS total_qty,
    SUM(quantity_returned) AS returned_qty,
    SUM(unit_price * quantity_sent) FILTER (WHERE unit_price IS NOT NULL) AS calculated_cost
  FROM batch_items
  WHERE deleted_at IS NULL
  GROUP BY batch_id
) s ON s.batch_id = b.id
LEFT JOIN laundry_vendors v ON v.id = b.vendor_id AND v.deleted_at IS NULL
WHERE b.deleted_at IS NULL;

-- 5. Immutable event log (append-only audit trail)
CREATE TABLE IF NOT EXISTS batch_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   uuid        NOT NULL REFERENCES laundry_batches(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id),
  event_type text        NOT NULL,
  payload    jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS batch_events_batch_created_idx ON batch_events(batch_id, created_at);

-- 6. Post-close dispute claims (does NOT modify batch_items, preserves history)
CREATE TABLE IF NOT EXISTS batch_disputes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      uuid        NOT NULL REFERENCES laundry_batches(id) ON DELETE CASCADE,
  batch_item_id uuid        NOT NULL REFERENCES batch_items(id)     ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id),
  reported_at   timestamptz NOT NULL DEFAULT now(),
  damaged_qty   int         NOT NULL DEFAULT 0,
  missing_qty   int         NOT NULL DEFAULT 0,
  description   text,
  status        text        NOT NULL DEFAULT 'open',
  resolved_at   timestamptz,
  resolution    text,
  CONSTRAINT batch_disputes_status_check
    CHECK (status IN ('open', 'resolved', 'dismissed'))
);
CREATE INDEX IF NOT EXISTS batch_disputes_batch_idx ON batch_disputes(batch_id);
CREATE INDEX IF NOT EXISTS batch_disputes_user_idx  ON batch_disputes(user_id, reported_at DESC);

-- 7. Per-user configurable inspection policy
CREATE TABLE IF NOT EXISTS user_inspection_policies (
  user_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  inspection_window_days int  NOT NULL DEFAULT 7,
  auto_close_days        int  NOT NULL DEFAULT 30,
  dispute_window_days    int  NOT NULL DEFAULT 30,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- 8. Track when and under which batch state damage was reported
ALTER TABLE batch_items
  ADD COLUMN IF NOT EXISTS issue_reported_at     timestamptz,
  ADD COLUMN IF NOT EXISTS issue_reported_status text
    CONSTRAINT batch_items_issue_status_check
    CHECK (issue_reported_status IN ('post_return', 'dispute'));

-- 9. RLS
ALTER TABLE batch_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_disputes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inspection_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own batch events"      ON batch_events
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own batch disputes"    ON batch_disputes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own inspection policy" ON user_inspection_policies
  FOR ALL USING (auth.uid() = user_id);

-- 10. Update vendor comparison stats to use 'closed' (was 'completed')
CREATE OR REPLACE FUNCTION get_vendor_comparison_stats(p_user_id uuid)
RETURNS TABLE (
  vendor_id             uuid,
  batch_count           bigint,
  avg_cost              numeric,
  total_spend           numeric,
  avg_turnaround_days   numeric,
  total_items_sent      bigint,
  total_damaged         bigint,
  total_missing         bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.vendor_id,
    COUNT(DISTINCT b.id)                                                       AS batch_count,
    AVG(b.actual_cost)                                                         AS avg_cost,
    SUM(b.actual_cost)                                                         AS total_spend,
    AVG(
      EXTRACT(EPOCH FROM (b.returned_at - b.sent_at)) / 86400.0
    ) FILTER (WHERE b.sent_at IS NOT NULL AND b.returned_at IS NOT NULL)       AS avg_turnaround_days,
    COALESCE(SUM(bi.quantity_sent), 0)                                         AS total_items_sent,
    COALESCE(SUM(bi.damaged_qty),   0)                                         AS total_damaged,
    COALESCE(SUM(bi.missing_qty),   0)                                         AS total_missing
  FROM laundry_batches b
  JOIN batch_with_status bws
         ON bws.id    = b.id
        AND bws.status = 'closed'
  LEFT JOIN batch_items bi
         ON bi.batch_id   = b.id
        AND bi.deleted_at IS NULL
  WHERE b.user_id    = p_user_id
    AND b.deleted_at IS NULL
    AND b.vendor_id  IS NOT NULL
  GROUP BY b.vendor_id
$$;
