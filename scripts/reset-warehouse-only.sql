-- Clears warehouse item data and related logs/transfers for ONE warehouse only.
-- Does NOT touch branch inventory_item, menu ingredients, or the warehouse record itself.
--
-- Usage:
--   psql "$DATABASE_URL" -v warehouse_code=MAIN-WH -f scripts/reset-warehouse-only.sql
--   psql "$DATABASE_URL" -v warehouse_id=clxxxxxxxx -f scripts/reset-warehouse-only.sql
--
-- List warehouses:
--   psql "$DATABASE_URL" -c 'SELECT id, code, name FROM "warehouse" ORDER BY name;'
--
-- WARNING: Permanently deletes warehouse inventory and history for the target warehouse.

BEGIN;

\if :{?warehouse_id}
\else
  \if :{?warehouse_code}
  \else
    \echo 'ERROR: pass -v warehouse_code=CODE or -v warehouse_id=ID'
    \quit 1
  \endif
\endif

\if :{?warehouse_id}
SELECT id AS target_warehouse_id FROM "warehouse" WHERE id = :'warehouse_id';
\else
SELECT id AS target_warehouse_id FROM "warehouse" WHERE code = :'warehouse_code';
\endif

\gset

\if :{?target_warehouse_id}
\else
\echo 'ERROR: warehouse not found'
\quit 1
\endif

\echo 'Clearing warehouse:' :target_warehouse_id

DELETE FROM "production_batch_consumption"
WHERE "batchId" IN (
  SELECT id FROM "production_batch" WHERE "warehouseId" = :'target_warehouse_id'
);

DELETE FROM "production_batch" WHERE "warehouseId" = :'target_warehouse_id';

DELETE FROM "production_recipe_line"
WHERE "recipeId" IN (
  SELECT id FROM "production_recipe" WHERE "warehouseId" = :'target_warehouse_id'
);

DELETE FROM "production_recipe" WHERE "warehouseId" = :'target_warehouse_id';
DELETE FROM "warehouse_branch_transfer" WHERE "warehouseId" = :'target_warehouse_id';
DELETE FROM "warehouse_transfer"
WHERE "fromWarehouseId" = :'target_warehouse_id' OR "toWarehouseId" = :'target_warehouse_id';
DELETE FROM "warehouse_outbound_log" WHERE "warehouseId" = :'target_warehouse_id';
DELETE FROM "warehouse_waste_log" WHERE "warehouseId" = :'target_warehouse_id';
DELETE FROM "warehouse_inbound" WHERE "warehouseId" = :'target_warehouse_id';
DELETE FROM "warehouse_inventory_item" WHERE "warehouseId" = :'target_warehouse_id';

SELECT COUNT(*) AS remaining_items
FROM "warehouse_inventory_item"
WHERE "warehouseId" = :'target_warehouse_id';

COMMIT;
