-- Storefront platform entitlement + checkout method toggles
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "storefrontPlatformEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "cashCheckoutEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "whatsappOrderingEnabled" BOOLEAN NOT NULL DEFAULT false;
