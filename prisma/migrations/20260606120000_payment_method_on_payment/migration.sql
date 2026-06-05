-- Add paymentMethod to payment for split-tender audit trail
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

-- Backfill from order paymentMethod where provider was pos
UPDATE "payment" p
SET "paymentMethod" = o."paymentMethod"
FROM "order" o
WHERE p."orderId" = o.id
  AND p."paymentMethod" IS NULL
  AND o."paymentMethod" IS NOT NULL
  AND p.provider IN ('pos', 'manual', 'paystack');

-- Backfill dashboard manual payments from provider slug
UPDATE "payment"
SET "paymentMethod" = CASE
  WHEN provider = 'cash' THEN 'CASH'
  WHEN provider = 'momo' THEN 'MOBILE_MONEY'
  WHEN provider = 'card' THEN 'CARD'
  WHEN provider = 'bank_transfer' THEN 'BANK_TRANSFER'
  ELSE UPPER(REPLACE(provider, ' ', '_'))
END
WHERE "paymentMethod" IS NULL
  AND provider NOT IN ('pos', 'paystack');
