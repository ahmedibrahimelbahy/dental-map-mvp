#!/usr/bin/env node
/**
 * Clean up test/placeholder data from the database:
 *   1. List all existing clinics
 *   2. Keep the 12 Airtable-imported clinics + create ONE new "test-clinic"
 *   3. Delete everything else (clinics, their dentists, clinic_admins, etc.)
 *   4. Delete orphaned dentists (no remaining clinic_dentists links)
 *   5. Create a fresh test admin user with known credentials
 *
 * Usage:
 *   node --env-file=.env.local scripts/cleanup-test-data.mjs
 *   node --env-file=.env.local scripts/cleanup-test-data.mjs --dry-run    # see what would happen, no writes
 */
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// The 12 real clinics imported from the Airtable submission CSV.
// Anything NOT in this set (and not the test clinic) is considered placeholder.
const KEEP_AIRTABLE_SLUGS = new Set([
  "smile-craft-dental-clinic",
  "flawless-dental-clinic-by-dr-mirna-elmenshawy",
  "modern-dental-clinic",
  "mos-clinic",
  "elan-dental-clinic",
  "nuvo-dental-clinic",
  "elbialy-dental-clinic",
  "sabet-dental-clinic",
  "optima-dental-and-maxillofacial-care",
  "waly-dental-clinic",
  "aurea-dental-clinic",
  "dr-omar-dental-clinic",
]);

const TEST_CLINIC_SLUG = "test-clinic";
const TEST_ADMIN_EMAIL = "test@dentalmap.app";
const TEST_ADMIN_PASSWORD = "TestClinic2026!";
const TEST_DENTIST_NAME = "Dr. Test Dentist";

function tag() {
  return DRY_RUN ? "[DRY-RUN] " : "";
}

/* ───────────────────────── 1. Snapshot current state ───────────────────────── */

const { data: allClinics } = await supa
  .from("clinics")
  .select("id, slug, name_en, is_published, verification_status, created_at")
  .order("created_at");

console.log(`\n📊 Current database state: ${allClinics?.length ?? 0} clinics\n`);
const toDelete = [];
const toKeep = [];
for (const c of allClinics ?? []) {
  if (KEEP_AIRTABLE_SLUGS.has(c.slug) || c.slug === TEST_CLINIC_SLUG) {
    toKeep.push(c);
  } else {
    toDelete.push(c);
  }
}
console.log(`  ✓ Keep (${toKeep.length}):`);
for (const c of toKeep) console.log(`     - ${c.slug.padEnd(50)} ${c.name_en}`);
console.log(`\n  ✗ Delete (${toDelete.length}):`);
for (const c of toDelete) console.log(`     - ${c.slug.padEnd(50)} ${c.name_en}`);

if (toDelete.length === 0) {
  console.log("\n✅ Nothing to delete.");
}

/* ───────────────────────── 2. Delete placeholder clinics ───────────────────── */

