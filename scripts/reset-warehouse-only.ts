/**
 * Clear all warehouse inventory items and related history for one warehouse.
 * Does NOT touch branch inventory or menu recipe links.
 *
 * List warehouses:
 *   npx tsx scripts/reset-warehouse-only.ts --list
 *
 * Dry run (counts only):
 *   npx tsx scripts/reset-warehouse-only.ts --code MAIN-WH --dry-run
 *
 * Clear:
 *   npx tsx scripts/reset-warehouse-only.ts --code MAIN-WH --yes
 *   npx tsx scripts/reset-warehouse-only.ts --id clxxxxxxxx --yes
 */
import "dotenv/config";
import readline from "readline";
import { PrismaClient } from "../lib/generated/prisma/client";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const args = {
    list: false,
    dryRun: false,
    yes: false,
    code: undefined as string | undefined,
    id: undefined as string | undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") args.list = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--yes" || arg === "-y") args.yes = true;
    else if (arg === "--code") args.code = argv[++i];
    else if (arg === "--id") args.id = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  npx tsx scripts/reset-warehouse-only.ts --list
  npx tsx scripts/reset-warehouse-only.ts --code WAREHOUSE_CODE [--dry-run] [--yes]
  npx tsx scripts/reset-warehouse-only.ts --id WAREHOUSE_ID [--dry-run] [--yes]`);
      process.exit(0);
    }
  }

  return args;
}

async function resolveWarehouse(args: ReturnType<typeof parseArgs>) {
  if (args.id) {
    return prisma.warehouse.findUnique({ where: { id: args.id } });
  }
  if (args.code) {
    return prisma.warehouse.findUnique({ where: { code: args.code } });
  }
  return null;
}

async function countWarehouseData(warehouseId: string) {
  const [
    items,
    inbound,
    outbound,
    waste,
    branchTransfers,
    warehouseTransfers,
    recipes,
    batches,
  ] = await Promise.all([
    prisma.warehouseInventoryItem.count({ where: { warehouseId } }),
    prisma.warehouseInbound.count({ where: { warehouseId } }),
    prisma.warehouseOutboundLog.count({ where: { warehouseId } }),
    prisma.warehouseWasteLog.count({ where: { warehouseId } }),
    prisma.warehouseBranchTransfer.count({ where: { warehouseId } }),
    prisma.warehouseTransfer.count({
      where: { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] },
    }),
    prisma.productionRecipe.count({ where: { warehouseId } }),
    prisma.productionBatch.count({ where: { warehouseId } }),
  ]);

  return {
    items,
    inbound,
    outbound,
    waste,
    branchTransfers,
    warehouseTransfers,
    recipes,
    batches,
  };
}

async function clearWarehouse(warehouseId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.productionBatchConsumption.deleteMany({
      where: { batch: { warehouseId } },
    });
    await tx.productionBatch.deleteMany({ where: { warehouseId } });
    await tx.productionRecipeLine.deleteMany({
      where: { recipe: { warehouseId } },
    });
    await tx.productionRecipe.deleteMany({ where: { warehouseId } });
    await tx.warehouseBranchTransfer.deleteMany({ where: { warehouseId } });
    await tx.warehouseTransfer.deleteMany({
      where: { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] },
    });
    await tx.warehouseOutboundLog.deleteMany({ where: { warehouseId } });
    await tx.warehouseWasteLog.deleteMany({ where: { warehouseId } });
    await tx.warehouseInbound.deleteMany({ where: { warehouseId } });
    await tx.warehouseInventoryItem.deleteMany({ where: { warehouseId } });
  });
}

async function confirm(message: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${message} Type YES to continue: `, resolve);
  });
  rl.close();
  return answer.trim() === "YES";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, organizationId: true },
    });
    if (warehouses.length === 0) {
      console.log("No warehouses found.");
      return;
    }
    console.table(warehouses);
    return;
  }

  const warehouse = await resolveWarehouse(args);
  if (!warehouse) {
    console.error("Warehouse not found. Use --list to see codes/ids.");
    process.exit(1);
  }

  const counts = await countWarehouseData(warehouse.id);
  console.log(`Warehouse: ${warehouse.name} (${warehouse.code})`);
  console.log(counts);

  if (args.dryRun) {
    console.log("Dry run only — no data deleted.");
    return;
  }

  if (!args.yes) {
    const ok = await confirm(
      `This will permanently delete warehouse inventory and history for ${warehouse.code}.`,
    );
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  await clearWarehouse(warehouse.id);
  const after = await countWarehouseData(warehouse.id);
  console.log("Cleared. Remaining:", after);
  console.log(
    "Re-import with: npx tsx scripts/import-warehouse-csv.ts --code",
    warehouse.code,
    "./your-warehouse.csv",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
