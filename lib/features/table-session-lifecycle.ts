import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { isTableManagementEnabledForBranch } from "@/lib/features/table-management";

/** When every order on the session is PAID, close the session and mark the table DIRTY. */
export async function closeTableSessionIfAllOrdersPaid(
  tableSessionId: string,
  branchId: string,
): Promise<boolean> {
  const enabled = await isTableManagementEnabledForBranch(branchId);
  if (!enabled) return false;

  const unpaid = await db.order.count({
    where: { tableSessionId, paymentStatus: { not: "PAID" } },
  });
  if (unpaid > 0) return false;

  const session = await db.tableSession.findUnique({
    where: { id: tableSessionId },
    select: { id: true, tableId: true, status: true, branchId: true },
  });
  if (!session || session.status !== "OPEN") return false;

  await db.$transaction([
    db.tableSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", closedAt: new Date() },
    }),
    db.diningTable.update({
      where: { id: session.tableId },
      data: { status: "DIRTY" },
    }),
  ]);

  revalidatePath("/dashboard/tables");
  revalidatePath("/pos");
  revalidatePath(`/dashboard/branches/${session.branchId}/tables`);
  return true;
}
