import type { Prisma } from "@/lib/generated/prisma/client";
import { Role } from "@/lib/generated/prisma/client";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions/defaults";
import type { Permission } from "@/lib/permissions/types";
import { ROLE_PERMISSION_EMPTY_MARKER } from "@/lib/permissions/constants";
import { EDITABLE_MATRIX_ROLES } from "@/lib/permissions/types";

type DbClient = Prisma.TransactionClient | {
  orgRolePermission: {
    createMany: (args: {
      data: { organizationId: string; role: Role; permission: string }[];
      skipDuplicates?: boolean;
    }) => Promise<{ count: number }>;
    deleteMany: (args: { where: { organizationId: string; role?: Role } }) => Promise<{ count: number }>;
    count: (args: { where: { organizationId: string } }) => Promise<number>;
  };
};

function buildSeedRows(organizationId: string) {
  const data: { organizationId: string; role: Role; permission: string }[] = [];
  for (const role of EDITABLE_MATRIX_ROLES) {
    const perms = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    for (const permission of perms) {
      data.push({ organizationId, role, permission });
    }
  }
  return data;
}

export async function seedOrgRolePermissions(
  db: DbClient,
  organizationId: string,
): Promise<void> {
  const data = buildSeedRows(organizationId);
  if (data.length === 0) return;
  await db.orgRolePermission.createMany({ data, skipDuplicates: true });
}

export async function ensureOrgRolePermissionsSeeded(
  db: DbClient,
  organizationId: string,
): Promise<void> {
  const count = await db.orgRolePermission.count({
    where: { organizationId },
  });
  if (count === 0) {
    await seedOrgRolePermissions(db, organizationId);
  }
}

export async function replaceRolePermissions(
  db: DbClient,
  organizationId: string,
  role: Role,
  permissions: Permission[],
): Promise<void> {
  await db.orgRolePermission.deleteMany({
    where: { organizationId, role },
  });
  const rows =
    permissions.length === 0
      ? [{ organizationId, role, permission: ROLE_PERMISSION_EMPTY_MARKER }]
      : permissions.map((permission) => ({
          organizationId,
          role,
          permission,
        }));
  await db.orgRolePermission.createMany({
    data: rows,
    skipDuplicates: true,
  });
}

export function getDefaultPermissionsForRole(role: Role): Permission[] {
  return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
}
