import { db } from "@/lib/db";
import { isTableManagementEnabledForBranch } from "@/lib/features/table-management";

export async function validateTableSessionForOrder(
  tableSessionId: string,
  branchId: string,
): Promise<{ ok: true; sessionId: string } | { error: string }> {
  const enabled = await isTableManagementEnabledForBranch(branchId);
  if (!enabled) return { ok: true, sessionId: tableSessionId };

  const session = await db.tableSession.findFirst({
    where: {
      id: tableSessionId,
      branchId,
      status: "OPEN",
    },
  });
  if (!session) {
    return { error: "Table session is closed or invalid" };
  }
  return { ok: true, sessionId: session.id };
}
