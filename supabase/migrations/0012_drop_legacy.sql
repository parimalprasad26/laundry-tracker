-- Drop legacy item_images first (FK references clothing_items)
DROP TABLE IF EXISTS item_images CASCADE;

-- Drop legacy clothing_items (superseded by closet_items + batch_items)
DROP TABLE IF EXISTS clothing_items CASCADE;
