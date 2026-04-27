#!/usr/bin/env node
/**
 * Auto-confirm any Supabase users whose email_confirmed_at is null.
 * Useful during the pilot while we wait for Resend/custom SMTP.
 *
 *   node --env-file=.env.local scripts/confirm-pending-users.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supa.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (error) throw error;

let confirmed = 0;
for (const u of data.users) {
  if (u.email_confirmed_at) continue;
  const r = await supa.auth.admin.updateUserById(u.id, { email_confirm: true });
  if (!r.error) {
    console.log("✓ confirmed:", u.email);
    confirmed++;
  } else {
    console.log("✗ failed:", u.email, r.error.message);
  }
}
console.log(`\nDone. ${confirmed} user(s) confirmed.`);
