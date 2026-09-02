#!/usr/bin/env npx tsx
/**
 * Full Postgres database clone (schema + data + sequences + _prisma_migrations).
 *
 * Usage:
 *   npm run db:clone -- --dry-run --target "postgresql://..."
 *   npm run db:clone -- --target "postgresql://..." --wipe-target
 *
 * Source resolution: --source → DIRECT_URL → DATABASE_URL
 */

import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const VERIFY_TABLES = [
  "user",
  "organization",
  "branch",
  "customer",
  "order",
  "menu_item",
  "inventory_item",
  "_prisma_migrations",
] as const;

const DUMP_PREFIX = "excelite-clone";
const TMP_DIR = join(process.cwd(), "tmp");

type CliArgs = {
  dryRun: boolean;
  wipeTarget: boolean;
  keepDump: boolean;
  source?: string;
  target?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    wipeTarget: false,
    keepDump: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--wipe-target") args.wipeTarget = true;
    else if (arg === "--keep-dump") args.keepDump = true;
    else if (arg === "--source") {
      args.source = argv[i + 1];
      i += 1;
    } else if (arg === "--target") {
      args.target = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function info(message: string) {
  console.log(message);
}

function run(command: string, commandArgs: string[], options?: { allowFailure?: boolean }) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0 && !options?.allowFailure) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    fail(
      `Command failed: ${command} ${commandArgs.join(" ")}\n${stderr || stdout || "(no output)"}`,
    );
  }

  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function requireCliTool(name: string) {
  const result = spawnSync(name, ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    fail(
      `${name} not found on PATH. Install PostgreSQL client tools (e.g. brew install libpq).`,
    );
  }
  return (result.stdout || result.stderr || "").split("\n")[0].trim();
}

function parseDatabaseUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail(`Invalid database URL: ${url}`);
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    fail(`Expected postgresql:// URL, got protocol "${parsed.protocol}"`);
  }

  const host = parsed.hostname;
  const port = parsed.port || "5432";
  const database = parsed.pathname.replace(/^\//, "").split("?")[0];
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);

  if (!host || !database || !user) {
    fail("Database URL must include user, host, and database name.");
  }

  return { host, port, database, user, password, url };
}

function isPoolerUrl(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const pgbouncer = parsed.searchParams.get("pgbouncer");
  return host.includes("-pooler") || pgbouncer === "true";
}

function assertDirectUrl(label: string, url: string) {
  if (isPoolerUrl(url)) {
    fail(
      `${label} appears to be a pooler URL. Use a direct Postgres endpoint for clone/migrate (no -pooler host, no pgbouncer=true).`,
    );
  }
}

function sameDatabase(a: string, b: string) {
  const left = parseDatabaseUrl(a);
  const right = parseDatabaseUrl(b);
  return (
    left.host === right.host &&
    left.port === right.port &&
    left.database === right.database &&
    left.user === right.user
  );
}

function psqlQuery(url: string, sql: string) {
  const result = run("psql", [url, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], {
    allowFailure: true,
  });
  if (result.status !== 0) {
    fail(`psql query failed:\n${sql}\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function getDatabaseStats(url: string) {
  const version = psqlQuery(url, "SELECT version();");
  const size = psqlQuery(url, "SELECT pg_size_pretty(pg_database_size(current_database()));");
  const tableCount = psqlQuery(
    url,
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';",
  );
  return { version, size, tableCount };
}

function getRowCount(url: string, table: string) {
  return Number(psqlQuery(url, `SELECT count(*) FROM "${table}";`));
}

function tableExists(url: string, table: string) {
  const count = psqlQuery(
    url,
    `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}';`,
  );
  return Number(count) > 0;
}

