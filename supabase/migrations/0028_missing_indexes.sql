-- Fills a gap left when 0010_indexes.sql added the deleted_at-partial-index treatment
-- to laundry_batches but never revisited closet_items/laundry_vendors, despite both
-- having the exact same "every query filters deleted_at IS NULL" access pattern.
CREATE INDEX IF NOT EXISTS idx_closet_items_user_created_at
  ON closet_items(user_id, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_user_name
  ON laundry_vendors(user_id, name)
  WHERE deleted_at IS NULL;

-- vendor_item_prices only has an index on vendor_id (0006_vendor_pricing.sql), but
-- findByVendor/countByVendors also filter by user_id on every call.
CREATE INDEX IF NOT EXISTS idx_vendor_item_prices_user_id
  ON vendor_item_prices(user_id);
