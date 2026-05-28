-- Create inventory category master table (organization scoped)
CREATE TABLE "inventory_category_master" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "inventory_category_master_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inventory_category_master"
ADD CONSTRAINT "inventory_category_master_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add FK columns first so we can backfill safely
ALTER TABLE "inventory_item" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "warehouse_inventory_item" ADD COLUMN "categoryId" TEXT;

-- Seed default categories for each organization
WITH orgs AS (
  SELECT id FROM "organization"
),
defaults AS (
  SELECT *
  FROM (VALUES
    ('FOOD', 'Food', 0),
    ('BEVERAGE', 'Beverage', 1),
    ('PACKAGING', 'Packaging', 2),
    ('CLEANING', 'Cleaning Supplies', 3),
    ('EQUIPMENT', 'Equipment', 4),
    ('OTHER', 'Other', 5)
  ) AS x(code, name, sort_order)
)
INSERT INTO "inventory_category_master" (
  "id",
  "organizationId",
  "name",
  "code",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('icm_', md5(orgs.id || ':' || defaults.code)),
  orgs.id,
  defaults.name,
  defaults.code,
  defaults.sort_order,
  true,
  NOW(),
  NOW()
FROM orgs
CROSS JOIN defaults;

-- Backfill branch inventory categoryId
UPDATE "inventory_item" i
SET "categoryId" = m."id"
FROM "branch" b
JOIN "inventory_category_master" m
  ON m."organizationId" = b."organizationId"
WHERE i."branchId" = b."id"
  AND m."code" = COALESCE(i."category"::text, 'OTHER');

-- Backfill warehouse inventory categoryId
UPDATE "warehouse_inventory_item" wi
SET "categoryId" = m."id"
FROM "warehouse" w
JOIN "inventory_category_master" m
  ON m."organizationId" = w."organizationId"
WHERE wi."warehouseId" = w."id"
  AND m."code" = COALESCE(wi."category"::text, 'OTHER');

-- Safety fallback to OTHER if any row was not matched
UPDATE "inventory_item" i
SET "categoryId" = m."id"
FROM "branch" b
JOIN "inventory_category_master" m
  ON m."organizationId" = b."organizationId"
 AND m."code" = 'OTHER'
WHERE i."branchId" = b."id" AND i."categoryId" IS NULL;

UPDATE "warehouse_inventory_item" wi
SET "categoryId" = m."id"
FROM "warehouse" w
JOIN "inventory_category_master" m
  ON m."organizationId" = w."organizationId"
 AND m."code" = 'OTHER'
WHERE wi."warehouseId" = w."id" AND wi."categoryId" IS NULL;

ALTER TABLE "inventory_item" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "warehouse_inventory_item" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "inventory_item"
ADD CONSTRAINT "inventory_item_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "inventory_category_master"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warehouse_inventory_item"
ADD CONSTRAINT "warehouse_inventory_item_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "inventory_category_master"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "inventory_category_master_organizationId_code_key"
ON "inventory_category_master"("organizationId", "code");

CREATE UNIQUE INDEX "inventory_category_master_organizationId_name_key"
ON "inventory_category_master"("organizationId", "name");

CREATE INDEX "inventory_category_master_organizationId_isActive_idx"
ON "inventory_category_master"("organizationId", "isActive");

CREATE INDEX "inventory_category_master_organizationId_sortOrder_idx"
ON "inventory_category_master"("organizationId", "sortOrder");

CREATE INDEX "inventory_item_categoryId_idx" ON "inventory_item"("categoryId");
CREATE INDEX "warehouse_inventory_item_categoryId_idx" ON "warehouse_inventory_item"("categoryId");

-- Remove old enum columns and enum type
ALTER TABLE "inventory_item" DROP COLUMN "category";
ALTER TABLE "warehouse_inventory_item" DROP COLUMN "category";
DROP TYPE "InventoryCategory";
