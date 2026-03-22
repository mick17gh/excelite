-- Migration: Update BASIC tier to PRO
-- This migration updates all organizations with BASIC tier to PRO tier
-- Run this after deploying the schema changes

-- Update organizations table
UPDATE "organization"
SET "tier" = 'PRO'
WHERE "tier" = 'BASIC';

-- Update subscriptions table
UPDATE "subscription"
SET "tier" = 'PRO'
WHERE "tier" = 'BASIC';

-- Verify the migration
SELECT COUNT(*) as remaining_basic_orgs 
FROM "organization" 
WHERE "tier" = 'BASIC';

SELECT COUNT(*) as remaining_basic_subs 
FROM "subscription" 
WHERE "tier" = 'BASIC';
