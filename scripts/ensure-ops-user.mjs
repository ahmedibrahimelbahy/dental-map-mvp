#!/usr/bin/env node
/**
 * Ensure an ops@dentalmap.app user exists with role=ops and a known password.
 * Idempotent: re-running resets the password to the canonical value so we
 * always have a working credential.
 *
 *   node --env-file=.env.local scripts/ensure-ops-user.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OPS_EMAIL = "ops@dentalmap.app";
const OPS_PASSWORD = "OpsAdmin2026!";
const OPS_NAME = "Dental Map Ops";
const OPS_PHONE = "+20 100 000 0002";

const { data: list } = await supa.auth.admin.listUsers({ perPage: 200 });
let user = list.users.find((u) => u.email === OPS_EMAIL);

if (!user) {
  const { data, error } = await supa.auth.admin.createUser({
    email: OPS_EMAIL,
    password: OPS_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: OPS_NAME, phone: OPS_PHONE },
  });
  if (error) {
    console.error("❌ createUser failed:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`✓ Created auth user ${OPS_EMAIL}`);
} else {
  await supa.auth.admin.updateUserById(user.id, {
    password: OPS_PASSWORD,
    user_metadata: { full_name: OPS_NAME, phone: OPS_PHONE },
  });
  console.log(`✓ Reset password on existing user ${OPS_EMAIL}`);
}

// Profile: set role to 'ops' (handle_new_user trigger creates the row but
// defaults role to 'patient'; we need to flip it).
const { error: pErr } = await supa
  .from("profiles")
  .update({ role: "ops", full_name: OPS_NAME, phone: OPS_PHONE })
  .eq("id", user.id);
if (pErr) {
  console.error("❌ profile update failed:", pErr.message);
  process.exit(1);
}
console.log(`✓ Profile role set to 'ops'`);

console.log("\n" + "─".repeat(60));
console.log("OPS CREDENTIALS — sign in at https://dentalmap.app/en/signin");
console.log("─".repeat(60));
console.log(`  Email:    ${OPS_EMAIL}`);
console.log(`  Password: ${OPS_PASSWORD}`);
console.log("─".repeat(60));
console.log(`  Open the admin console at /en/admin or /ar/admin once signed in.`);
console.log("─".repeat(60));
