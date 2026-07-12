-- Add custom_type to closet_items
ALTER TABLE closet_items
  ADD COLUMN custom_type TEXT NULL
    CHECK (char_length(custom_type) BETWEEN 2 AND 30),
  ADD CONSTRAINT closet_items_custom_type_requires_other
    CHECK (custom_type IS NULL OR type = 'other');

-- Add custom_type to vendor_item_prices and fix UNIQUE constraint
ALTER TABLE vendor_item_prices
  ADD COLUMN custom_type TEXT NULL
    CHECK (char_length(custom_type) BETWEEN 2 AND 30),
  ADD CONSTRAINT vendor_item_prices_custom_type_requires_other
    CHECK (custom_type IS NULL OR item_type = 'other');

ALTER TABLE vendor_item_prices
  DROP CONSTRAINT vendor_item_prices_vendor_id_item_type_key;

ALTER TABLE vendor_item_prices
  ADD CONSTRAINT vendor_item_prices_vendor_id_item_type_custom_type_key
  UNIQUE NULLS NOT DISTINCT (vendor_id, item_type, custom_type);
