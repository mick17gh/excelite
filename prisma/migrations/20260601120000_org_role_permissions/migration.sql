-- CreateTable
CREATE TABLE "org_role_permission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_role_permission_organizationId_role_idx" ON "org_role_permission"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "org_role_permission_organizationId_role_permission_key" ON "org_role_permission"("organizationId", "role", "permission");

-- AddForeignKey
ALTER TABLE "org_role_permission" ADD CONSTRAINT "org_role_permission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
