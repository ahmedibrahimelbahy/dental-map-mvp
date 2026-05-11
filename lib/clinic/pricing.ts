// Clinic subscription pricing — single source of truth for tier × package → EGP.
//
// Tiers map to geographic areas (see migration 006 areas.tier seeding):
//   Tier 1: New Cairo, Zamalek, Maadi
//   Tier 2: Heliopolis, Mohandessin
//   Tier 3: Nasr City
//   Tier 4: 6th October, El Shorouk
//
// All tiers also charge a 50% first-consultation success fee per new patient.
// Returning patients within their chosen validity window (1/3/6 months) do
// NOT trigger another fee — only when the window expires.

export type Tier = 1 | 2 | 3 | 4;
export type Package = "standard" | "growth" | "premium";
export type ValidityMonths = 1 | 3 | 6;

export const PACKAGES: readonly Package[] = ["standard", "growth", "premium"] as const;
export const VALIDITY_MONTHS: readonly ValidityMonths[] = [1, 3, 6] as const;

const PRICING: Record<Tier, Record<Package, number>> = {
  1: { standard: 999, growth: 1499, premium: 2199 },
  2: { standard: 899, growth: 1399, premium: 1999 },
  3: { standard: 699, growth: 1099, premium: 1699 },
  4: { standard: 599, growth: 899, premium: 1399 },
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
  return n === 1 || n === 2 || n === 3 || n === 4;
}

export function isValidValidityMonths(n: unknown): n is ValidityMonths {
  return n === 1 || n === 3 || n === 6;
}
