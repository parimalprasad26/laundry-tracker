-- Add dispute_type and wrong_item_description to batch_disputes.
-- Existing disputes are backfilled as 'damage' (the only type that existed before).

ALTER TABLE batch_disputes
  ADD COLUMN IF NOT EXISTS dispute_type text NOT NULL DEFAULT 'damage',
  ADD COLUMN IF NOT EXISTS wrong_item_description text;

ALTER TABLE batch_disputes
  ADD CONSTRAINT batch_disputes_type_check
    CHECK (dispute_type IN ('damage', 'swap'));
