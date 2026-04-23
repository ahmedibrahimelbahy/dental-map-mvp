#!/usr/bin/env node
/**
 * One-shot schema migration runner.
 * Reads db/schema.sql and executes it against the Supabase Postgres.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate.mjs
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL   — used to derive the project ref
 *   SUPABASE_DB_PASSWORD       — the DB password from Supabase > Project Settings > Database
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
if (!password) throw new Error("SUPABASE_DB_PASSWORD not set");

const ref = new URL(url).hostname.split(".")[0];

// Try pooler first (IPv4, session mode, port 5432). Supabase uses region-specific
// pooler hostnames. We try common regions; the connect will tell us if wrong.
const poolerRegions = [
  "eu-central-1",
  "eu-west-2",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "ap-southeast-1",
];
const candidates = [
  // Direct (works on IPv6-capable hosts)
  `postgres://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
  ...poolerRegions.map(
    (r) =>
      `postgres://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${r}.pooler.supabase.com:5432/postgres`
  ),
];

async function tryConnect() {
  for (const connString of candidates) {
    const host = new URL(connString).host.replace(/:.*$/, "");
    process.stdout.write(`→ trying ${host} ... `);
    const client = new Client({
      connectionString: connString,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      console.log("connected ✓");
      return client;
    } catch (err) {
      console.log(`failed (${err.code || "?"}) — ${err.message.split("\n")[0]}`);
      try { await client.end(); } catch {}
    }
  }
  throw new Error("Could not connect to any candidate host");
}

const schemaPath = resolve(__dirname, "..", "db", "schema.sql");
const sql = await readFile(schemaPath, "utf8");

console.log(`📄 Loaded ${sql.length.toLocaleString()} bytes from db/schema.sql`);
console.log(`🎯 Project ref: ${ref}`);

const client = await tryConnect();

try {
  console.log("🚀 Executing schema...");
  await client.query(sql);
  console.log("✅ Schema applied successfully.");

  // Quick sanity: count seeded rows
  const { rows } = await client.query(
    `select 'specialties' as t, count(*)::int as n from specialties
     union all select 'areas', count(*)::int from areas
     union all select 'insurance_providers', count(*)::int from insurance_providers
     order by t`
  );
  console.log("📊 Seed counts:");
  for (const r of rows) console.log(`   ${r.t.padEnd(22)} ${r.n}`);
} catch (err) {
  console.error("❌ Schema error:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
