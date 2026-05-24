-- Commissary supply chain migration

-- New enums
CREATE TYPE "WarehouseType" AS ENUM ('RAW', 'COMMISSARY');
CREATE TYPE "InventoryItemStage" AS ENUM ('RAW', 'PROCESSED', 'BRANCH_READY');
CREATE TYPE "ProductionBatchStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WarehouseTransferKind" AS ENUM ('MATERIAL_ISSUE', 'GENERAL');

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COMMISSARY_STAFF';

ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'AWAITING_WAREHOUSE_APPROVAL';
ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

-- Organization
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "complimentaryApproverRoles" JSONB;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "enforceCommissaryRouting" BOOLEAN NOT NULL DEFAULT false;

-- User
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "assignedWarehouseId" TEXT;
CREATE INDEX IF NOT EXISTS "user_assignedWarehouseId_idx" ON "user"("assignedWarehouseId");
ALTER TABLE "user" ADD CONSTRAINT "user_assignedWarehouseId_fkey" FOREIGN KEY ("assignedWarehouseId") REFERENCES "warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Warehouse
ALTER TABLE "warehouse" ADD COLUMN IF NOT EXISTS "warehouseType" "WarehouseType" NOT NULL DEFAULT 'RAW';
ALTER TABLE "warehouse" ADD COLUMN IF NOT EXISTS "parentWarehouseId" TEXT;
CREATE INDEX IF NOT EXISTS "warehouse_warehouseType_idx" ON "warehouse"("warehouseType");
CREATE INDEX IF NOT EXISTS "warehouse_parentWarehouseId_idx" ON "warehouse"("parentWarehouseId");
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_parentWarehouseId_fkey" FOREIGN KEY ("parentWarehouseId") REFERENCES "warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Warehouse inventory item
ALTER TABLE "warehouse_inventory_item" ADD COLUMN IF NOT EXISTS "itemStage" "InventoryItemStage" NOT NULL DEFAULT 'RAW';
ALTER TABLE "warehouse_inventory_item" ADD COLUMN IF NOT EXISTS "requiresCommissaryProcessing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "warehouse_inventory_item" ADD COLUMN IF NOT EXISTS "allowDirectToBranch" BOOLEAN NOT NULL DEFAULT true;

-- Warehouse branch transfer approval
ALTER TABLE "warehouse_branch_transfer" ADD COLUMN IF NOT EXISTS "requestedBy" TEXT;
ALTER TABLE "warehouse_branch_transfer" ADD COLUMN IF NOT EXISTS "warehouseApprovedBy" TEXT;
ALTER TABLE "warehouse_branch_transfer" ADD COLUMN IF NOT EXISTS "warehouseApprovedAt" TIMESTAMP(3);

-- Order complimentary
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "isComplimentary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "complimentaryAuthorizedBy" TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "complimentaryReason" TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "complimentaryAuthorizedAt" TIMESTAMP(3);

-- Warehouse transfer (WH to WH)
CREATE TABLE IF NOT EXISTS "warehouse_transfer" (
    "id" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "warehouseItemId" TEXT NOT NULL,
    "transferKind" "WarehouseTransferKind" NOT NULL DEFAULT 'MATERIAL_ISSUE',
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "transferDate" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "warehouse_transfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "warehouse_transfer_fromWarehouseId_idx" ON "warehouse_transfer"("fromWarehouseId");
CREATE INDEX IF NOT EXISTS "warehouse_transfer_toWarehouseId_idx" ON "warehouse_transfer"("toWarehouseId");
CREATE INDEX IF NOT EXISTS "warehouse_transfer_status_idx" ON "warehouse_transfer"("status");
CREATE INDEX IF NOT EXISTS "warehouse_transfer_transferDate_idx" ON "warehouse_transfer"("transferDate");

ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouse_transfer" ADD CONSTRAINT "warehouse_transfer_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "warehouse_inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Branch warehouse transfer
CREATE TABLE IF NOT EXISTS "branch_warehouse_transfer" (
    "id" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "branchItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "transferDate" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branch_warehouse_transfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "branch_warehouse_transfer_fromBranchId_idx" ON "branch_warehouse_transfer"("fromBranchId");
CREATE INDEX IF NOT EXISTS "branch_warehouse_transfer_toWarehouseId_idx" ON "branch_warehouse_transfer"("toWarehouseId");
CREATE INDEX IF NOT EXISTS "branch_warehouse_transfer_status_idx" ON "branch_warehouse_transfer"("status");

ALTER TABLE "branch_warehouse_transfer" ADD CONSTRAINT "branch_warehouse_transfer_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branch_warehouse_transfer" ADD CONSTRAINT "branch_warehouse_transfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branch_warehouse_transfer" ADD CONSTRAINT "branch_warehouse_transfer_branchItemId_fkey" FOREIGN KEY ("branchItemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Production
CREATE TABLE IF NOT EXISTS "production_recipe" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputItemId" TEXT NOT NULL,
    "outputQuantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_recipe_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "production_recipe_warehouseId_idx" ON "production_recipe"("warehouseId");

ALTER TABLE "production_recipe" ADD CONSTRAINT "production_recipe_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_recipe" ADD CONSTRAINT "production_recipe_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "warehouse_inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "production_recipe_line" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    CONSTRAINT "production_recipe_line_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "production_recipe_line_recipeId_idx" ON "production_recipe_line"("recipeId");

ALTER TABLE "production_recipe_line" ADD CONSTRAINT "production_recipe_line_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "production_recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_recipe_line" ADD CONSTRAINT "production_recipe_line_ingredientItemId_fkey" FOREIGN KEY ("ingredientItemId") REFERENCES "warehouse_inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "production_batch" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "ProductionBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedOutput" DECIMAL(12,3) NOT NULL,
    "actualOutput" DECIMAL(12,3),
    "wasteQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "producedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_batch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "production_batch_warehouseId_idx" ON "production_batch"("warehouseId");
CREATE INDEX IF NOT EXISTS "production_batch_recipeId_idx" ON "production_batch"("recipeId");
CREATE INDEX IF NOT EXISTS "production_batch_status_idx" ON "production_batch"("status");

ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "production_recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "production_batch_consumption" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "ingredientItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    CONSTRAINT "production_batch_consumption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "production_batch_consumption_batchId_idx" ON "production_batch_consumption"("batchId");

ALTER TABLE "production_batch_consumption" ADD CONSTRAINT "production_batch_consumption_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_batch_consumption" ADD CONSTRAINT "production_batch_consumption_ingredientItemId_fkey" FOREIGN KEY ("ingredientItemId") REFERENCES "warehouse_inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
