-- Optional branch par level on warehouse inventory items (null = use reorderPoint x 5 at transfer)
ALTER TABLE "warehouse_inventory_item" ADD COLUMN IF NOT EXISTS "maxStock" DECIMAL(12,3);