if (toDelete.length > 0) {
  const idsToDelete = toDelete.map((c) => c.id);

  console.log(`\n🧹 ${tag()}Deleting ${idsToDelete.length} placeholder clinic(s)...`);

  // Collect dentist IDs linked to these clinics — we'll orphan-prune after.
  const { data: cdRows } = await supa
    .from("clinic_dentists")
    .select("dentist_id")
    .in("clinic_id", idsToDelete);
  const dentistIdsToCheck = Array.from(new Set((cdRows ?? []).map((r) => r.dentist_id)));

  if (!DRY_RUN) {
    // Order matters because of FK cascades; doing children first is safer
    // even though most are ON DELETE CASCADE.
    const { error: apptErr } = await supa
      .from("appointments")
      .delete()
      .in("clinic_dentist_id", (cdRows ?? []).map((_, i) => i)); // safety no-op shape

    // Better: pull clinic_dentist ids first, then nuke appointments by id
    const { data: cdIds } = await supa
      .from("clinic_dentists")
      .select("id")
      .in("clinic_id", idsToDelete);
    if (cdIds && cdIds.length > 0) {
      await supa.from("appointments").delete().in("clinic_dentist_id", cdIds.map((r) => r.id));
    }

    await supa.from("clinic_admins").delete().in("clinic_id", idsToDelete);
    await supa.from("clinic_insurance").delete().in("clinic_id", idsToDelete);
    await supa.from("clinic_dentists").delete().in("clinic_id", idsToDelete);
    const { error: cErr } = await supa.from("clinics").delete().in("id", idsToDelete);
    if (cErr) {
      console.error("  ❌ clinic delete failed:", cErr.message);
      process.exit(1);
    }
    console.log(`  ✓ Clinics deleted.`);
  }

  /* ─── Orphaned dentists (no remaining clinic_dentists rows) ─── */
  if (dentistIdsToCheck.length > 0) {
    const { data: stillLinked } = await supa
      .from("clinic_dentists")
      .select("dentist_id")
      .in("dentist_id", dentistIdsToCheck);
    const linkedSet = new Set((stillLinked ?? []).map((r) => r.dentist_id));
    const orphans = dentistIdsToCheck.filter((id) => !linkedSet.has(id));
    console.log(`\n🧹 ${tag()}${orphans.length} orphan dentist(s) to delete`);
    if (orphans.length > 0 && !DRY_RUN) {
      await supa.from("dentist_specialties").delete().in("dentist_id", orphans);
      await supa.from("dentist_calendars").delete().in("dentist_id", orphans);
      await supa.from("dentists").delete().in("id", orphans);
      console.log(`  ✓ Orphan dentists deleted.`);
    }
  }
}

/* ─────────────────── 3. Ensure the test clinic + admin exist ───────────────── */

console.log(`\n🧪 ${tag()}Ensuring test clinic + admin exist...`);

if (DRY_RUN) {
  console.log(`  Would create:`);
  console.log(`     clinic slug:   ${TEST_CLINIC_SLUG}`);
  console.log(`     admin email:   ${TEST_ADMIN_EMAIL}`);
  console.log(`     admin password: ${TEST_ADMIN_PASSWORD}`);
  console.log(`     dentist:       ${TEST_DENTIST_NAME}`);
  process.exit(0);
}

// 3a. Resolve Zamalek area (tier 1)
const { data: zamalek } = await supa
  .from("areas")
  .select("id, tier")
  .eq("slug", "zamalek")
  .single();
if (!zamalek) throw new Error("Zamalek area missing — seed schema.sql first");

// 3b. Test admin user — create or fetch
const { data: userList } = await supa.auth.admin.listUsers({ perPage: 200 });
let testUser = userList.users.find((u) => u.email === TEST_ADMIN_EMAIL);
if (!testUser) {
  const { data, error } = await supa.auth.admin.createUser({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Test Clinic Admin", phone: "+20 100 000 0001" },
  });
  if (error) {
    console.error("  ❌ createUser failed:", error.message);
    process.exit(1);
  }
  testUser = data.user;
  console.log(`  ✓ Created auth user ${TEST_ADMIN_EMAIL}`);
} else {
  // Reset the password so the credential is always known/current
  await supa.auth.admin.updateUserById(testUser.id, {
    password: TEST_ADMIN_PASSWORD,
    user_metadata: { full_name: "Test Clinic Admin", phone: "+20 100 000 0001" },
  });
  console.log(`  ✓ Reset password on existing user ${TEST_ADMIN_EMAIL}`);
}

// 3c. Profile row — make sure role is dentist_admin
await supa
  .from("profiles")
  .update({ role: "dentist_admin", full_name: "Test Clinic Admin", phone: "+20 100 000 0001" })
  .eq("id", testUser.id);

