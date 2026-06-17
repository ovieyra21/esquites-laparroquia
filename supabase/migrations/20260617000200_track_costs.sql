
-- Add unit_cost to sale_items to track COGS (Cost of Goods Sold)
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0;
