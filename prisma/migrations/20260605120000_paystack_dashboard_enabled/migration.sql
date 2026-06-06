-- AlterTable
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "paystackDashboardEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: preserve current behavior for orgs that already enabled Paystack
UPDATE "organization" SET "paystackDashboardEnabled" = true WHERE "paystackEnabled" = true AND "paystackDashboardEnabled" = false;
