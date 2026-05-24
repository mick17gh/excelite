-- Branch tax pricing mode: inclusive (tax in menu price) vs exclusive (tax added at checkout)
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "taxInclusive" BOOLEAN NOT NULL DEFAULT false;
