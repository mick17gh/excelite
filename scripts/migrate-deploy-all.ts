#!/usr/bin/env npx tsx
/**
 * Run `prisma migrate deploy` against multiple direct database URLs.
 * Schema only — does not copy data. Use db:clone for full copies.
 */

import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

type CliArgs = {
  dryRun: boolean;
  configPath: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    configPath: join(process.cwd(), "scripts/migrate-deploy-all.databases.txt"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--config") {
      args.configPath = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function isPoolerUrl(url: string) {
  const parsed = new URL(url);
  return (
    parsed.hostname.toLowerCase().includes("-pooler") ||
    parsed.searchParams.get("pgbouncer") === "true"
  );
}

function parseConfig(path: string) {
  if (!existsSync(path)) {
    fail(`Config not found: ${path}\nCopy scripts/migrate-deploy-all.databases.example.txt first.`);
  }

  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line, index) => {
      const pipe = line.indexOf("|");
      if (pipe === -1) {
        return { label: `db-${index + 1}`, url: line };
      }
      return {
        label: line.slice(0, pipe).trim(),
        url: line.slice(pipe + 1).trim(),
      };
    });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = parseConfig(args.configPath);

  if (targets.length === 0) {
    fail("No database URLs found in config.");
  }

  info(`Found ${targets.length} target(s) in ${args.configPath}`);

  for (const target of targets) {
    if (isPoolerUrl(target.url)) {
      fail(`${target.label}: pooler URL not allowed — use a direct endpoint.`);
    }

    info(`\n→ ${target.label}`);
    if (args.dryRun) {
      info("  (dry run — skipping migrate deploy)");
      continue;
    }

    const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      encoding: "utf8",
      stdio: "inherit",
      env: {
        ...process.env,
        DIRECT_URL: target.url,
        DATABASE_URL: target.url,
      },
    });

    if (result.status !== 0) {
      fail(`migrate deploy failed for ${target.label}`);
    }
  }

  info("\nAll migrations applied.");
}

function info(message: string) {
  console.log(message);
}

main();
