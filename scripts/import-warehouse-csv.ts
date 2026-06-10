/**
 * Bulk import warehouse inventory from CSV (same format as Dashboard → Warehouse → Import).
 *
 * Usage:
 *   npx tsx scripts/import-warehouse-csv.ts --list
 *   npx tsx scripts/import-warehouse-csv.ts --code MAIN-WH ./warehouse.csv
 *   npx tsx scripts/import-warehouse-csv.ts --id clxxxxxxxx ./warehouse.csv
 *
 * Template columns: name, sku, category, unit, unitCost, currentStock, minStock,
 * reorderPoint, maxStock, itemStage, requiresCommissaryProcessing, allowDirectToBranch, isActive
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { parseWarehouseCSV } from "../lib/utils/bulk-import";
import { normalizeWarehouseMaxStock } from "../lib/inventory/branch-stock-limits";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const args = {
    list: false,
    code: undefined as string | undefined,
    id: undefined as string | undefined,
    csvPath: undefined as string | undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") args.list = true;
    else if (arg === "--code") args.code = argv[++i];
    else if (arg === "--id") args.id = argv[++i];
    else if (!arg.startsWith("-")) args.csvPath = arg;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  npx tsx scripts/import-warehouse-csv.ts --list
  npx tsx scripts/import-warehouse-csv.ts --code WAREHOUSE_CODE ./file.csv
  npx tsx scripts/import-warehouse-csv.ts --id WAREHOUSE_ID ./file.csv`);
      process.exit(0);
    }
  }

  return args;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

async function resolveWarehouse(args: ReturnType<typeof parseArgs>) {
  if (args.id) {
    return prisma.warehouse.findUnique({
      where: { id: args.id },
      select: { id: true, code: true, name: true, organizationId: true },
    });
  }
  if (args.code) {
    return prisma.warehouse.findUnique({
      where: { code: args.code },
      select: { id: true, code: true, name: true, organizationId: true },
    });
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    });
    console.table(warehouses);
    return;
  }

  if (!args.csvPath) {
    console.error("Missing CSV path. Example: --code MAIN-WH ./warehouse.csv");
    process.exit(1);
  }

  const warehouse = await resolveWarehouse(args);
  if (!warehouse) {
    console.error("Warehouse not found. Use --list to see codes/ids.");
    process.exit(1);
  }

  const csvPath = path.resolve(args.csvPath);
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCSVText(fs.readFileSync(csvPath, "utf8"));
  const items = parseWarehouseCSV(rows);
  if (items.length === 0) {
    console.error("No valid rows in CSV.");
    process.exit(1);
  }

  const categoryRows = await prisma.inventoryCategoryMaster.findMany({
    where: {
      organizationId: warehouse.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true, name: true, code: true },
  });

  const categoryLookup = new Map<string, string>();
  for (const category of categoryRows) {
    categoryLookup.set(category.id, category.id);
    categoryLookup.set(category.name.trim().toLowerCase(), category.id);
    categoryLookup.set(category.code.trim().toLowerCase(), category.id);
  }

  const skus = items.map((item) => item.sku);
  if (new Set(skus).size !== skus.length) {
    console.error("Duplicate SKUs in CSV.");
    process.exit(1);
  }

  const existing = await prisma.warehouseInventoryItem.findMany({
    where: { warehouseId: warehouse.id, sku: { in: skus } },
    select: { sku: true },
  });
  const existingSkus = new Set(existing.map((row) => row.sku));
  const newItems = items.filter((item) => !existingSkus.has(item.sku));
  const skipped = items.length - newItems.length;

  if (newItems.length === 0) {
    console.error(`All ${items.length} SKUs already exist in ${warehouse.code}. Clear warehouse first if replacing.`);
    process.exit(1);
  }

  const normalized = newItems.map((item) => ({
    ...item,
    categoryId: categoryLookup.get(item.categoryId.trim().toLowerCase()) || "",
  }));

  const invalid = normalized.filter((item) => !item.categoryId);
  if (invalid.length > 0) {
    console.error(
      "Unknown categories for:",
      invalid.map((item) => `${item.sku} (${item.categoryId || item.name})`).join(", "),
    );
    process.exit(1);
  }

  const created = await prisma.warehouseInventoryItem.createMany({
    data: normalized.map((item) => ({
      warehouseId: warehouse.id,
      name: item.name,
      sku: item.sku,
      categoryId: item.categoryId,
      unit: item.unit,
      unitCost: item.unitCost,
      currentStock: item.currentStock || 0,
      minStock: item.minStock || 0,
      reorderPoint: item.reorderPoint || 10,
      maxStock: normalizeWarehouseMaxStock(item.maxStock),
      itemStage: item.itemStage ?? "RAW",
      requiresCommissaryProcessing: item.requiresCommissaryProcessing ?? false,
      allowDirectToBranch: item.allowDirectToBranch ?? true,
      isActive: item.isActive ?? true,
    })),
  });

  console.log(`Warehouse: ${warehouse.name} (${warehouse.code})`);
  console.log(`Created: ${created.count}, skipped existing SKUs: ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
