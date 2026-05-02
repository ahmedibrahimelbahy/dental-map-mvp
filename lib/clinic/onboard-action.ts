"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardInput = {
  clinic: {
    nameEn: string;
    nameAr: string;
    addressEn?: string;
    addressAr?: string;
    areaSlug: string;
    phone: string;
    whatsapp?: string;
  };
  dentists: Array<{
    nameEn: string;
    nameAr: string;
    title: "professor" | "consultant" | "specialist" | "resident";
    yearsExp: number | null;
    feeEgp: number;
    specialties: string[]; // slugs
    bioEn?: string;
    bioAr?: string;
  }>;
};

export type OnboardResult =
  | { ok: true; clinicId: string; clinicSlug: string }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "invalid"
        | "slug_taken"
        | "no_area"
        | "server_error";
      message?: string;
    };

const DEFAULT_WORKING_HOURS = [
  // Sunday (0) → Thursday (4): 10–18 with a 14–15 lunch
  { day: 0, start: "10:00", end: "18:00", breaks: [{ start: "14:00", end: "15:00" }] },
  { day: 1, start: "10:00", end: "18:00", breaks: [{ start: "14:00", end: "15:00" }] },
  { day: 2, start: "10:00", end: "18:00", breaks: [{ start: "14:00", end: "15:00" }] },
  { day: 3, start: "10:00", end: "18:00", breaks: [{ start: "14:00", end: "15:00" }] },
  { day: 4, start: "10:00", end: "18:00", breaks: [{ start: "14:00", end: "15:00" }] },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

async function uniqueSlug(
  table: "clinics" | "dentists",
  base: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<string> {
  let slug = base || `clinic-${Date.now()}`;
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data } = await admin
      .from(table)
      .select("id")
      .eq("slug", candidate)
      .returns<{ id: string }[]>()
      .maybeSingle();
    if (!data) return candidate;
    suffix++;
    if (suffix > 50) {
      // pathological — fall back to timestamp
      return `${base}-${Date.now()}`;
    }
  }
}

