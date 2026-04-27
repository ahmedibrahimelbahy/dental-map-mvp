#!/usr/bin/env node
/**
 * Seed realistic pilot data so the patient search page has something to show.
 * Idempotent: safe to re-run; updates by slug.
 *
 *   node --env-file=.env.local scripts/seed-pilot-data.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Working-hours shorthand
const WEEKDAY = (start = "10:00", end = "18:00") =>
  [0, 1, 2, 3, 4].map((day) => ({ day, start, end })); // Sun–Thu

const CLINICS = [
  {
    slug: "smile-stop-zamalek",
    name_en: "Smile Stop Zamalek",
    name_ar: "سمايل ستوب الزمالك",
    area_slug: "zamalek",
    address_en: "26th of July St., Zamalek, Cairo",
    address_ar: "شارع 26 يوليو، الزمالك، القاهرة",
    lat: 30.0617,
    lng: 31.2189,
    phone: "+20 2 27355555",
    whatsapp: "+201001234567",
  },
  {
    slug: "cairo-dental-care-nasr",
    name_en: "Cairo Dental Care · Nasr City",
    name_ar: "سي دنتال كير · مدينة نصر",
    area_slug: "nasr-city",
    address_en: "Abbas El Akkad St., Nasr City",
    address_ar: "شارع عباس العقاد، مدينة نصر",
    lat: 30.0566,
    lng: 31.3478,
    phone: "+20 2 22667788",
    whatsapp: "+201001234568",
  },
  {
    slug: "perfect-teeth-maadi",
    name_en: "Perfect Teeth Maadi",
    name_ar: "بيرفكت تيث المعادي",
    area_slug: "maadi",
    address_en: "Road 9, Maadi",
    address_ar: "شارع 9، المعادي",
    lat: 29.9602,
    lng: 31.2569,
    phone: "+20 2 23589999",
    whatsapp: "+201001234569",
  },
  {
    slug: "dr-soliman-heliopolis",
    name_en: "Dr. Soliman Dental · Heliopolis",
    name_ar: "د. سليمان للأسنان · مصر الجديدة",
    area_slug: "heliopolis",
    address_en: "Korba, Heliopolis",
    address_ar: "الكوربة، مصر الجديدة",
    lat: 30.0888,
    lng: 31.3232,
    phone: "+20 2 24145555",
    whatsapp: "+201001234570",
  },
  {
    slug: "white-dental-mohandessin",
    name_en: "White Dental · Mohandessin",
    name_ar: "وايت دنتال · المهندسين",
    area_slug: "mohandessin",
    address_en: "Gameat El Dewal El Arabeya, Mohandessin",
    address_ar: "جامعة الدول العربية، المهندسين",
    lat: 30.0577,
    lng: 31.1992,
    phone: "+20 2 33042222",
    whatsapp: "+201001234571",
  },
  {
    slug: "october-smiles-clinic",
    name_en: "October Smiles · 6th of October",
    name_ar: "ابتسامات أكتوبر · 6 أكتوبر",
    area_slug: "6-october",
    address_en: "Central Axis, 6th of October",
    address_ar: "المحور المركزي، 6 أكتوبر",
    lat: 29.9658,
    lng: 30.9266,
    phone: "+20 2 38371111",
    whatsapp: "+201001234572",
  },
];

// Spec slugs that exist in DB — see db/schema.sql seed
const DENTISTS = [
  {
    clinic_slug: "smile-stop-zamalek",
    slug: "dr-sara-hassan",
    name_en: "Dr. Sara Hassan",
    name_ar: "د. سارة حسن",
    title: "consultant",
    years: 12,
    bio_en:
      "Cosmetic & orthodontics consultant. Aligners, veneers, and full smile makeovers.",
    bio_ar: "استشارية تجميل وتقويم. تقويم شفاف، فينير، وتصميم الابتسامة.",
    fee: 350,
    specialties: ["orthodontics", "cosmetic"],
  },
  {
    clinic_slug: "cairo-dental-care-nasr",
    slug: "dr-ahmed-fawzy",
    name_en: "Dr. Ahmed Fawzy",
    name_ar: "د. أحمد فوزي",
    title: "specialist",
    years: 8,
    bio_en: "Endodontics and adult restorative dentistry.",
    bio_ar: "علاج جذور وحشوات تجميلية.",
    fee: 250,
    specialties: ["endodontics", "adult"],
  },
  {
    clinic_slug: "perfect-teeth-maadi",
    slug: "dr-omar-elmasry",
    name_en: "Dr. Omar El-Masry",
    name_ar: "د. عمر المصري",
    title: "professor",
    years: 22,
    bio_en: "Implantology professor. 1500+ implants placed.",
    bio_ar: "أستاذ زراعة الأسنان. أكثر من 1500 زراعة.",
    fee: 600,
    specialties: ["implants", "oral-surgery"],
  },
  {
    clinic_slug: "dr-soliman-heliopolis",
    slug: "dr-mona-soliman",
    name_en: "Dr. Mona Soliman",
    name_ar: "د. منى سليمان",
    title: "consultant",
    years: 14,
    bio_en: "Pediatric dentistry. Calm, child-friendly approach.",
    bio_ar: "أسنان الأطفال. أسلوب هادئ وودود مع الأطفال.",
    fee: 220,
    specialties: ["pediatric"],
  },
  {
    clinic_slug: "white-dental-mohandessin",
    slug: "dr-tamer-ibrahim",
    name_en: "Dr. Tamer Ibrahim",
    name_ar: "د. تامر إبراهيم",
    title: "specialist",
    years: 10,
    bio_en: "Cosmetic dentistry — veneers, whitening, smile design.",
    bio_ar: "تجميل الأسنان — فينير، تبييض، تصميم الابتسامة.",
    fee: 400,
    specialties: ["cosmetic"],
  },
  {
    clinic_slug: "october-smiles-clinic",
    slug: "dr-yasmin-rashed",
    name_en: "Dr. Yasmin Rashed",
    name_ar: "د. ياسمين راشد",
    title: "specialist",
    years: 7,
    bio_en: "Orthodontics specialist. Adult and teen aligners.",
    bio_ar: "أخصائية تقويم. تقويم للكبار والمراهقين.",
    fee: 320,
    specialties: ["orthodontics"],
  },
];

async function getId(table, slug) {
  const { data } = await supa
    .from(table)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

async function upsertClinic(c) {
  const areaId = await getId("areas", c.area_slug);
  const existing = await supa
    .from("clinics")
    .select("id")
    .eq("slug", c.slug)
    .maybeSingle();
  if (existing.data) {
    await supa
      .from("clinics")
      .update({
        name_en: c.name_en,
        name_ar: c.name_ar,
        area_id: areaId,
        address_en: c.address_en,
        address_ar: c.address_ar,
        lat: c.lat,
        lng: c.lng,
        phone: c.phone,
        whatsapp: c.whatsapp,
        is_published: true,
      })
      .eq("id", existing.data.id);
    return existing.data.id;
  }
  const { data, error } = await supa
    .from("clinics")
    .insert({
      slug: c.slug,
      name_en: c.name_en,
      name_ar: c.name_ar,
      area_id: areaId,
      address_en: c.address_en,
      address_ar: c.address_ar,
      lat: c.lat,
      lng: c.lng,
      phone: c.phone,
      whatsapp: c.whatsapp,
      is_published: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertDentist(d) {
  const existing = await supa
    .from("dentists")
    .select("id")
    .eq("slug", d.slug)
    .maybeSingle();
  if (existing.data) {
    await supa
      .from("dentists")
      .update({
        name_en: d.name_en,
        name_ar: d.name_ar,
        title: d.title,
        years_experience: d.years,
        bio_en: d.bio_en,
        bio_ar: d.bio_ar,
        is_published: true,
      })
      .eq("id", existing.data.id);
    return existing.data.id;
  }
  const { data, error } = await supa
    .from("dentists")
    .insert({
      slug: d.slug,
      name_en: d.name_en,
      name_ar: d.name_ar,
      title: d.title,
      years_experience: d.years,
      bio_en: d.bio_en,
      bio_ar: d.bio_ar,
      is_published: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function linkClinicDentist(clinicId, dentistId, fee) {
  const existing = await supa
    .from("clinic_dentists")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("dentist_id", dentistId)
    .maybeSingle();
  if (existing.data) {
    await supa
      .from("clinic_dentists")
      .update({
        fee_egp: fee,
        slot_minutes: 30,
        working_hours: WEEKDAY(),
        is_active: true,
        calendar_mode: "manual",
      })
      .eq("id", existing.data.id);
    return existing.data.id;
  }
  const { data, error } = await supa
    .from("clinic_dentists")
    .insert({
      clinic_id: clinicId,
      dentist_id: dentistId,
      fee_egp: fee,
      slot_minutes: 30,
      working_hours: WEEKDAY(),
      is_active: true,
      calendar_mode: "manual",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function setSpecialties(dentistId, slugs) {
  const { data: specs } = await supa
    .from("specialties")
    .select("id, slug")
    .in("slug", slugs);
  // Wipe & re-insert (small set, idempotent)
  await supa.from("dentist_specialties").delete().eq("dentist_id", dentistId);
  if (!specs || specs.length === 0) return;
  await supa
    .from("dentist_specialties")
    .insert(specs.map((s) => ({ dentist_id: dentistId, specialty_id: s.id })));
}

async function main() {
  console.log("Seeding clinics & dentists…");
  const clinicMap = {};
  for (const c of CLINICS) {
    const id = await upsertClinic(c);
    clinicMap[c.slug] = id;
    console.log(`  clinic ✓  ${c.slug.padEnd(30)} ${id}`);
  }
  for (const d of DENTISTS) {
    const dentistId = await upsertDentist(d);
    const clinicId = clinicMap[d.clinic_slug];
    const cdId = await linkClinicDentist(clinicId, dentistId, d.fee);
    await setSpecialties(dentistId, d.specialties);
    console.log(`  dentist ✓ ${d.slug.padEnd(22)} fee=${d.fee} cd=${cdId}`);
  }
  console.log("\n✅ Seeded", CLINICS.length, "clinics +", DENTISTS.length, "dentists.");
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