// 3d. Test clinic — upsert by slug
const clinicRow = {
  slug: TEST_CLINIC_SLUG,
  name_en: "Test Dental Clinic",
  name_ar: "عيادة تجريبية",
  area_id: zamalek.id,
  address_en: "Test Address, Zamalek, Cairo",
  address_ar: "عنوان تجريبي، الزمالك، القاهرة",
  phone: "+20 100 000 0001",
  whatsapp: "+20 100 000 0001",
  lat: 30.0617,
  lng: 31.2189,
  is_published: true,
  subscription_tier: 1,
  subscription_package: "growth",
  subscription_monthly_egp: 1499,
  consultation_validity_months: 3,
  verification_status: "approved",
  verification_submitted_at: new Date().toISOString(),
};
const { data: existing } = await supa
  .from("clinics")
  .select("id")
  .eq("slug", TEST_CLINIC_SLUG)
  .maybeSingle();
let testClinicId;
if (existing) {
  await supa.from("clinics").update(clinicRow).eq("id", existing.id);
  testClinicId = existing.id;
  console.log(`  ✓ Updated test clinic`);
} else {
  const { data, error } = await supa.from("clinics").insert(clinicRow).select("id").single();
  if (error) throw new Error(`test clinic insert failed: ${error.message}`);
  testClinicId = data.id;
  console.log(`  ✓ Inserted test clinic`);
}

// 3e. Link the test admin to the test clinic (idempotent)
await supa.from("clinic_admins").delete().eq("clinic_id", testClinicId);
await supa.from("clinic_admins").insert({ clinic_id: testClinicId, profile_id: testUser.id });

// 3f. Test dentist — one bookable dentist
const { data: existingDentist } = await supa
  .from("dentists")
  .select("id")
  .eq("slug", "dr-test-dentist")
  .maybeSingle();
let testDentistId;
const dentistRow = {
  slug: "dr-test-dentist",
  name_en: TEST_DENTIST_NAME,
  name_ar: "د. الاختبار",
  title: "specialist",
  years_experience: 8,
  bio_en: "Test dentist for QA. Books to the test clinic.",
  bio_ar: "طبيب اختباري للتجربة على عيادة الاختبار.",
  is_published: true,
};
if (existingDentist) {
  await supa.from("dentists").update(dentistRow).eq("id", existingDentist.id);
  testDentistId = existingDentist.id;
} else {
  const { data, error } = await supa.from("dentists").insert(dentistRow).select("id").single();
  if (error) throw new Error(`test dentist insert failed: ${error.message}`);
  testDentistId = data.id;
}
console.log(`  ✓ Test dentist ready`);

// 3g. Clinic-dentist link with default working hours
const DEFAULT_WORKING_HOURS = [0, 1, 2, 3, 4].map((day) => ({
  day,
  start: "10:00",
  end: "18:00",
  breaks: [{ start: "14:00", end: "15:00" }],
}));
await supa.from("clinic_dentists").delete().eq("clinic_id", testClinicId);
await supa.from("clinic_dentists").insert({
  clinic_id: testClinicId,
  dentist_id: testDentistId,
  fee_egp: 500,
  slot_minutes: 30,
  working_hours: DEFAULT_WORKING_HOURS,
  is_active: true,
});

// 3h. Specialty links
const { data: specRows } = await supa
  .from("specialties")
  .select("id, slug")
  .in("slug", ["adult", "cosmetic"]);
await supa.from("dentist_specialties").delete().eq("dentist_id", testDentistId);
if (specRows && specRows.length) {
  await supa.from("dentist_specialties").insert(
    specRows.map((s) => ({ dentist_id: testDentistId, specialty_id: s.id }))
  );
}

console.log("\n✅ Done.\n");
console.log("─".repeat(60));
console.log("TEST CREDENTIALS — sign in at https://dentalmap.app/en/signin");
console.log("─".repeat(60));
console.log(`  Email:    ${TEST_ADMIN_EMAIL}`);
console.log(`  Password: ${TEST_ADMIN_PASSWORD}`);
console.log("─".repeat(60));
console.log(`  Clinic:   Test Dental Clinic (slug: ${TEST_CLINIC_SLUG})`);
console.log(`  Area:     Zamalek (Tier 1)`);
console.log(`  Dentist:  ${TEST_DENTIST_NAME} — 500 EGP / consultation`);
console.log("─".repeat(60));
