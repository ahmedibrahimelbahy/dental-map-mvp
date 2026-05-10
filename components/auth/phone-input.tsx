"use client";

/**
 * Phone input with a country dial-code dropdown + local number field.
 * Returns the combined value as +<dial><digits-only> (E.164-ish) via
 * onChange so the form just needs one string.
 *
 * Default = Egypt (+20). The list is curated for the Cairo pilot:
 * Egyptian locals, Gulf + Levant Arabic-speaking patients, plus the
 * common Western expat origins.
 */

const COUNTRIES: { code: string; dial: string; nameEn: string; nameAr: string; flag: string }[] = [
  { code: "EG", dial: "+20", nameEn: "Egypt", nameAr: "مصر", flag: "🇪🇬" },
  { code: "SA", dial: "+966", nameEn: "Saudi Arabia", nameAr: "السعودية", flag: "🇸🇦" },
  { code: "AE", dial: "+971", nameEn: "UAE", nameAr: "الإمارات", flag: "🇦🇪" },
  { code: "KW", dial: "+965", nameEn: "Kuwait", nameAr: "الكويت", flag: "🇰🇼" },
  { code: "QA", dial: "+974", nameEn: "Qatar", nameAr: "قطر", flag: "🇶🇦" },
  { code: "BH", dial: "+973", nameEn: "Bahrain", nameAr: "البحرين", flag: "🇧🇭" },
  { code: "OM", dial: "+968", nameEn: "Oman", nameAr: "عُمان", flag: "🇴🇲" },
  { code: "JO", dial: "+962", nameEn: "Jordan", nameAr: "الأردن", flag: "🇯🇴" },
  { code: "LB", dial: "+961", nameEn: "Lebanon", nameAr: "لبنان", flag: "🇱🇧" },
  { code: "PS", dial: "+970", nameEn: "Palestine", nameAr: "فلسطين", flag: "🇵🇸" },
  { code: "IQ", dial: "+964", nameEn: "Iraq", nameAr: "العراق", flag: "🇮🇶" },
  { code: "SY", dial: "+963", nameEn: "Syria", nameAr: "سوريا", flag: "🇸🇾" },
  { code: "YE", dial: "+967", nameEn: "Yemen", nameAr: "اليمن", flag: "🇾🇪" },
  { code: "MA", dial: "+212", nameEn: "Morocco", nameAr: "المغرب", flag: "🇲🇦" },
  { code: "TN", dial: "+216", nameEn: "Tunisia", nameAr: "تونس", flag: "🇹🇳" },
  { code: "DZ", dial: "+213", nameEn: "Algeria", nameAr: "الجزائر", flag: "🇩🇿" },
  { code: "LY", dial: "+218", nameEn: "Libya", nameAr: "ليبيا", flag: "🇱🇾" },
  { code: "SD", dial: "+249", nameEn: "Sudan", nameAr: "السودان", flag: "🇸🇩" },
  { code: "TR", dial: "+90", nameEn: "Turkey", nameAr: "تركيا", flag: "🇹🇷" },
  { code: "GB", dial: "+44", nameEn: "United Kingdom", nameAr: "بريطانيا", flag: "🇬🇧" },
  { code: "US", dial: "+1", nameEn: "United States", nameAr: "أمريكا", flag: "🇺🇸" },
  { code: "CA", dial: "+1", nameEn: "Canada", nameAr: "كندا", flag: "🇨🇦" },
  { code: "DE", dial: "+49", nameEn: "Germany", nameAr: "ألمانيا", flag: "🇩🇪" },
  { code: "FR", dial: "+33", nameEn: "France", nameAr: "فرنسا", flag: "🇫🇷" },
  { code: "IT", dial: "+39", nameEn: "Italy", nameAr: "إيطاليا", flag: "🇮🇹" },
  { code: "ES", dial: "+34", nameEn: "Spain", nameAr: "إسبانيا", flag: "🇪🇸" },
  { code: "NL", dial: "+31", nameEn: "Netherlands", nameAr: "هولندا", flag: "🇳🇱" },
  { code: "AU", dial: "+61", nameEn: "Australia", nameAr: "أستراليا", flag: "🇦🇺" },
];

export function PhoneInput({
  value,
  onChange,
  locale,
  required,
  id = "phone",
  name = "phone",
}: {
  value: string;
  onChange: (full: string) => void;
  locale: string;
  required?: boolean;
  id?: string;
  name?: string;
}) {
  const isAr = locale === "ar";

  // Parse the current value into (dial, local) so the user can edit
  // either side independently. We preserve the order EGYPT-FIRST always.
  const parsed = parseValue(value);
  const dial = parsed.dial;
  const local = parsed.local;

  function update(nextDial: string, nextLocal: string) {
    const cleanLocal = nextLocal.replace(/\D/g, "");
    const full = cleanLocal ? `${nextDial}${cleanLocal}` : "";
    onChange(full);
  }

  return (
    <div
      className="flex gap-2 rounded-xl border border-ink-200 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-colors"
      dir="ltr"
    >
      <select
        value={dial}
        onChange={(e) => update(e.target.value, local)}
        aria-label="Country code"
        className="ps-3 pe-1 py-3 bg-transparent text-[14px] font-semibold text-ink-800 border-0 focus:outline-none cursor-pointer rounded-s-xl"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.dial}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>
      <div className="w-px bg-ink-100 my-2" aria-hidden />
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        placeholder={isAr ? "10 1234 5678" : "10 1234 5678"}
        value={local}
        onChange={(e) => update(dial, e.target.value)}
        className="flex-1 ps-2 pe-4 py-3 bg-transparent text-[15px] text-ink-900 border-0 focus:outline-none rounded-e-xl tabular-nums"
      />
    </div>
  );
}

/**
 * Parse a stored value (e.g. "+20 10 1234 5678" or "+201012345678")
 * back into a dial + local. We try the longest matching prefix first
 * so e.g. "+966" beats "+9" when both could match.
 */
function parseValue(stored: string): { dial: string; local: string } {
  const trimmed = stored.trim();
  if (!trimmed) return { dial: "+20", local: "" };

  // Match longest dial first
  const dialsByLength = [...COUNTRIES].sort(
    (a, b) => b.dial.length - a.dial.length
  );
  for (const c of dialsByLength) {
    if (trimmed.startsWith(c.dial)) {
      return {
        dial: c.dial,
        local: trimmed.slice(c.dial.length).replace(/\D/g, ""),
      };
    }
  }
  // No dial code present; treat the whole thing as a local Egyptian number
  return { dial: "+20", local: trimmed.replace(/\D/g, "") };
}
