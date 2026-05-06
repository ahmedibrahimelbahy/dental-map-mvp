# Dental Map MVP — Retroactive UI Audit

**Audited:** 2026-05-06
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md exists)
**Scope:** Patient surfaces + clinic dashboard + auth + chrome (44 .tsx files)
**Screenshots:** Not captured — no dev server running. Code-only audit.
**Auditor stance:** Adversarial. Started from "every pillar has gaps until proven otherwise."

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | **3**/4 | Strong voice across translations; broken `Step1` label on for-clinics; mixed inline AR/EN strings bypass i18n |
| 2. Visuals | **3**/4 | Clear hierarchy, custom icon system, real focal points; bento dashboard tiles compete for attention; map empty state is generic |
| 3. Color | **4**/4 | Zero default Tailwind blue/indigo. Custom `teal` + `ink` + `coral` palette used consistently with disciplined accent placement |
| 4. Typography | **2**/4 | 39 distinct arbitrary `text-[Npx]` sizes — far past the 4-size guideline. Half-pixel sizes (`13.5px`, `14.5px`) signal eyeballed-not-systematic |
| 5. Spacing | **2**/4 | No spacing scale. 25+ unique padding/margin classes, half-step values (`py-1.5`, `py-3.5`, `mt-0.5`), and many `!important` overrides on shared button classes |
| 6. Experience Design | **3**/4 | Loading/empty/error states broadly covered, RTL is real, optimistic toggles are nice — but bare `…` ellipsis as loading affordance, untranslated booking statuses, and `transition-all` violations |

**Overall: 17/24**

> **Reading note:** This is a fair-to-good MVP. The brand identity, RTL discipline, and end-to-end state coverage are above average for a 4-week MVP. The audit-critical gaps are all in the "design system" layer — typography and spacing — where ad-hoc decisions have ossified. None of these are user-blocking; all are speed bumps that compound as more screens land.

---