function wipeTargetSchema(url: string) {
  info("Wiping target public schema...");
  psqlQuery(url, "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
}

function verifyClone(sourceUrl: string, targetUrl: string) {
  info("\nVerifying clone...");

  const sourceTables = Number(
    psqlQuery(
      sourceUrl,
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';",
    ),
  );
  const targetTables = Number(
    psqlQuery(
      targetUrl,
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';",
    ),
  );

  if (sourceTables !== targetTables) {
    fail(`Table count mismatch: source=${sourceTables}, target=${targetTables}`);
  }
  info(`  ✓ Public table count matches (${targetTables})`);

  let verified = 0;
  for (const table of VERIFY_TABLES) {
    if (!tableExists(sourceUrl, table)) {
      info(`  · Skipping ${table} (not present on source)`);
      continue;
    }
    if (!tableExists(targetUrl, table)) {
      fail(`Target missing table "${table}"`);
    }

    const sourceRows = getRowCount(sourceUrl, table);
    const targetRows = getRowCount(targetUrl, table);
    if (sourceRows !== targetRows) {
      fail(`Row count mismatch for "${table}": source=${sourceRows}, target=${targetRows}`);
    }
    info(`  ✓ ${table}: ${targetRows.toLocaleString()} rows`);
    verified += 1;
  }

  if (verified === 0) {
    fail("No VERIFY_TABLES were found on source — update VERIFY_TABLES in scripts/db-clone.ts");
  }
}

function formatTimestamp(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUrl =
    args.source ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? undefined;
  const targetUrl = args.target;

  if (!sourceUrl) {
    fail("No source URL. Set DIRECT_URL or DATABASE_URL, or pass --source.");
  }
  if (!targetUrl) {
    fail("No target URL. Pass --target \"postgresql://...\".");
  }

  assertDirectUrl("Source", sourceUrl);
  assertDirectUrl("Target", targetUrl);

  if (sameDatabase(sourceUrl, targetUrl)) {
    fail("Source and target resolve to the same database. Aborting.");
  }

  const pgDumpVersion = requireCliTool("pg_dump");
  const pgRestoreVersion = requireCliTool("pg_restore");
  const psqlVersion = requireCliTool("psql");
  info(`pg_dump: ${pgDumpVersion}`);
  info(`pg_restore: ${pgRestoreVersion}`);
  info(`psql: ${psqlVersion}`);

  const source = parseDatabaseUrl(sourceUrl);
  const target = parseDatabaseUrl(targetUrl);

  info("\nSource:");
  info(`  ${source.user}@${source.host}:${source.port}/${source.database}`);
  const sourceStats = getDatabaseStats(sourceUrl);
  info(`  ${sourceStats.version}`);
  info(`  Size: ${sourceStats.size}`);
  info(`  Public tables: ${sourceStats.tableCount}`);

  info("\nTarget:");
  info(`  ${target.user}@${target.host}:${target.port}/${target.database}`);
  const targetStats = getDatabaseStats(targetUrl);
  info(`  ${targetStats.version}`);
  info(`  Size: ${targetStats.size}`);
  info(`  Public tables: ${targetStats.tableCount}`);

  if (args.dryRun) {
    info("\nDry run complete — no dump/restore performed.");
    process.exit(0);
  }

  if (Number(targetStats.tableCount) > 0 && !args.wipeTarget) {
    fail(
      "Target already has tables. Re-run with --wipe-target to drop public schema before restore.",
    );
  }

  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }

  const dumpPath = join(TMP_DIR, `${DUMP_PREFIX}-${formatTimestamp(new Date())}.dump`);
  info(`\nDumping source → ${dumpPath}`);

  run("pg_dump", [
    sourceUrl,
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--file",
    dumpPath,
  ]);

  const dumpSize = statSync(dumpPath).size;
  info(`  Dump size: ${(dumpSize / 1024 / 1024).toFixed(2)} MB`);

  if (args.wipeTarget) {
    wipeTargetSchema(targetUrl);
  }

  info("\nRestoring to target...");
  const restore = run(
    "pg_restore",
    [
      "--dbname",
      targetUrl,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
      dumpPath,
    ],
    { allowFailure: true },
  );

  if (restore.status !== 0) {
    console.error(restore.stderr || restore.stdout);
    fail("pg_restore failed.");
  }

  verifyClone(sourceUrl, targetUrl);

  if (!args.keepDump) {
    rmSync(dumpPath, { force: true });
    info(`\nRemoved dump file: ${dumpPath}`);
  } else {
    info(`\nKept dump file: ${dumpPath}`);
  }

  info("\nClone complete.");
  info("Next steps:");
  info("  1. Point app DATABASE_URL at the target pooled URL.");
  info("  2. Keep DIRECT_URL on the target direct endpoint for migrations/clone.");
  info("  3. Do not run prisma migrate deploy — _prisma_migrations was copied.");
  info("  4. Restart the app and smoke-test auth + core flows.");
}

main();
