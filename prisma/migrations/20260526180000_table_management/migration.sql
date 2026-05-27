-- CreateEnum
CREATE TYPE "DiningTableStatus" AS ENUM ('AVAILABLE', 'SEATED', 'ORDERING', 'BILL_REQUESTED', 'DIRTY', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'VOID');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'WAITER';

-- AlterTable
ALTER TABLE "organization" ADD COLUMN "tableManagementEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "order" ADD COLUMN "tableSessionId" TEXT;

-- CreateTable
CREATE TABLE "dining_section" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dining_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_table" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sectionId" TEXT,
    "label" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "DiningTableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "posX" INTEGER,
    "posY" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dining_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_session" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dining_section_branchId_idx" ON "dining_section"("branchId");

-- CreateIndex
CREATE INDEX "dining_table_branchId_idx" ON "dining_table"("branchId");

-- CreateIndex
CREATE INDEX "dining_table_sectionId_idx" ON "dining_table"("sectionId");

-- CreateIndex
CREATE INDEX "dining_table_status_idx" ON "dining_table"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dining_table_branchId_label_key" ON "dining_table"("branchId", "label");

-- CreateIndex
CREATE INDEX "table_session_branchId_idx" ON "table_session"("branchId");

-- CreateIndex
CREATE INDEX "table_session_tableId_idx" ON "table_session"("tableId");

-- CreateIndex
CREATE INDEX "table_session_status_idx" ON "table_session"("status");

-- CreateIndex
CREATE INDEX "table_session_openedByUserId_idx" ON "table_session"("openedByUserId");

-- CreateIndex
CREATE INDEX "order_tableSessionId_idx" ON "order"("tableSessionId");

-- AddForeignKey
ALTER TABLE "dining_section" ADD CONSTRAINT "dining_section_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_table" ADD CONSTRAINT "dining_table_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_table" ADD CONSTRAINT "dining_table_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "dining_section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "dining_table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "table_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
