// Clinic subscription pricing — single source of truth for tier × package → EGP.
//
// Tiers map 1:1 to geographic areas (see migration 008 areas.tier seeding):
//   Tier  1: New Cairo                Tier  8: Mohandesin
//   Tier  2: Heliopolis               Tier  9: 6th of October
//   Tier  3: Nasr City                Tier 10: 10th of Ramadan
//   Tier  4: El Shorouk               Tier 11: Madinaty
//   Tier  5: Zamalek                  Tier 12: El Rehab
//   Tier  6: Sheikh Zayed             Tier 13: El Obour
//   Tier  7: Maadi                    Tier 14: Administrative Capital
//
// All tiers also charge a 50% first-consultation success fee per new patient.
// Returning patients within their chosen validity window (1/3/6 months) do
// NOT trigger another fee — only when the window expires.

export type Tier =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Package = "standard" | "growth" | "premium";
export type ValidityMonths = 1 | 3 | 6;

export const PACKAGES: readonly Package[] = ["standard", "growth", "premium"] as const;
export const VALIDITY_MONTHS: readonly ValidityMonths[] = [1, 3, 6] as const;

const PRICING: Record<Tier, Record<Package, number>> = {
  1:  { standard:  999, growth: 1499, premium: 2199 }, // New Cairo
  2:  { standard:  899, growth: 1399, premium: 1999 }, // Heliopolis
  3:  { standard:  699, growth: 1099, premium: 1699 }, // Nasr City
  4:  { standard:  599, growth:  899, premium: 1399 }, // El Shorouk
  5:  { standard: 1199, growth: 1799, premium: 2599 }, // Zamalek
  6:  { standard: 1099, growth: 1699, premium: 2499 }, // Sheikh Zayed
  7:  { standard:  999, growth: 1499, premium: 2199 }, // Maadi
  8:  { standard:  899, growth: 1399, premium: 1999 }, // Mohandesin
  9:  { standard:  799, growth: 1299, premium: 1899 }, // 6th of October
  10: { standard:  499, growth:  799, premium: 1299 }, // 10th of Ramadan
  11: { standard:  899, growth: 1399, premium: 1999 }, // Madinaty
  12: { standard:  999, growth: 1499, premium: 2199 }, // El Rehab
  13: { standard:  599, growth:  999, premium: 1499 }, // El Obour
  14: { standard: 1199, growth: 1899, premium: 2799 }, // Administrative Capital
};

export function priceFor(tier: Tier, pkg: Package): number {
  return PRICING[tier][pkg];
}

export function getTierPricing(tier: Tier): Record<Package, number> {
  return PRICING[tier];
}

// Feature lists per package — used in the onboarding pricing card and could
// later move into the DB if marketing wants to A/B test. Kept here for now so
// the wizard can render without an extra fetch.
export const PACKAGE_FEATURES: Record<Package, { en: string[]; ar: string[] }> = {
  standard: {
    en: [
      "Monthly Subscription",
      "Clinic Listing",
      "Dentist Profiles",
      "Booking Access",
      "Basic Search Visibility",
    ],
    ar: [
      "اشتراك شهري",
      "إدراج العيادة",
      "ملفات الأطباء",
      "حجوزات أونلاين",
      "ظهور أساسي في البحث",
    ],
  },
  growth: {
    en: [
      "Monthly Subscription",
      "Clinic Listing",
      "Dentist Profiles",
      "Booking Access",
      "Higher Search Visibility",
      "Featured in Nearby Results",
      "Monthly Performance Report",
    ],
    ar: [
      "اشتراك شهري",
      "إدراج العيادة",
      "ملفات الأطباء",
      "حجوزات أونلاين",
      "ظهور أعلى في نتائج البحث",
      "مميّز في نتائج المناطق القريبة",
      "تقرير أداء شهري",
    ],
  },
  premium: {
    en: [
      "Monthly Subscription",
      "Clinic Listing",
      "Dentist Profiles",
      "Booking Access",
      "Top Search Ranking",
      "Sponsored Visibility",
      "Priority Area Exposure",
      "Premium Badge",
      "Dedicated Support",
    ],
    ar: [
      "اشتراك شهري",
      "إدراج العيادة",
      "ملفات الأطباء",
      "حجوزات أونلاين",
      "ترتيب متقدم في نتائج البحث",
      "ظهور مدعوم",
      "أولوية الظهور في المنطقة",
      "شارة Premium",
      "دعم مخصّص",
    ],
  },
};

export function isValidPackage(s: unknown): s is Package {
  return s === "standard" || s === "growth" || s === "premium";
}

export function isValidTier(n: unknown): n is Tier {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 14;
}

export function isValidValidityMonths(n: unknown): n is ValidityMonths {
  return n === 1 || n === 3 || n === 6;
}
