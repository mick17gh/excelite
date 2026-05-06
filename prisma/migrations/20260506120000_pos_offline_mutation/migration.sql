-- CreateEnum
CREATE TYPE "PosOfflineMutationStatus" AS ENUM ('PENDING', 'ORDER_CREATED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "pos_offline_mutation" (
    "id" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "PosOfflineMutationStatus" NOT NULL DEFAULT 'PENDING',
    "payloadJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_offline_mutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pos_offline_mutation_clientMutationId_key" ON "pos_offline_mutation"("clientMutationId");

-- CreateIndex
CREATE INDEX "pos_offline_mutation_status_idx" ON "pos_offline_mutation"("status");

-- Idempotent POS offline replay: link replayed orders to client mutation id
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "offlineClientMutationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "order_offlineClientMutationId_key" ON "order"("offlineClientMutationId");
