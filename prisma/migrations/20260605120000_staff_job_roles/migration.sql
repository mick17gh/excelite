-- CreateEnum
CREATE TYPE "StaffJobRoleCategory" AS ENUM ('MANAGEMENT', 'KITCHEN', 'FRONT_OF_HOUSE', 'OPERATIONS', 'CORPORATE');

-- CreateEnum
CREATE TYPE "ShiftTemplate" AS ENUM ('MORNING', 'EVENING', 'FULL');

-- CreateTable
CREATE TABLE "staff_job_role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "StaffJobRoleCategory",
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultShiftTemplate" "ShiftTemplate",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "staff_job_role_pkey" PRIMARY KEY ("id")
);

-- Add nullable FK column first (backfill script assigns values)
ALTER TABLE "staff" ADD COLUMN "jobRoleId" TEXT;

-- CreateIndex
CREATE INDEX "staff_job_role_organizationId_isActive_idx" ON "staff_job_role"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "staff_job_role_organizationId_sortOrder_idx" ON "staff_job_role"("organizationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "staff_job_role_organizationId_code_key" ON "staff_job_role"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "staff_job_role_organizationId_name_key" ON "staff_job_role"("organizationId", "name");

-- CreateIndex
CREATE INDEX "staff_jobRoleId_idx" ON "staff"("jobRoleId");

-- AddForeignKey
ALTER TABLE "staff_job_role" ADD CONSTRAINT "staff_job_role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (not yet NOT NULL — backfill required)
ALTER TABLE "staff" ADD CONSTRAINT "staff_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "staff_job_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
