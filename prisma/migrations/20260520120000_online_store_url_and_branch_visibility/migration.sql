-- AlterTable
ALTER TABLE "organization" ADD COLUMN "storefrontUrl" TEXT;

-- AlterTable
ALTER TABLE "branch" ADD COLUMN "onlineStoreVisible" BOOLEAN NOT NULL DEFAULT false;
