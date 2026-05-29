-- CreateTable
CREATE TABLE "warehouse_outbound_log" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "warehouseItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT,
    "outboundDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_outbound_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouse_outbound_log_warehouseId_idx" ON "warehouse_outbound_log"("warehouseId");

-- CreateIndex
CREATE INDEX "warehouse_outbound_log_warehouseItemId_idx" ON "warehouse_outbound_log"("warehouseItemId");

-- CreateIndex
CREATE INDEX "warehouse_outbound_log_outboundDate_idx" ON "warehouse_outbound_log"("outboundDate");

-- AddForeignKey
ALTER TABLE "warehouse_outbound_log" ADD CONSTRAINT "warehouse_outbound_log_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_outbound_log" ADD CONSTRAINT "warehouse_outbound_log_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "warehouse_inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
