-- Customer additions
ALTER TABLE "customer"
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "customerVibe" TEXT,
  ADD COLUMN IF NOT EXISTS "specialNotes" TEXT;

UPDATE "customer"
SET "location" = COALESCE("location", "city")
WHERE "city" IS NOT NULL;

-- Supplier additions
ALTER TABLE "supplier"
  ADD COLUMN IF NOT EXISTS "leadTime" TEXT,
  ADD COLUMN IF NOT EXISTS "consistency" TEXT,
  ADD COLUMN IF NOT EXISTS "coreCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "specialization" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "qualityRating" TEXT,
  ADD COLUMN IF NOT EXISTS "specialNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Delivery / order additions
ALTER TABLE "order"
  ADD COLUMN IF NOT EXISTS "deliveryNeighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "orderReceivedTime" TIMESTAMP(3);

ALTER TABLE "delivery_request"
  ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "dispatchTime" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveryIssues" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "comments" TEXT;
