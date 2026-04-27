#!/usr/bin/env node
/**
 * Apply a single SQL migration file to the Supabase Postgres.
 *
 * Usage:
 *   node --env-file=.env.local scripts/run-migration.mjs db/migrations/002_calendar_mode.sql
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <path/to/migration.sql>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!url || !password) throw new Error("Supabase env vars not set");
const ref = new URL(url).hostname.split(".")[0];

const ALL_REGIONS = [
  "eu-west-2",
  "eu-west-1",
  "eu-central-1",
  "eu-north-1",
  "eu-west-3",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ca-central-1",
  "sa-east-1",
];
const PREFIXES = ["aws-0", "aws-1"];
const candidates = [
  `postgres://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
  ...PREFIXES.flatMap((p) =>
    ALL_REGIONS.map(
      (r) =>
        `postgres://postgres.${ref}:${encodeURIComponent(password)}@${p}-${r}.pooler.supabase.com:5432/postgres`
    )
  ),
];

const sql = await readFile(resolve(process.cwd(), file), "utf8");
console.log(`📄 Loaded ${sql.length} bytes from ${file}`);

const { Client } = pg;
let client;
for (const cs of candidates) {
  const host = new URL(cs).host.replace(/:.*$/, "");
  process.stdout.write(`→ ${host} ... `);
  client = new Client({
    connectionString: cs,
    connectionTimeoutMillis: 4000,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log("ok");
    break;
  } catch (e) {
    console.log(`fail (${e.code || e.message.split("\n")[0]})`);
    try { await client.end(); } catch {}
    client = null;
  }
}
if (!client) {
  console.error("❌ No host succeeded");
  process.exit(1);
}

try {
  await client.query(sql);
  console.log("✅ Migration applied.");
} catch (e) {
  console.error("❌", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
