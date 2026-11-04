-- CreateEnum
CREATE TYPE "BusinessMode" AS ENUM ('RETAIL', 'RESTAURANT');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN "businessMode" "BusinessMode" NOT NULL DEFAULT 'RESTAURANT';
