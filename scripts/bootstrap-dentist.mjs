#!/usr/bin/env node
/**
 * One-shot: promote a user to dentist_admin and seed a test clinic + dentist
 * + the joins so they can use the dashboard end-to-end.
 *
 * Usage:
 *   node --env-file=.env.local scripts/bootstrap-dentist.mjs <email>
 *
 * Idempotent: safe to re-run.
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/bootstrap-dentist.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supa = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Find the user by email (paginate if you have many)
  const { data: list, error: listErr } = await supa.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;
  const user = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    console.error(`No auth user with email ${email}. Sign up at /en/signup first.`);
    process.exit(1);
  }
  console.log(`✓ Found auth user  ${user.id}  (${user.email})`);

  // 2. Promote profile to dentist_admin
  const { error: roleErr } = await supa
    .from("profiles")
    .update({ role: "dentist_admin" })
    .eq("id", user.id);
  if (roleErr) throw roleErr;
  console.log("✓ Promoted profile role → dentist_admin");

  // 3. Upsert clinic
  const clinicSlug = "dental-map-pilot-clinic";
  const { data: area } = await supa
    .from("areas")
    .select("id")
    .eq("slug", "zamalek")
    .maybeSingle();

  const { data: existingClinic } = await supa
    .from("clinics")
    .select("id")
    .eq("slug", clinicSlug)
    .maybeSingle();

  let clinicId = existingClinic?.id;
  if (!clinicId) {
    const { data: newClinic, error: cErr } = await supa
      .from("clinics")
      .insert({
        slug: clinicSlug,
        name_en: "Dental Map Pilot Clinic",
        name_ar: "عيادة دنتال ماب التجريبية",
        area_id: area?.id ?? null,
        address_en: "Zamalek, Cairo",
        address_ar: "الزمالك، القاهرة",
        is_published: true,
      })
      .select("id")
      .single();
    if (cErr) throw cErr;
    clinicId = newClinic.id;
    console.log(`✓ Created clinic    ${clinicId}`);
  } else {
    console.log(`✓ Clinic exists     ${clinicId}`);
  }

  // 4. Upsert dentist
  const dentistSlug = "dr-test-dentist";
  const { data: existingDentist } = await supa
    .from("dentists")
    .select("id")
    .eq("slug", dentistSlug)
    .maybeSingle();

  let dentistId = existingDentist?.id;
  if (!dentistId) {
    const { data: newD, error: dErr } = await supa
      .from("dentists")
      .insert({
        slug: dentistSlug,
        name_en: "Dr. Test Dentist",
        name_ar: "د. تجربة",
        title: "specialist",
        years_experience: 5,
        is_published: true,
      })
      .select("id")
      .single();
    if (dErr) throw dErr;
    dentistId = newD.id;
    console.log(`✓ Created dentist   ${dentistId}`);
  } else {
    console.log(`✓ Dentist exists    ${dentistId}`);
  }

  // 5. clinic_dentists link
  const { data: existingCD } = await supa
    .from("clinic_dentists")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("dentist_id", dentistId)
    .maybeSingle();

  let cdId = existingCD?.id;
  if (!cdId) {
    const { data: newCD, error: cdErr } = await supa
      .from("clinic_dentists")
      .insert({
        clinic_id: clinicId,
        dentist_id: dentistId,
        fee_egp: 300,
        slot_minutes: 30,
        working_hours: [
          { day: 0, start: "10:00", end: "18:00" },
          { day: 1, start: "10:00", end: "18:00" },
          { day: 2, start: "10:00", end: "18:00" },
          { day: 3, start: "10:00", end: "18:00" },
          { day: 4, start: "10:00", end: "18:00" },
        ],
        is_active: true,
      })
      .select("id")
      .single();
    if (cdErr) throw cdErr;
    cdId = newCD.id;
    console.log(`✓ Linked clinic+dentist  ${cdId}`);
  } else {
    console.log(`✓ Link exists       ${cdId}`);
  }

  // 6. Add user as clinic admin
  await supa
    .from("clinic_admins")
    .upsert({ clinic_id: clinicId, profile_id: user.id });
  console.log("✓ Added user as clinic_admin");

  console.log(
    "\n✅ Bootstrap complete. Sign in, open /en/dashboard, click Connect Google Calendar."
  );
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
