#!/usr/bin/env node
/**
 * Delete a single clinic by slug, cascading every related row:
 *   appointments → clinic_dentists → clinic_insurance → clinic_admins → clinics
 * Plus pruning any orphan dentists (dentists with no remaining clinic_dentists links).
 *
 *   node --env-file=.env.local scripts/delete-clinic.mjs <slug>
 *
 * Example:
 *   node --env-file=.env.local scripts/delete-clinic.mjs mos-clinic
 */
import { createClient } from "@supabase/supabase-js";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/delete-clinic.mjs <slug>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: clinic } = await supa
  .from("clinics")
  .select("id, name_en")
  .eq("slug", slug)
  .maybeSingle();

if (!clinic) {
  console.error(`❌ No clinic with slug "${slug}"`);
  process.exit(1);
}
console.log(`🎯 Deleting "${clinic.name_en}" (${slug})`);

// Collect dentist IDs we'll need to check for orphan status after the cascade
const { data: cdRows } = await supa
  .from("clinic_dentists")
  .select("id, dentist_id")
  .eq("clinic_id", clinic.id);
const cdIds = (cdRows ?? []).map((r) => r.id);
const dentistIdsTouched = Array.from(new Set((cdRows ?? []).map((r) => r.dentist_id)));

// Cascade in order
if (cdIds.length > 0) {
  await supa.from("appointments").delete().in("clinic_dentist_id", cdIds);
  console.log(`  ✓ Appointments removed (${cdIds.length} clinic_dentist rows considered)`);
}
await supa.from("clinic_insurance").delete().eq("clinic_id", clinic.id);
await supa.from("clinic_admins").delete().eq("clinic_id", clinic.id);
await supa.from("clinic_dentists").delete().eq("clinic_id", clinic.id);
console.log(`  ✓ Join tables cleaned`);

const { error: cErr } = await supa.from("clinics").delete().eq("id", clinic.id);
if (cErr) {
  console.error("❌ clinic delete failed:", cErr.message);
  process.exit(1);
}
console.log(`  ✓ Clinic row deleted`);

// Prune orphan dentists
if (dentistIdsTouched.length > 0) {
  const { data: stillLinked } = await supa
    .from("clinic_dentists")
    .select("dentist_id")
    .in("dentist_id", dentistIdsTouched);
  const linkedSet = new Set((stillLinked ?? []).map((r) => r.dentist_id));
  const orphans = dentistIdsTouched.filter((id) => !linkedSet.has(id));
  if (orphans.length > 0) {
    await supa.from("dentist_specialties").delete().in("dentist_id", orphans);
    await supa.from("dentist_calendars").delete().in("dentist_id", orphans);
    await supa.from("dentists").delete().in("id", orphans);
    console.log(`  ✓ Pruned ${orphans.length} orphan dentist(s)`);
  } else {
    console.log(`  ✓ All dentists still linked elsewhere, none pruned`);
  }
}

console.log(`\n✅ Done.`);