## Top 10 Priority Fixes

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
| 1 | **Broken numbered-step labels** on For Clinics page — `n === 1 ? "Step" : ""` ships the literal text `"Step1"` (no space) for step 1 and bare numbers `"2"`, `"3"`, `"4"` for the rest | BLOCKER | 5 min | High — visible on the primary B2B landing page |
| 2 | **Untranslated booking status pills** in `bookings-table.tsx:98` — renders raw `a.status` (`"pending"`, `"confirmed"`, etc.) instead of looking up `Dashboard.statusXxx` translations. Only English ever shows; Arabic users see English DB values | BLOCKER | 15 min | High — breaks AR experience on the busiest dashboard surface |
| 3 | **Untranslated empty/totals copy** in `dashboard/bookings/page.tsx:31` — `${count} ${isAr ? "حجز" : "total"}` mixes a unit ("بحجز") in AR with a noun ("total") in EN. Pluralization is wrong in both | WARNING | 10 min | Medium — visible on every dashboard load |
| 4 | **Define a typography scale.** 39 distinct `text-[Npx]` arbitrary values across 45 files, with half-step sizes (`text-[10.5px]`, `text-[11.5px]`, `text-[12.5px]`, `text-[13.5px]`, `text-[14.5px]`, `text-[15.5px]`, `text-[16.5px]`). Replace with 6–8 named utilities (e.g., `text-caption-xs/caption/body-sm/body/body-lg/h3/h2/h1`) in globals.css | WARNING | 4 hrs | High — every future screen pays interest until this is fixed |
| 5 | **Define a spacing scale.** Top-25 spacing classes include `gap-1`, `gap-2`, `gap-3`, `gap-4` (4 gaps for 25 components) and half-steps `py-1.5`, `py-3.5`, `mt-0.5`. Pick a 4/8/12/16/24/32/48/64 scale and stick to it — `!py-2`, `!py-2.5`, `!py-3.5` overrides on `btn-primary` defeat the shared component | WARNING | 4 hrs | High — same as #4, scales with surface count |
| 6 | **Replace bare `…` ellipsis loading affordance** in `auth/signin-form.tsx:59`, `auth/signup-form.tsx:93`, `booking-form.tsx:107`, `working-hours-editor.tsx:159`, `gcal-connection-card.tsx:93`, `account-bookings.tsx:267`. Use the `Loader2` spinner pattern already in `onboard-form.tsx:431` consistently | WARNING | 30 min | Medium — primary CTA disappears on tap, looks broken |
| 7 | **Remove `transition-all` violations.** Found in `dentist-card.tsx:28`, `page.tsx:178` (specialty tile), `search-results.tsx:98`, `calendar-mode-picker.tsx:109`. `transition-all` triggers layout-blocking properties; replace with `transition-[transform,box-shadow,border-color,background-color]` or split into `transition-colors transition-transform` | WARNING | 20 min | Medium — perf cost on hover-rich pages, against project Hard Rules |
| 8 | **Inline AR/EN literals bypassing i18n.** ~20 occurrences: `for-clinics/page.tsx:73,99,127,157,179,188,204,216` (entire UI labels in `isAr ? "..." : "..."`), `dentist-card.tsx:66,70,74`, `search-results.tsx:57,77,66`, `bookings-table.tsx:155,164,179,180`, `account-bookings.tsx:230`, `bento/today-schedule.tsx:77,114,136,140,144`, `bookings/page.tsx:31`. Move all to `messages/{ar,en}.json` so translators have a single source | WARNING | 2 hrs | Medium — splits the i18n contract, makes future translation handoff impossible |
| 9 | **Bento dashboard visual hierarchy is flat.** `today-schedule`, `kpi-tile`, `leaderboard-tile`, `action-queue-tile`, `calendar-health-tile` all use the same `rounded-2xl bg-white border border-ink-100 shadow-tile`. No tile reads as primary. Today's schedule and Action queue are the actionable ones — give them an accent border or a stronger shadow tier | WARNING | 1 hr | Medium — the pillar of this dashboard's pitch is "see what matters" |
| 10 | **Map empty state in `clinic-map.tsx:127-134` uses inline SVG and a generic "No clinic locations to display"** while the rest of the app uses `lucide-react` icons. Replace with `<MapOff>` and a copy that nudges next action ("Try removing the area filter", "Switch to list view") | WARNING | 30 min | Low-Medium — increases trust when filters return zero hits |

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- `messages/en.json` and `messages/ar.json` show genuine voice. `"Egypt's booking engine for dentists — live availability, verified reviews."` and `"Better dental care, without the phone tag."` outperform the typical MVP placeholder soup.
- Empty states are specific, not generic: `Profile.noSlots = "No open slots in the next 7 days. Try a different dentist or check back later."`, `Account.emptyBody = "When you book a dentist, your appointment shows up here. Cancel up to 2 hours before — no phone calls needed."`
- Error messages map reasons to actions: `Booking.alreadyTaken = "Sorry — this slot was just taken. Pick another."`
- For-clinics page reads like a real pitch (the FAQ at `messages/en.json:252-264` is on-voice and Egypt-specific).
- `Dashboard.bookingsEmpty` is a known-incorrect pre-launch placeholder; not flagged as a bug since it's clearly self-aware ("patient-side search ships next week").

