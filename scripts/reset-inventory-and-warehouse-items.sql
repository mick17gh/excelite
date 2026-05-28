-- Clears inventory/warehouse item data and all FK-dependent rows only.
-- Does NOT reset the full database.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/reset-inventory-and-warehouse-items.sql
--
-- WARNING:
--   This permanently deletes data in the tables listed below.

BEGIN;

-- Optional visibility before delete
SELECT 'inventory_item' AS table_name, COUNT(*) AS row_count FROM "inventory_item"
UNION ALL
SELECT 'warehouse_inventory_item', COUNT(*) FROM "warehouse_inventory_item"
UNION ALL
SELECT 'inbound_stock', COUNT(*) FROM "inbound_stock"
UNION ALL
SELECT 'outbound_stock', COUNT(*) FROM "outbound_stock"
UNION ALL
SELECT 'waste_log', COUNT(*) FROM "waste_log"
UNION ALL
SELECT 'transfer_log', COUNT(*) FROM "transfer_log"
UNION ALL
SELECT 'inventory_stock_count', COUNT(*) FROM "inventory_stock_count"
UNION ALL
SELECT 'branch_warehouse_transfer', COUNT(*) FROM "branch_warehouse_transfer"
UNION ALL
SELECT 'menu_item_ingredient', COUNT(*) FROM "menu_item_ingredient"
UNION ALL
SELECT 'menu_item_option_ingredient', COUNT(*) FROM "menu_item_option_ingredient"
UNION ALL
SELECT 'warehouse_branch_transfer', COUNT(*) FROM "warehouse_branch_transfer"
UNION ALL
SELECT 'warehouse_transfer', COUNT(*) FROM "warehouse_transfer"
UNION ALL
SELECT 'warehouse_waste_log', COUNT(*) FROM "warehouse_waste_log"
UNION ALL
SELECT 'warehouse_inbound', COUNT(*) FROM "warehouse_inbound"
UNION ALL
SELECT 'production_recipe', COUNT(*) FROM "production_recipe"
UNION ALL
SELECT 'production_recipe_line', COUNT(*) FROM "production_recipe_line"
UNION ALL
SELECT 'production_batch', COUNT(*) FROM "production_batch"
UNION ALL
SELECT 'production_batch_consumption', COUNT(*) FROM "production_batch_consumption";

-- =========
-- Branch inventory dependencies
-- =========
DELETE FROM "menu_item_option_ingredient";
DELETE FROM "menu_item_ingredient";
DELETE FROM "inventory_stock_count";
DELETE FROM "inbound_stock";
DELETE FROM "outbound_stock";
DELETE FROM "waste_log";
DELETE FROM "transfer_log";
DELETE FROM "branch_warehouse_transfer";

-- =========
-- Warehouse inventory dependencies
-- =========
DELETE FROM "production_batch_consumption";
DELETE FROM "production_batch";
DELETE FROM "production_recipe_line";
DELETE FROM "production_recipe";
DELETE FROM "warehouse_branch_transfer";
DELETE FROM "warehouse_transfer";
DELETE FROM "warehouse_waste_log";
DELETE FROM "warehouse_inbound";

-- =========
-- Root tables
-- =========
DELETE FROM "inventory_item";
DELETE FROM "warehouse_inventory_item";

-- Optional visibility after delete
SELECT 'inventory_item' AS table_name, COUNT(*) AS row_count FROM "inventory_item"
UNION ALL
SELECT 'warehouse_inventory_item', COUNT(*) FROM "warehouse_inventory_item";

COMMIT;
