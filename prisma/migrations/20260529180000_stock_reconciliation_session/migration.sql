-- Stock reconciliation session grouping
ALTER TABLE "inventory_stock_count" ADD COLUMN "sessionId" TEXT;

CREATE TABLE "stock_reconciliation_session" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "reconciliationDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "itemCount" INTEGER NOT NULL,
    "totalShortageQty" DECIMAL(12,3) NOT NULL,
    "totalOverageQty" DECIMAL(12,3) NOT NULL,
    "totalVarianceCost" DECIMAL(12,2) NOT NULL,
    "salesTotalSnapshot" DECIMAL(12,2),
    "submittedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reconciliation_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_reconciliation_session_branchId_reconciliationDate_status_key"
    ON "stock_reconciliation_session"("branchId", "reconciliationDate", "status");
CREATE INDEX "stock_reconciliation_session_branchId_idx" ON "stock_reconciliation_session"("branchId");
CREATE INDEX "stock_reconciliation_session_reconciliationDate_idx" ON "stock_reconciliation_session"("reconciliationDate");
CREATE INDEX "stock_reconciliation_session_branchId_reconciliationDate_idx"
    ON "stock_reconciliation_session"("branchId", "reconciliationDate");
CREATE INDEX "inventory_stock_count_sessionId_idx" ON "inventory_stock_count"("sessionId");

ALTER TABLE "inventory_stock_count"
    ADD CONSTRAINT "inventory_stock_count_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "stock_reconciliation_session"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_reconciliation_session"
    ADD CONSTRAINT "stock_reconciliation_session_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branch"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
