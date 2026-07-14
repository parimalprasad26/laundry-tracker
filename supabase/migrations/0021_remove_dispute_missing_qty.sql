-- missing_qty on batch_disputes is redundant: uncollected items are tracked
-- via quantity_returned=0 at collection time; post-close disputes are for
-- damage discovered after closing, not for re-reporting missing items.
ALTER TABLE batch_disputes DROP COLUMN IF EXISTS missing_qty;
