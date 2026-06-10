-- Branch Paystack subaccount settlement fields
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "paystackSubaccountCode" TEXT;
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "paystackSubaccountId" INTEGER;
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "settlementBankCode" TEXT;
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "settlementAccountNumber" TEXT;
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "settlementAccountName" TEXT;
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "paystackPercentageCharge" DECIMAL(5,2) DEFAULT 0;
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "paystackSubaccountActive" BOOLEAN;
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "paystackSubaccountSyncedAt" TIMESTAMP(3);
ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "paystackSubaccountSource" TEXT;