**Gaps:**
- **BLOCKER:** `app/[locale]/(patient)/for-clinics/page.tsx:322-325` — `{n === 1 ? "Step" : ""}{n}` produces `"Step1"` (no space) on step 1 and `"2"`, `"3"`, `"4"` on others. The "Step" word is also untranslated. Fix: render `{`Step ${n.toString().padStart(2, "0")}`}` and translate.
- Inline AR/EN literals scattered across 20+ components (see Top-10 #8). E.g., `for-clinics/page.tsx:99` `"لماذا Dental Map" : "Why Dental Map"` — ALL the eyebrow labels on the for-clinics page are inline ternaries despite a `ForClinics.*` namespace existing.
- `dentist-card.tsx:70` shows `"جديد" : "New"` as a star-rating pill on every card, with the amber star icon. With zero reviews it reads as a positive rating signal (it isn't). Suggest `"No reviews yet"` (full string) or remove the star entirely until rating data exists.
- `bookings-table.tsx:31-39` — copy block uses English-only labels (`Patient:`, `Phone:`, `When:`, `Dentist:`, `Clinic:`, `Fee:`, `Note:`) regardless of locale. The clinic copying these into Dentolize might want Arabic. Make it locale-aware or document why English is correct.

### Pillar 2: Visuals (3/4)

**Strengths:**
- Each major page has a clear focal point. Patient home: hero search card with `shadow-search`. Profile: slot grid. Booking: summary aside is sticky. Dashboard: today's schedule visual.
- Custom Leaflet pin (`clinic-map.tsx:26-54`) is a real branded asset, not the default blue marker.
- The `chip` component (`globals.css:124-136`) uses a teal-tinted background with a 6px dot and gives every category badge a consistent look.
- Icon-only buttons all have `aria-label` (mobile-nav hamburger, search filter close, sign out form) or visible text; aria-hidden is consistently applied to decorative icons (106 occurrences across 34 files).
- The bento dashboard is genuinely original — the today-schedule occupancy bar at `today-schedule.tsx:101-129` with status-coded cells (gradient teal for confirmed, diagonal-stripe amber for pending) is high-craft.

**Gaps:**
- **Bento tile flatness** (Top-10 #9): all five tiles use identical `shadow-tile` + identical white `bg-white` + identical `border border-ink-100`. The entire grid reads as a uniform plane. The pitch "a quick read on your clinic today" requires emphasis: today's schedule and the action queue are the actionable items; the leaderboard and KPI strip are the supporting cast. None of that is communicated visually.
- `dentist-card.tsx:31-32` initials avatar: `(d.nameEn ?? "").split(" ").slice(-2).map(s => s[0]).join("")` — for "Dr. Yara Magdy" returns "YM" but for "Dr." or "Yara" alone returns "Y." or "DA" (oddly the first letter of each of the last two tokens). Edge cases: empty name renders an empty teal box. Add a fallback.
- The map view's "no locations" state (`clinic-map.tsx:127-134`) draws an inline custom SVG inconsistent with the lucide-react system used everywhere else.
- `for-clinics/page.tsx:318` — the gradient number trick on Step cards (`text-transparent` + `bg-clip:text` + `opacity-30`) shows `"01"`, `"02"`, etc. behind the content. With low contrast (opacity-30) on a white background it's nearly invisible at most viewport sizes. Either make it a real visual element (opacity-50, larger) or drop it.
- The for-clinics hero has THREE decorative gradients: page-level `bg-gradient-to-br from-teal-50 via-white to-white`, a `w-[480px] h-[480px] rounded-full bg-teal-100/40 blur-3xl` blob, and the hero-wash. They're all soft enough not to fight, but combined they read as "designer reached for atmosphere when content would suffice."

### Pillar 3: Color (4/4)

**Strengths:**
- **Zero** matches for `indigo`, `sky-500`, `blue-500`, `blue-600` across `*.tsx`, `*.css`, `*.ts` files — the project obeys its own anti-generic rule.
- Custom palette in `tailwind.config.ts:7-42` is logo-derived (teal-500 = `#1EA58F`) and ink scale is cool (`#0F1B2A` to `#F6F8FA`). 60/30/10 distribution holds: ink-900 text + white surfaces (60), ink-50/ink-100 dividers + teal-50 chip backgrounds (30), teal-500/teal-600 CTAs and accent borders (10).
- 205 total `(text|bg|border)-teal-*` class usages across 45 files. With ~290 components/tiles, that's a measured accent rate — not splattered.
- Semantic colors are used purposefully: `coral-500` for auth errors only (5 occurrences), `rose-*` for destructive (cancel, no-show, sign-out), `amber-*` for pending/warning, `emerald-*` for WhatsApp confirmation success. Each maps to one role.
- `globals.css:36-40` global focus ring uses brand teal — not the browser default outline.

**Gaps:**
- One inline hardcoded color: `clinic-map.tsx:30-31` — `const bg = active ? "#0f766e" : "#14b8a6"` uses Tailwind v3 stock teal hex codes (`teal-700`/`teal-500` from default palette), not the custom palette in `tailwind.config.ts`. The custom teal-700 is `#0E6458` and teal-500 is `#1EA58F`. The default-palette values in clinic-map are visually close but they're a contract violation. Switch to template literals using a CSS custom property or import from `tailwind.config`.
- Otherwise no findings. Strong pillar.

### Pillar 4: Typography (2/4)

**Hard data — distinct font sizes in use across `*.tsx`:**
```
text-[9px]  text-[10px]  text-[10.5px]  text-[11px]  text-[11.5px]
text-[12px] text-[12.5px] text-[13px]   text-[13.5px] text-[14px]
text-[14.5px] text-[15px] text-[15.5px] text-[16px]  text-[16.5px]
text-[17px] text-[18px]   text-[19px]   text-[20px]   text-[22px]
text-[24px] text-[26px]   text-[28px]   text-[30px]   text-[32px]
text-[34px] text-[36px]   text-[38px]   text-[40px]   text-[42px]
text-[44px] text-[48px]   text-[52px]   text-[56px]   text-[60px]
text-[68px] text-[72px]   text-[82px]   text-[84px]
```
**39 distinct sizes, including 7 half-pixel values.** The anti-generic guidelines call for ≤4 distinct sizes in regular use; this is approximately 10×.

**Why this happened:** Each component author picked the size that "felt right" by eye. Half-pixel values (`13.5px`, `14.5px`) are the tell — those are the result of bumping a 14px body up or a 13px caption down, never a scale decision.

**Strengths:**
- Display vs body separation is real. `display-h1`, `display-h2`, `display-h3` defined in `globals.css:88-115` use `--font-jakarta` with negative letter-spacing (`-0.03em`, `-0.025em`, `-0.02em`) and tight line-height (1.04, 1.08, 1.15). Body inherits `--font-manrope`. Cairo swaps in for AR via `globals.css:31-33` and `:110-115` resets letter-spacing to 0 for RTL — that's a thoughtful detail.
- Font weights are well-rationed: `font-bold` (84) and `font-semibold` (29) dominate, `font-medium` (25) for body labels, only one `font-light` and one `font-normal`. Three-tier weight scale in practice.
- `small-caps` utility (`globals.css:117-122`) is consistently used for section eyebrows.
- Letter-spacing tokens (`tracking-display`, `tracking-tight2`, `tracking-smallcaps`) are defined in `tailwind.config.ts:60-64` but only used twice in code (`brand-mark.tsx:19`, `page.tsx:265`). Most callsites inline `letter-spacing` via the `display-h*` utility, which is fine — the config-level tokens are largely unused.

**Gaps:**
- 39 distinct sizes is a maintenance bomb. Every change to "body text size" requires search-and-replace across files. New components inevitably introduce a 41st size.
- Half-pixel values (`text-[10.5px]` shows up at `page.tsx:72,90,108`, `for-clinics/page.tsx:187`, `account-bookings.tsx:189`, `bookings-table.tsx:96`, `calendar-mode-picker.tsx:129,134`) suggest manual visual tuning rather than scale adoption.
- `for-clinics/page.tsx:48` hero h1 has FOUR breakpoint sizes: `text-[36px] sm:text-[48px] md:text-[68px] lg:text-[82px]`. The patient home hero (`page.tsx:51`) has THREE: `text-[44px] md:text-[72px] lg:text-[84px]`. They don't agree on the lg size (82 vs 84). They probably intend the same thing.
- No defined line-height scale. Line-heights are inlined as `leading-[1.04]`, `leading-[1.6]`, `leading-[1.65]`, `leading-[1.7]`, `leading-[1.55]`. Each is hand-picked.

**Recommendation:** Define a scale in globals.css:
```css
.text-caption-xs { font-size: 10.5px; line-height: 1.4; letter-spacing: 0.04em; }
.text-caption    { font-size: 12px;   line-height: 1.5; }
.text-body-sm    { font-size: 13px;   line-height: 1.55; }
.text-body       { font-size: 14.5px; line-height: 1.65; }
.text-body-lg    { font-size: 16px;   line-height: 1.65; }
.text-h3         { font-size: 20px;   line-height: 1.2; }
.text-h2         { font-size: 28px;   line-height: 1.1; }
.text-h1         { font-size: 44px;   line-height: 1.04; }
.text-display    { font-size: 72px;   line-height: 1.0; }
```
Then sed/grep-replace systematically. Not user-visible right now, but prevents 39 from becoming 60.

### Pillar 5: Spacing (2/4)

**Top-25 spacing classes by usage:**
```
49 gap-2     47 gap-3     42 gap-1     35 px-5     30 px-4
27 px-3      25 mb-2      23 py-1      23 px-8     22 mb-3
19 py-3      19 p-6       19 gap-4     17 py-2     17 mb-4
16 p-5       16 mb-6      15 p-7       14 mb-5     13 mt-0
13 mb-1      11 py-14     11 px-2      11 mt-2     11 mb-10
```

Plus a tail of half-step values: `py-1.5`, `py-2.5`, `py-3.5`, `mt-0.5`, `mb-0.5`, `gap-1.5`, `gap-2.5` — all present in the codebase.

**Problems:**
- No defined spacing scale. The fact that the codebase uses **4 different gap values** (`gap-1`, `gap-2`, `gap-3`, `gap-4`) for stacked layouts and another **3 half-steps** (`gap-1.5`, `gap-2.5`) means there's no consistent rhythm.
- `!important` overrides on shared button utilities defeat the design-system intent:
  - `btn-primary !text-[12.5px] sm:!text-[13px] !py-2 !px-3 sm:!px-3.5 md:!px-5` — site-header.tsx:78 (sign-up CTA shrunk for mobile)
  - `btn-secondary !py-1.5 !px-3 !text-[12.5px]` — booking-row-actions.tsx:56
  - `btn-primary !py-2.5 !px-4 !text-[13px]` — search-filters.tsx:157
  - `btn-primary !py-2 !text-[13px]` — calendar-mode-picker.tsx:152
  - `btn-primary !py-3.5 !px-6 !text-[15px]` — for-clinics.tsx:61, onboard-form.tsx:427
  - `btn-secondary !py-3.5 !px-6 !text-[15px]` — for-clinics.tsx:71,79

  At least 4 distinct sizings for the "primary button" exist, all overriding the shared component. This means there is no working "primary button" — only a default that gets overridden every time. Codify as `btn-primary`, `btn-primary-sm`, `btn-primary-lg`.

- Arbitrary pixel paddings: `pt-12 md:pt-20 pb-14 md:pb-24` (page.tsx:44), `py-8 md:py-14`, `py-14 md:py-20`, `py-16 md:py-24`. Sections use 4 distinct rhythm pairs.
- `px-3 sm:px-5 md:px-8 h-[60px] md:h-[68px]` (site-header.tsx:25) defines a non-standard 60→68px header. The dashboard layout (dashboard/layout.tsx:24) uses `h-[60px] md:h-[64px]`. Two different "site headers" with two different mobile/desktop heights.

**Recommendation:** Introduce a Tailwind theme spacing extension:
```ts
spacing: { '18': '4.5rem', '22': '5.5rem', '30': '7.5rem' }
```
And constrain the team to `1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32` only — no half-steps for gaps; reserve half-steps for fine vertical rhythm where genuinely needed.

### Pillar 6: Experience Design (3/4)

**Strengths:**
- **Loading states present** in 17 components. The slot-grid (`slot-grid.tsx:76`), dynamic ClinicMap import (`search-results.tsx:14-19`) with a teal spinner, the onboard-form's `Loader2` icon, the WorkingHoursEditor saved-state confirmation are all real.
- **Empty states present** in 13 components. The home empty (`account-bookings.tsx:125-141`) is best-in-class: friendly title, body explaining what'll appear, primary CTA back into the funnel.
- **Error states** in 13 components — auth errors render in coral-tinted boxes; booking conflicts have a specific message ("Sorry — this slot was just taken. Pick another."); patient cancel surfaces `errorMessages` keyed by reason (`not_found`, `too_late`, `already_cancelled`, `server_error`).
- **Optimistic UI** in `publish-toggle.tsx:17-32` and `calendar-mode-picker.tsx:31-45` — both use `useState` for immediate feedback, then revert on server failure.
- **Destructive confirmation** in `account-bookings.tsx:251-279` — inline confirmation panel before cancel runs. Two clicks, not one.
- **RTL is real, not a `dir="rtl"` attribute and a prayer:**
  - `globals.css:259-268` flips search-field borders LTR→RTL
  - `globals.css:31-33` swaps the body font stack to Cairo for RTL
  - `globals.css:110-115` zeros out negative tracking on display headings in RTL (Cairo doesn't carry tight tracking gracefully)
  - 11 ArrowRight uses are paired with `rtl:rotate-180`
  - `mobile-nav.tsx:122-124` slides drawer in from `start-0`, with `-translate-x-full rtl:translate-x-full`
  - `dashboard-nav.tsx:21-22`, `legal-shell.tsx:56` use `start`/`end` logical properties, not `left`/`right`
- **Focus management:** `mobile-nav.tsx:70-77` registers Escape-to-close, body-scroll-lock on open. `:104-107` sets `role="dialog"`, `aria-modal`, `aria-label`.

**Gaps:**
- **`transition-all` violations** at 4 sites (Top-10 #7) — `dentist-card.tsx:28`, `page.tsx:178`, `search-results.tsx:98`, `calendar-mode-picker.tsx:109`. Project rules forbid this.
- **Bare `…` ellipsis** as the only loading affordance (Top-10 #6) on 6 primary CTAs. When a user taps "Sign in", the button text becomes `…`. There's no spinner, no progress indicator, just three dots. Replace with a Loader2 spinner like the onboard form already does.
- **Bookings table renders raw status strings** (Top-10 #2). `bookings-table.tsx:98` outputs `{a.status}` — literally `"pending"` or `"confirmed"` in English on the dashboard, regardless of locale.
- **`account-bookings.tsx:115-117`** — uses `window.location.href = '/${locale}/signin'` instead of the next-intl `router.push`. Loses next.js client-side nav benefits and reloads the entire app for a redirect that should be soft.
- **Map filter empty state** (`clinic-map.tsx:125-135`): when filters return 0 mapped clinics, the message is "No clinic locations to display." It should suggest: "Try a different area" or "Switch back to list view."
- **`shadow-2xl`** in `mobile-nav.tsx:122` and `search-filters.tsx:64` — uses Tailwind's default shadow rather than the custom shadows defined in `tailwind.config.ts:65-71`. Mobile drawer should use `shadow-card-hover` or a new tier; consistency matters.
- **Map attribution** at `clinic-map.tsx:192` is right-aligned but uses physical `right-1` instead of logical `end-1`. RTL users see it on the left, which is fine for an attribution but inconsistent with the rest of the app's logical-property discipline.

**Loading state inventory (which surfaces have it):**
- ✅ Sign in / sign up (bare `…`)
- ✅ Booking submit (bare `…`)
- ✅ Cancel booking (bare `…`)
- ✅ Onboard submit (Loader2 spinner — best-in-class)
- ✅ Working hours save (bare `…`)
- ✅ Slot grid fetch (text "Loading slots…")
- ✅ Map dynamic import (teal spinner)
- ✅ GCal disconnect (bare `…`)
- ❌ KPI tiles, leaderboard, action queue all SSR-only — refresh requires full page reload. No skeleton states. For an MVP this is fine; flag for v2.

---

## Cross-Cutting Issues

### RTL audit
- **Strong.** Logical properties (`start`/`end`, `ms-`/`me-`) used throughout. Arabic-specific font stack swap. Display headings explicitly opt out of negative tracking in RTL.
- One soft miss: `clinic-map.tsx:192` map attribution uses `right-1` (physical). Trivial.
- AR strings inline in components (`for-clinics/page.tsx:73,99,127,...`) do correctly render Arabic, but they're outside the i18n contract. A translator can't update them.

### Mobile audit
- Dashboard layout (`dashboard/layout.tsx:42`) hides the sidebar nav above a 220px breakpoint via `md:grid-cols-[220px_1fr]` — but `DashboardNav` uses `flex md:flex-col` and `overflow-x-auto no-scrollbar`. So on mobile, dashboard nav becomes a horizontal scroll strip. That works, but the visual transition between mobile-strip and desktop-sidebar isn't designed; it just works.
- Mobile nav drawer (mobile-nav.tsx) is well-considered: user identity header, primary CTA, browse section, sticky bottom sign-out.
- Search filters use a bottom-sheet pattern on mobile (`search-filters.tsx:55-82`), which is correct.
- `for-clinics/page.tsx:48` h1 hits 36px on mobile — readable, not cramped.

### Accessibility audit
- `aria-hidden` on decorative icons: 106 usages, comprehensive.
- `aria-label` on icon-only buttons: 10 usages — present on hamburger, modal close, brand-mark link, locale switcher, working-hours time inputs.
- `role="dialog"` + `aria-modal` on mobile drawer.
- `role="switch"` + `aria-checked` on publish toggle (publish-toggle.tsx:67-68). Good.
- **Gaps:**
  - Booking row WhatsApp/Copy/Call buttons in `bookings-table.tsx:140-168` don't carry aria-labels for the icon component on the WhatsApp button — though the visible "WhatsApp" text covers it.
  - Slot-grid time buttons (`slot-grid.tsx:104-115`) show only the formatted time — screen reader users hear "10:30" with no context about which day it belongs to. Add `aria-label={`Book ${dayLabel} at ${time}`}`.
  - Star icon on dentist card (`dentist-card.tsx:69`) is decorative-marked but the surrounding text "New" implies a rating. Could mislead screen reader users.

### Brand consistency audit
- `BrandMark` (brand-mark.tsx) renders the JPG logo + "Dental **Map**" wordmark with teal accent on "Map" only. Consistent everywhere it's used (header, footer, dashboard layout).
- Logo file is `/dental-map-logo.jpg` — a JPG, not SVG. Will pixelate on hi-DPI. Convert to SVG for crispness.
- `Image alt=""` on the brand mark (`brand-mark.tsx:12`) is correct (decorative — the parent `<Link>` has `aria-label={t("name")}`).

### Pre-launch leftovers found
- `Dashboard.bookingsEmpty = "No bookings yet — patient-side search ships next week."` — known placeholder, presumably stale now that patient search is shipped.
- `Dashboard.clinicPlaceholder = "Full clinic profile editor ships next. For now we're onboarding pilot clinics manually."` — used by `dashboard/clinic/page.tsx:78`. This contradicts the now-shipped onboard form; check if the clinic editor page should link to onboarding.
- `site-footer.tsx:31` links to `/brief.html` from "For clinics" — that's a static HTML file in `/public`, not an i18n-aware route. Should that be public? Likely a leftover from internal sharing.

### Self-audit checklist (project's own anti-generic rules)
| Rule from CLAUDE.md | Status |
|---|---|
| No default Tailwind blue/indigo | PASS — zero matches |
| Layered, color-tinted shadows | PASS — `shadow-card`, `shadow-tile`, `shadow-glow`, `shadow-search` are all teal/ink-tinted with two-stop drop |
| Display + body font pair | PASS — Plus Jakarta + Manrope + Cairo |
| Tight tracking on large headings | PASS — `display-h1` has `letter-spacing: -0.03em` |
| Multi-radial gradients with grain | PARTIAL — `hero-wash` has 2 radial gradients; no SVG noise filter applied anywhere |
| Animate only `transform`/`opacity` | FAIL — 4 `transition-all` instances |
| Hover/focus/active on every clickable | PASS — buttons have all three; `:focus-visible` is global teal |
| Image gradient overlay + mix-blend | N/A — no editorial photos in current build |
| Layered surface depth | PARTIAL — bento dashboard tiles all sit on the same z-plane |
| No `transition-all` | FAIL — 4 violations (above) |

---

## Files Audited (44)

### Patient surfaces
- `app/[locale]/(patient)/page.tsx`
- `app/[locale]/(patient)/search/page.tsx`
- `app/[locale]/(patient)/dentist/[slug]/page.tsx`
- `app/[locale]/(patient)/book/[clinicDentistId]/page.tsx`
- `app/[locale]/(patient)/book/[clinicDentistId]/success/page.tsx`
- `app/[locale]/(patient)/account/page.tsx`
- `app/[locale]/(patient)/onboard/page.tsx`
- `app/[locale]/(patient)/for-clinics/page.tsx`
- `app/[locale]/(patient)/specialties/page.tsx`
- `app/[locale]/(patient)/areas/page.tsx`
- `app/[locale]/(patient)/privacy/page.tsx` (read by reference)
- `app/[locale]/(patient)/terms/page.tsx` (read by reference)
- `app/[locale]/(patient)/cancellation/page.tsx` (read by reference)
- `app/[locale]/(patient)/cookies/page.tsx` (read by reference)

### Patient components
- `components/patient/dentist-card.tsx`
- `components/patient/search-results.tsx`
- `components/patient/search-filters.tsx`
- `components/patient/clinic-map.tsx`
- `components/patient/slot-grid.tsx`
- `components/patient/booking-form.tsx`
- `components/patient/account-bookings.tsx`
- `components/clinic/onboard-form.tsx`

### Dashboard
- `app/[locale]/(dentist)/dashboard/layout.tsx`
- `app/[locale]/(dentist)/dashboard/page.tsx`
- `app/[locale]/(dentist)/dashboard/calendar/page.tsx`
- `app/[locale]/(dentist)/dashboard/clinic/page.tsx`
- `app/[locale]/(dentist)/dashboard/bookings/page.tsx`
- `components/dashboard/dashboard-nav.tsx`
- `components/dashboard/bookings-table.tsx`
- `components/dashboard/booking-row-actions.tsx`
- `components/dashboard/working-hours-editor.tsx`
- `components/dashboard/calendar-mode-picker.tsx`
- `components/dashboard/gcal-connection-card.tsx`
- `components/dashboard/publish-toggle.tsx`
- `components/dashboard/sign-out-button.tsx`
- `components/dashboard/bento/today-schedule.tsx`
- `components/dashboard/bento/kpi-tile.tsx`
- `components/dashboard/bento/leaderboard-tile.tsx`
- `components/dashboard/bento/action-queue-tile.tsx`
- `components/dashboard/bento/calendar-health-tile.tsx`

### Auth + chrome
- `app/[locale]/layout.tsx`
- `app/[locale]/(patient)/layout.tsx`
- `components/auth/signin-form.tsx`
- `components/auth/signup-form.tsx`
- `components/site-header.tsx`
- `components/site-footer.tsx`
- `components/mobile-nav.tsx`
- `components/brand-mark.tsx`
- `components/locale-switcher.tsx`
- `components/legal/legal-shell.tsx`
- `components/placeholder-page.tsx`

### Tokens
- `app/globals.css`
- `tailwind.config.ts`
- `messages/en.json` (plus `messages/ar.json` by parity)
