-- ServStack Reporting Module schema additions

ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "seatCount" INTEGER;

ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS "terminalId" TEXT;

CREATE TABLE IF NOT EXISTS "pos_terminal" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pos_terminal_branchId_code_key" ON "pos_terminal"("branchId", "code");
CREATE INDEX IF NOT EXISTS "pos_terminal_branchId_idx" ON "pos_terminal"("branchId");

CREATE TABLE IF NOT EXISTS "operating_expense" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "operating_expense_branchId_idx" ON "operating_expense"("branchId");
CREATE INDEX IF NOT EXISTS "operating_expense_periodStart_periodEnd_idx" ON "operating_expense"("periodStart", "periodEnd");

CREATE TABLE IF NOT EXISTS "inventory_stock_count" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "expectedQty" DECIMAL(12,3) NOT NULL,
    "actualQty" DECIMAL(12,3) NOT NULL,
    "wasteReason" TEXT,
    "countedAt" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_stock_count_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_stock_count_branchId_idx" ON "inventory_stock_count"("branchId");
CREATE INDEX IF NOT EXISTS "inventory_stock_count_itemId_idx" ON "inventory_stock_count"("itemId");
CREATE INDEX IF NOT EXISTS "inventory_stock_count_countedAt_idx" ON "inventory_stock_count"("countedAt");
CREATE INDEX IF NOT EXISTS "inventory_stock_count_branchId_countedAt_idx" ON "inventory_stock_count"("branchId", "countedAt");

DO $$ BEGIN
  ALTER TABLE "pos_terminal" ADD CONSTRAINT "pos_terminal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "operating_expense" ADD CONSTRAINT "operating_expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_stock_count" ADD CONSTRAINT "inventory_stock_count_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_stock_count" ADD CONSTRAINT "inventory_stock_count_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction" ADD CONSTRAINT "transaction_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "pos_terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "transaction_terminalId_idx" ON "transaction"("terminalId");