export async function onboardClinicAction(
  input: OnboardInput
): Promise<OnboardResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  // Basic shape validation
  if (!input.clinic.nameEn?.trim() || !input.clinic.nameAr?.trim()) {
    return { ok: false, error: "invalid", message: "Clinic name is required in both languages." };
  }
  if (!input.clinic.areaSlug) {
    return { ok: false, error: "invalid", message: "Please pick an area." };
  }
  if (!input.clinic.phone?.trim()) {
    return { ok: false, error: "invalid", message: "Phone number is required." };
  }
  if (input.dentists.length === 0) {
    return { ok: false, error: "invalid", message: "Add at least one dentist." };
  }
  for (const d of input.dentists) {
    if (!d.nameEn?.trim() || !d.nameAr?.trim()) {
      return { ok: false, error: "invalid", message: "Each dentist needs a name in both languages." };
    }
    if (!Number.isFinite(d.feeEgp) || d.feeEgp <= 0) {
      return { ok: false, error: "invalid", message: "Each dentist needs a fee in EGP." };
    }
  }

  const admin = createAdminClient();

  // Resolve area
  const { data: area } = await admin
    .from("areas")
    .select("id")
    .eq("slug", input.clinic.areaSlug)
    .returns<{ id: string }[]>()
    .maybeSingle();
  if (!area) return { ok: false, error: "no_area" };

  // Resolve specialties (collect all needed slugs in one round-trip)
  const allSpecialtySlugs = Array.from(
    new Set(input.dentists.flatMap((d) => d.specialties))
  );
  const { data: specialtyRows } = allSpecialtySlugs.length
    ? await admin
        .from("specialties")
        .select("id, slug")
        .in("slug", allSpecialtySlugs)
        .returns<{ id: string; slug: string }[]>()
    : { data: [] as { id: string; slug: string }[] };
  const specialtyId = new Map<string, string>(
    (specialtyRows ?? []).map((r) => [r.slug, r.id])
  );

  // Slugify clinic
  const clinicSlug = await uniqueSlug("clinics", slugify(input.clinic.nameEn), admin);

  // Insert clinic (unpublished — admin can publish from /dashboard/clinic)
  const { data: clinicRow, error: clinicErr } = await admin
    .from("clinics")
    .insert({
      slug: clinicSlug,
      name_en: input.clinic.nameEn.trim(),
      name_ar: input.clinic.nameAr.trim(),
      area_id: area.id,
      address_en: input.clinic.addressEn?.trim() || null,
      address_ar: input.clinic.addressAr?.trim() || null,
      phone: input.clinic.phone.trim(),
      whatsapp: input.clinic.whatsapp?.trim() || null,
      is_published: false,
    } as never)
    .select("id, slug")
    .returns<{ id: string; slug: string }[]>()
    .single();

  if (clinicErr || !clinicRow) {
    console.error("[onboard] clinic insert failed:", clinicErr);
    return { ok: false, error: "server_error" };
  }

  // For each dentist: insert dentist, clinic_dentists, dentist_specialties
  for (const d of input.dentists) {
    const dentistSlug = await uniqueSlug("dentists", slugify(d.nameEn), admin);

    const { data: dentistRow, error: dentistErr } = await admin
      .from("dentists")
      .insert({
        slug: dentistSlug,
        name_en: d.nameEn.trim(),
        name_ar: d.nameAr.trim(),
        title: d.title,
        years_experience: d.yearsExp ?? null,
        bio_en: d.bioEn?.trim() || null,
        bio_ar: d.bioAr?.trim() || null,
        // Dentists start published — the clinic.is_published flag is the
        // single visibility gate. Search requires both true.
        is_published: true,
      } as never)
      .select("id")
      .returns<{ id: string }[]>()
      .single();

    if (dentistErr || !dentistRow) {
      console.error("[onboard] dentist insert failed:", dentistErr);
      // Clean up the clinic we just created so the user can retry without orphans
      await admin.from("clinics").delete().eq("id", clinicRow.id);
      return { ok: false, error: "server_error" };
    }

    const { error: cdErr } = await admin
      .from("clinic_dentists")
      .insert({
        clinic_id: clinicRow.id,
        dentist_id: dentistRow.id,
        fee_egp: d.feeEgp,
        slot_minutes: 30,
        working_hours: DEFAULT_WORKING_HOURS,
        is_active: true,
      } as never);
    if (cdErr) {
      console.error("[onboard] clinic_dentists insert failed:", cdErr);
      await admin.from("clinics").delete().eq("id", clinicRow.id);
      return { ok: false, error: "server_error" };
    }

    if (d.specialties.length > 0) {
      const rows = d.specialties
        .map((slug) => specialtyId.get(slug))
        .filter((id): id is string => !!id)
        .map((sId) => ({ dentist_id: dentistRow.id, specialty_id: sId }));
      if (rows.length > 0) {
        const { error: dsErr } = await admin.from("dentist_specialties").insert(rows as never);
        if (dsErr) console.error("[onboard] dentist_specialties insert (non-fatal):", dsErr);
      }
    }
  }

  // Link the current user as the clinic's admin
  const { error: caErr } = await admin
    .from("clinic_admins")
    .insert({ clinic_id: clinicRow.id, profile_id: auth.user.id } as never);
  if (caErr) {
    console.error("[onboard] clinic_admins insert failed:", caErr);
    // Not fatal for the data — the clinic exists. Could retry from a profile page later.
  }

  // Promote the user's role if they're still a patient
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .returns<{ role: string }[]>()
    .single();
  if (profile && profile.role === "patient") {
    const { error: roleErr } = await admin
      .from("profiles")
      .update({ role: "dentist_admin" } as never)
      .eq("id", auth.user.id);
    if (roleErr) console.error("[onboard] role promotion failed (non-fatal):", roleErr);
  }

  revalidatePath("/", "layout");
  return { ok: true, clinicId: clinicRow.id, clinicSlug: clinicRow.slug };
}
