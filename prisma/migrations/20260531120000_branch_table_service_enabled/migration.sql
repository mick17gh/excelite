-- AlterTable
ALTER TABLE "branch" ADD COLUMN "tableServiceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: opt in branches that already have dining tables when org module is on
UPDATE "branch" b
SET "tableServiceEnabled" = true
WHERE EXISTS (
  SELECT 1 FROM "dining_table" dt WHERE dt."branchId" = b.id
)
AND EXISTS (
  SELECT 1 FROM "organization" o
  WHERE o.id = b."organizationId" AND o."tableManagementEnabled" = true
);
