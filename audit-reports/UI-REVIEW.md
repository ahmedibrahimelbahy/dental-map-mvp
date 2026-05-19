# UI/UX Visual Review — Dental Map MVP
_Date: 2026-05-17 | 6-pillar audit (code-only; live HTML sampled from https://dentalmap.app)_

This is an adversarial audit. Pillar scores are not averaged upward to soften findings. Where a single issue breaks the design contract (missing Tailwind classes that silently no-op, RTL accessibility regressions), the affected pillar takes the full deduction even if the rest of the pillar is otherwise solid.

---

## Overall scores (out of 10)
- Visual hierarchy: **7/10**
- Typography: **5/10**
- Color & contrast: **7/10**
- Spacing & layout: **7/10**
- Interaction states: **5/10**
- Polish & craft: **6/10**
- **Total: 37/60**

Average craft is well above generic Tailwind/shadcn output — the custom teal/ink palette, layered shadows (`shadow-card`, `shadow-card-hover`, `shadow-search`, `shadow-teal-glow`), Jakarta+Cairo pairing, and intentional `.btn-primary`/`.search-field` components show real care. The grade is dragged down by (a) **silently-failing class names that aren't defined in `tailwind.config.ts`**, (b) **hardcoded English strings inside otherwise i18n'd flows**, (c) an **uncontrolled type scale** (20+ ad-hoc px sizes on a single page), and (d) **missing skeleton/empty-state polish** in the patient-critical search and slot picker.

---

## High-impact fixes (do these first)

### U1. `shadow-glow`, `border-ink-150`, `shadow-tile` are referenced but **not defined** in `tailwind.config.ts` — they silently no-op
**Where:**
- `tailwind.config.ts` — `boxShadow` block defines `card`, `card-hover`, `search`, `teal-glow` only. No `glow`, no `tile`.
- `colors.ink` scale defines 50/100/200/300/400/500/600/700/800/900 — no `150`.
- Consumers (production code, not worktree leftovers):
  - `components/clinic/onboard-form.tsx:284, 385, 446, 461, 802, 922, 935, 973, 977, 906` — `shadow-glow` repeatedly used for the entire pricing+CTA visual treatment, and `border-ink-150` on inactive package cards / validity buttons.
  - `components/header-search.tsx:50` — header search input border is `border-ink-150`. In runtime this becomes **no border** (only `border` resets thickness, no color → transparent).
  - `components/patient/search-results.tsx:119` — sort dropdown `border-ink-150`.
  - `components/mobile-nav.tsx:247` — primary signup CTA in drawer uses `shadow-glow`.
  - `app/[locale]/(patient)/for-clinics/page.tsx:61` — hero Apply CTA uses `shadow-glow`.
  - `app/[locale]/(dentist)/dashboard/page.tsx:165` — pending-review banner icon uses `shadow-glow`.
  - `components/auth/role-picker.tsx:72` — `hover:shadow-tile` on role cards.

**Pillar:** Polish & craft, Visuals
**Issue:** Every place the design "feels lift/depth" is supposed to come from `shadow-glow`, the class outputs nothing. The header search input has no visible border in production. The pricing cards and the hero Apply CTA — both of which are conversion-critical — are paying the cost of inconsistent depth without realizing it. This is the single biggest "looks fine but the design intent is being silently discarded" bug in the codebase.
**Fix:** Add to `tailwind.config.ts`:
```ts
boxShadow: {
  // existing...
  glow: "0 0 0 1px rgba(30,165,143,0.12), 0 12px 32px -10px rgba(30,165,143,0.40)",
  tile: "0 2px 4px rgba(15,27,42,0.04), 0 12px 28px -12px rgba(15,27,42,0.14)",
},
colors: {
  ink: {
    // existing...
    150: "#D7DDE5", // between 100 (#E4E7EB) and 200 (#CBD1D9)
  },
},
```
Or do a project-wide replace: `border-ink-150` → `border-ink-200`, `shadow-glow` → `shadow-teal-glow`, `shadow-tile` → `shadow-card-hover`. Either way, audit `git grep -nE "shadow-(glow|tile)|ink-150"` after the fix.

### U2. `transition-all` used in 3 places, against the project's explicit "never use transition-all" rule
**Where:**
- `components/header-search.tsx:50` — search input
- `components/auth/role-picker.tsx:72` — role card
- `components/clinic/onboard-form.tsx:1003` — pricing PackageCard

**Pillar:** Polish & craft (anti-generic guardrails)
**Issue:** `transition-all` animates `box-shadow`, `background-color`, `border-color`, `width`, `height`, layout — every changed property. On Egypt mobile traffic (older Androids, throttled CPUs), this is exactly the spec violation the guardrail exists for. The rest of the codebase correctly uses `transition-colors`, `transition-transform`, or explicit `transition-[transform,box-shadow,border-color]`. These three places break that pattern.
**Fix:** Replace each `transition-all` with the explicit prop list. PackageCard for example: `transition-[box-shadow,border-color,background-color]` (no `transform` since the card doesn't translate on selection).

### U3. Hardcoded English strings in i18n'd flows — visible to Arabic users
**Where:**
- `components/clinic/onboard-form.tsx:1047` — pricing PackageCard footer:
  ```tsx
  <Check className="..." aria-hidden />
  Selected
  ```
  Arabic users see the English word "Selected" inside an otherwise Arabic pricing screen.
- `components/mobile-nav.tsx:163, 178` — `aria-label="Close"` on both X buttons (signed-in header X and signed-out X). Arabic screen reader users hear "Close" instead of "إغلاق".
- `components/patient/search-filters.tsx:62` — `aria-label="Close"` on filter drawer backdrop.
- `components/patient/search-results.tsx:140-141, 161-162` — list/map toggle labels are `isAr ? "قائمة" : "List"` / `"خريطة" / "Map"` and the disabled tooltip strings (`"لا توجد إحداثيات لعرض الخريطة" / "No location data to show on map"`) — **inlined in the component instead of in `messages/{ar,en}.json`**. They work, but they bypass the translation pipeline so they're invisible to a translator audit.
- `app/[locale]/(patient)/page.tsx:262` — `Step · {num}` is hardcoded latin even in Arabic. The dot is fine (universal), but "Step" never translates.
- `app/[locale]/(patient)/clinic/[slug]/page.tsx:273, 281` — `dentist`/`dentists`/`specialty`/`specialties` are inline ternaries for the English locale (it's an inline plural at least), but **the AR version is just `"طبيب"` / `"تخصص"` with no plural form** — Arabic plural inflection is required for ≥3 (`أطباء` / `تخصصات`). The count stats card therefore reads "2 طبيب" instead of "طبيبان" or "2 أطباء".
- `app/[locale]/(patient)/book/[clinicDentistId]/page.tsx` and `components/patient/booking-form.tsx:107` — disabled-submit pending text is `{pending ? "…" : t("submit")}`. The ellipsis is not localized at all (no i18n key) and provides no real progress feedback.

**Pillar:** Typography (Arabic-specific) + Experience Design
**Issue:** A user who picked Arabic and is filling out the pricing/onboard step sees an English "Selected" badge on the most prominent selection state. Screen-reader Arabic users hear English "Close" on every X button. This is the kind of "half-localized SaaS" the For Clinics page promises Dental Map is not.
**Fix:**
- Add `"selected": "تم الاختيار" / "Selected"` to `Onboard` namespace and use `labels.selected` in PackageCard.
- Add `Nav.close` and pass it through `MobileNav.labels.close`, then use it instead of literal `"Close"`. Same for `SearchFilters` — accept a `close` label.
- Move list/map toggle labels into `messages/*.json` under `Search.viewList` and `Search.viewMap`.
- Replace `links.length === 1 ? "dentist" : "dentists"` with `t("Profile.dentistCount", { count: links.length })` and add ICU plural to both ar.json and en.json (matches the pattern already in use for `Search.clinicCardDentistCount`).
- Replace `"…"` with a `<Loader2 className="w-4 h-4 animate-spin" />` icon plus `t("submitting")`.

### U4. Slot picker (the patient-critical CTA on every dentist profile) has no skeleton, no error state, and the booking grid buttons read as low-priority
**Where:** `components/patient/slot-grid.tsx:76` (loading) and `:84-122` (slot buttons)
**Pillar:** Interaction states, Visual hierarchy
**Issue:**
1. While slots fetch, the user sees a single line of grey text `Loading slots…` / `بنجيب المواعيد…`. On a typical 3G Egyptian mobile connection this can be 600-1500ms of "is anything happening?" The rest of the design uses proper spinners; this critical action does not.
2. There is **no error state** — `.catch(() => setSlots([]))` collapses every network failure into "no slots available", which is wrong copy and misleads the patient into trying a different dentist when the real problem is connectivity.
3. The slot buttons themselves are styled as **tertiary** chips (`border-ink-100 text-ink-700`). On a dentist profile, picking a slot IS the primary CTA — it should be visually weightier than the booking-form button later in the funnel. Compare to Vezeeta/Cleeves where slot tiles are filled tile cards with hover lift.

**Fix:**
1. Render `Array.from({length:7})` skeleton day-blocks with 4-5 placeholder pills each (`bg-ink-100 animate-pulse h-11 w-16 rounded-lg`).
2. Track `setSlots(null)` on error separately from `setSlots([])`; show an inline retry: "Couldn't reach the calendar — [Try again]". RTL: "ما قدرناش نوصل للأجندة — [حاول تاني]".
3. Treat the next-available slot specially: render the first day's first slot as a teal-filled tile with `chevron-right` and the rest as outlined. "Closest" deserves more weight than "any slot in the next 7 days."

### U5. Search empty state is a dead end
**Where:** `components/patient/search-results.tsx:201-209`
**Pillar:** Experience Design, Copywriting
**Issue:** When zero dentists match, the user sees a centered card with `emptyTitle` ("No matches yet") and `emptyBody` ("Try widening your filters, or browse all dentistry below.") — but **there is no "browse all dentistry below."** The card sits alone with no CTA, no "Clear filters" button, no specialties grid. The Arabic copy promises something the screen doesn't deliver.
**Fix:** Add a primary "Clear filters" button (`Link` to `/search`) and a secondary "Browse by specialty" link inside the empty card. Or render the specialties chip grid below the empty card to fulfil the copy promise.

### U6. Booking form name field is `readOnly + opacity-70` with no affordance to fix it
**Where:** `components/patient/booking-form.tsx:62-70`
**Pillar:** Experience Design, Visual hierarchy
**Issue:** The patient's name is rendered in a faded input with no helper text and no "Edit in account" link. If their profile name is wrong (very common with Arabic-named patients who registered with auto-completed transliterations), they have no path to fix it from the booking screen and may submit a booking under the wrong name.
**Fix:** Either (a) drop the field entirely and show the name in the right-side summary card as `<dd>` content, or (b) keep the field but add a small "Not you? Edit in account ↗" link below it, opening `/account` in a new tab.

---

## Medium-impact polish

### U7. 20+ ad-hoc font sizes across the patient home alone — no real type scale
**Where:** Sampled from live HTML of `https://dentalmap.app/en`:
`text-[10.5px], text-[11px], text-[12px], text-[12.5px], text-[13px], text-[13.5px], text-[14px], text-[14.5px], text-[15px], text-[15.5px], text-[16px], text-[17px], text-[19px], text-[22px], text-[26px], text-[28px], text-[30px], text-[38px], text-[44px], text-[72px], text-[84px]` — at least 21 distinct values on the home page.

**Pillar:** Typography
**Issue:** A type scale is a fixed set of about 8 values (e.g. 12/14/16/18/22/28/36/48/72). Once you have 21, the implementation has effectively no scale — every component picks its own number and the eye reads it as inconsistent. The 0.5px increments (`13.5`, `14.5`, `15.5`) in particular are sub-pixel adjustments invisible to most users but adding cognitive load to the codebase.
**Fix:** Decide on the scale (e.g. `text-meta` 12, `text-body-sm` 13.5, `text-body` 15, `text-body-lg` 17, `text-h4` 20, `text-h3` 26, `text-h2` 36, `text-h1-mobile` 44, `text-h1-desktop` 72/84). Add them as Tailwind `fontSize` tokens. Replace ad-hoc `text-[Xpx]` over a session.

### U8. Pricing PackageCard has duplicate "selected" affordances
**Where:** `components/clinic/onboard-form.tsx:999-1051`
**Pillar:** Visual hierarchy
**Issue:** When a package is selected, the card shows simultaneously: a thick ring (`ring-2 ring-teal-500/30`), a glow shadow (which is broken, see U1), a filled-teal "Selected" footer bar inside the card with a check icon. Three competing "selected" signals = none of them lands clearly. Compare to Stripe Pricing where one signal — the border color — does the entire job.
**Fix:** Pick one. Keep the filled footer bar (it doubles as "Confirm your choice" feedback) and drop the ring. Or keep the ring and drop the footer. The check at the top of the card (already on each feature row) is unnecessary in both cases.

### U9. Admin GMV strip has WCAG AA contrast issues on body copy
**Where:** `app/[locale]/(ops)/admin/page.tsx:119-122` and `:111`
**Pillar:** Color & contrast
**Issue:** `text-white/60` on `bg-gradient-to-br from-ink-900 to-ink-800` resolves to ~rgb(255 255 255 / 0.6) on `#0F1B2A`. Effective foreground ≈ `#9AA0A6`, contrast ≈ 4.0:1 — below the 4.5:1 WCAG AA threshold for normal-weight 12px text. The "Marketplace GMV · last 30 days" eyebrow at `text-white/60` and the explanation text below at `text-white/60` both fail.
**Fix:** Bump to `text-white/80` (≈5.3:1) for the explanation paragraph. Keep the eyebrow at `text-white/60` if you bold-weight it (5pt+ bold uses the 3:1 threshold).

### U10. Header search input is `border-ink-150` (= no border, see U1) → input visually merges with `bg-white` page background
**Where:** `components/header-search.tsx:50`
**Pillar:** Visual hierarchy, Polish & craft
**Issue:** After U1 is fixed (or as a workaround until then), the header search renders as a borderless white pill on a white-ish header. The `bg-white/85 backdrop-blur-md` parent only helps when content scrolls behind it. Above-the-fold, the search input is invisible until hovered.
**Fix:** `border-ink-200` (defined) or add a subtle inset shadow `shadow-[inset_0_0_0_1px_rgba(15,27,42,0.06)]` for a "no border but tactile" treatment.

### U11. RTL flips of `ArrowRight` are inconsistent
**Where:** Multiple files mix `rtl:rotate-180` with the standard ArrowRight icon, but a few spots don't:
- `app/[locale]/(patient)/clinic/[slug]/page.tsx:195-198` — dentist row arrow has `rtl:rotate-180` ✓
- `app/[locale]/(patient)/book/[clinicDentistId]/success/page.tsx:35` — back-to-home arrow has `rtl:rotate-180` ✓
- `components/patient/dentist-card.tsx:82` — "Book" arrow has `rtl:rotate-180` ✓
- `components/clinic/location-picker.tsx` (not read but worth grepping) — likely missing per pattern

**Pillar:** Typography (RTL), Polish & craft
**Issue:** Pattern is mostly correct but worth an automated audit. A missed `rtl:rotate-180` makes the arrow point the wrong direction in Arabic — patients read "book" as if the action is to go back.
**Fix:** Add an ESLint rule or a custom `<Arrow direction="forward" />` wrapper that handles RTL once. Grep `git grep -nE '<ArrowRight' | grep -v 'rtl:rotate-180'` and audit each match.

### U12. Map popup uses raw `<a href>` instead of next-intl `<Link>`
**Where:** `components/patient/clinic-map.tsx:189-193`
**Pillar:** Experience Design
**Issue:** Clicking the "احجز" / "Book" link inside a leaflet popup triggers a full page reload (no client transition, no prefetch). On 3G, this adds 800ms+ to the booking funnel. Also, the locale prefix is hand-rolled (`/${locale}/dentist/${c.dentistSlug}`) — fragile to future i18n routing changes.
**Fix:** Render the popup content via React's `Popup` children (already doing this) but swap `<a>` for the next-intl `Link`. Leaflet keeps its DOM separate but the Next.js Link will still hydrate inside the popup.

### U13. Slot buttons fail the 44×44px tap-target rule on density-2 phones
**Where:** `components/patient/slot-grid.tsx:103-115`
**Pillar:** Spacing & layout (mobile)
**Issue:** `min-h-[44px]` is set ✓ but horizontal padding is `px-3` (= 12px each side). At `text-[13px]` font and ~50px button width for "10:30", neighboring buttons have only `gap-2` (8px). On a 5.5" Android the buttons compress to ~46px wide × 44px tall — fine vertically but two buttons are 100px apart center-to-center, so fat-finger errors are common.
**Fix:** Bump to `gap-2.5` or `gap-3`, and `px-3.5` to widen the buttons. Goal: ≥56px center-to-center spacing.

### U14. "For Clinics" hero CTA stack on mobile loses the secondary CTA below the fold
**Where:** `app/[locale]/(patient)/for-clinics/page.tsx:58-85`
**Pillar:** Visual hierarchy
**Issue:** `flex flex-col sm:flex-row` stacks the two CTAs vertically on mobile. Primary "Apply" is `btn-primary` (filled teal, lifted), secondary "Sign in" is `btn-secondary` (white outline). At 375×667 viewport, the secondary CTA pushes below the fold on iPhone SE — and the hero is the main conversion screen for the marketing site. Most clinic admins will scroll, but you're losing the ones who don't.
**Fix:** On mobile, render the secondary CTA as a smaller `btn-ghost` inline under the primary, not as another full-width button. Or move the secondary CTA to a thin "Already onboarded? [Sign in →]" link above the hero copy.

### U15. Dashboard `PendingReviewBanner` icon uses broken `shadow-glow`
**Where:** `app/[locale]/(dentist)/dashboard/page.tsx:165`
**Pillar:** Polish & craft
**Issue:** Same as U1, but worth flagging separately because this is the *first thing* a clinic admin sees after onboarding. The intended "this is important, attention here" glow effect is missing.
**Fix:** After U1 lands, this auto-fixes. In the meantime, an inline `style={{ boxShadow: "0 8px 24px -8px rgba(245,158,11,0.55)" }}` matches the success card's pattern.

### U16. Onboard success card amber gradient + amber CTA + amber pending pill + teal "Back to home" button creates a 4-color spread on a single screen
**Where:** `components/clinic/onboard-form.tsx:282-319`
**Pillar:** Color & contrast
**Issue:** Background gradient `from-amber-50 via-white to-white`, large amber-500 icon with a 14px white check, amber-100 "Pending approval" pill, amber-200 border, teal `btn-primary` CTA. Plus the inner detail card has teal phone/email icons next to amber Clock. The screen reads "is this a success state, a warning state, or a teal-branded action?" all at once.
**Fix:** Commit to amber as the "pending/awaiting" semantic color. Change the CTA to `btn-secondary` (white with ink border) so the teal isn't fighting amber. Or commit to teal as the dominant brand and drop the amber gradient — use a small amber dot or pill only as the status indicator.

---

## Low-impact nitpicks

### U17. Brand wordmark stays Latin "Dental Map" even in Arabic locale
**Where:** `components/brand-mark.tsx:19-20`
**Pillar:** Typography
**Issue:** Defensible (brands often keep one canonical wordmark), but the Arabic logo treatment used on `brand_assets` (if any) should at least appear in messages or be an option. Right now the only Arabic brand string is in `Brand.name` ("دنتال ماب") and it's never used in the visible header.
**Fix:** Either (a) accept Latin wordmark as final and document the decision, or (b) render `<span dir="ltr">Dental Map</span>` so a translator audit doesn't flag it as "untranslated", or (c) swap to an Arabic-script wordmark in `html[dir="rtl"]`.

### U18. `aria-hidden` overuse on decorative images means screen readers skip the dentist photo entirely
**Where:** `components/patient/clinic-card.tsx:43-47`, `app/[locale]/(patient)/dentist/[slug]/page.tsx:154-161`
**Pillar:** Accessibility (Experience Design)
**Issue:** `alt=""` + `aria-hidden` on hero images is correct for purely decorative images. But on the dentist profile, the photo is conceptually meaningful (it's how patients recognize their dentist on arrival). Consider `alt={dentist.name_en}` so a screen reader user has parity with sighted users.
**Fix:** Remove `aria-hidden` and set `alt={name}` on dentist photos. Keep `aria-hidden` only on hero/banner imagery.

### U19. `*:focus-visible` global ring is 6px border-radius, but most actual buttons are 12px (`btn-primary`) — focus ring corners protrude past the button
**Where:** `app/globals.css:36-40`
**Pillar:** Polish & craft
**Issue:** The focus ring outline has its own `border-radius: 6px` which won't match a 12px-radius button — the ring corners visibly stick out. Most browsers compensate by drawing the outline around the actual element shape, but the explicit 6px override forces a square-ish rectangle.
**Fix:** Drop `border-radius: 6px` from the `*:focus-visible` rule — let the browser inherit the element's own radius. Or use `outline-offset: 3px` alone without setting a radius.

### U20. Status pill ("statusNoShow" → "Missed" / "مجاش") in account-bookings has 10.5px text
**Where:** `components/patient/account-bookings.tsx` (not read but pattern matches admin StatusPill which uses `text-[10.5px]`)
**Pillar:** Typography
**Issue:** 10.5px is below the practical reading threshold on most phones. The status is functional, not decorative — the patient needs to read it to know whether their booking is confirmed.
**Fix:** Bump to `text-[11.5px]` (still small enough to fit visually) and apply `font-bold` (already done).

### U21. Hardcoded inline AR strings instead of i18n
**Where:** various — e.g. `app/[locale]/(patient)/dentist/[slug]/page.tsx:91` (`{isAr ? "موثق" : "Verified"}`), `app/[locale]/(patient)/clinic/[slug]/page.tsx:137` (`{isAr ? "أطباء العيادة" : "Our dentists"}`), `app/[locale]/(patient)/clinic/[slug]/page.tsx:210` (`{isAr ? "أقرب موعد متاح" : "Next available slot"}`), search-results.tsx and clinic-map.tsx inlines, etc.
**Pillar:** Copywriting (i18n discipline)
**Issue:** Works at runtime but bypasses the i18n catalog, so a translator agency review can't see these strings. Eventually a copy update will land in the JSON but miss these.
**Fix:** Sweep with `git grep -nE '\\?\\s*"[^"]*[\\u0600-\\u06FF]'` (Arabic Unicode in code, which signals an inline AR string) and migrate each to the messages files.

### U22. Pricing prefix uses an emoji
**Where:** `messages/en.json:369` — `"pricingAreaPrefix": "📍"`
**Pillar:** Polish & craft
**Issue:** The rest of the codebase uses Lucide icons (`MapPin`) consistently. The emoji ships in user's font rendering pipeline (varies by OS), often appears as Apple emoji on iPhone but Twemoji on Android — colors don't match the brand teal. The component does render a `<MapPin />` next to this string, so the emoji is redundant.
**Fix:** Change to `""` (empty string) — the existing `<MapPin />` provides the icon.

### U23. Booking summary card "Fee" line uses `font-display text-[20px] font-bold` but the dentist profile fee block uses `font-display text-[36px]`
**Where:** `app/[locale]/(patient)/book/[clinicDentistId]/page.tsx:121-123` vs `app/[locale]/(patient)/dentist/[slug]/page.tsx:166`
**Pillar:** Visual hierarchy
**Issue:** The fee value shrinks dramatically (-44%) between the profile page and the booking summary — counter to the rule that "as the user gets closer to the action, the price should stay big or get bigger." A patient who saw 600 EGP on the profile then sees a small "600 EGP" on the booking screen and may second-guess.
**Fix:** Bump booking summary fee to `text-[28px]` or `text-[32px]`. Match the dentist-profile aside or get within 20%.

### U24. SignIn form error uses `border-coral-500/40 bg-coral-100/60` — but `coral-500` is the **brand accent for offer/new badges** per tailwind config comment
**Where:** `components/auth/signin-form.tsx:71`
**Pillar:** Color & contrast (semantic conflict)
**Issue:** The config says coral is reserved for "offer/new badges" but error messages use it too. This is a real semantic collision — a user could see a coral accent and not know if it means "this is new!" or "this is broken." Other error states in the codebase (onboard-form, ops actions) correctly use `rose-50 / rose-200 / rose-800` — sign-in is the outlier.
**Fix:** Move sign-in error to the same rose treatment used elsewhere: `rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800`.

---

## RTL/Arabic-specific findings

### R1. Arabic typography is mostly well-tuned — but a few gaps
**What works:**
- Cairo font swapped in as primary in `html[dir="rtl"] body` rule. ✓
- `display-h1/h2/h3` letter-spacing reset to `0` for RTL (Cairo glyphs don't want negative tracking). ✓
- `font-feature-settings` "cv02, cv03, cv11" on body is OpenType variants for Manrope — these are no-ops on Cairo so no harm. ✓
- Plural handling uses ICU forms with `=2`, `few`, `many`, `other` — correct for Arabic. ✓

**What's still off:**
- The `small-caps` utility (`text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px`) is applied to RTL strings too. **Arabic has no uppercase**, and Arabic glyphs at 11px with 0.14em tracking are illegible — letters break apart. Examples: `app/[locale]/(patient)/dentist/[slug]/page.tsx:99` (`{t("specialties")}` — "التخصصات" — in `small-caps`), the booking summary `small-caps text-ink-400 mb-1` blocks, the clinic profile "معلومات العيادة" label.
- The chip `.chip` class has `letter-spacing: 0.04em` which similarly degrades Cairo rendering on a Galaxy A-series.
- Hero "بداية التجربة" in Arabic is rendered inside a `chip` with `text-transform: uppercase` indirectly via `.small-caps` (the chip itself doesn't uppercase, but eyebrows do).

**Fix:**
```css
html[dir="rtl"] .small-caps {
  text-transform: none;
  letter-spacing: 0;
  font-size: 12px;
  font-weight: 700;
}
html[dir="rtl"] .chip {
  letter-spacing: 0;
}
```

### R2. Arabic copy density is ~15-20% denser than English — but the type sizes assume English
**Where:** Hero (`heroTitle` + `heroTitleAccent`) is "Better dental care, without the phone tag." (≈37 chars) in EN vs. "عناية أسنان أحسن، من غير لف ودوران." (≈37 chars but Arabic glyphs are visually narrower) — the Arabic line is roughly the same width despite reading "denser." The h1 size (`text-[44px] md:text-[72px] lg:text-[84px]`) holds OK.

But look at hero subtitle in Arabic (`heroSubtitle`): "دوّر على دكاترة أسنان موثوقين في القاهرة، شوف مواعيدهم الحقيقية، واحجز في ثواني — الميعاد اللي تختاره بيدخل على طول في أجندة العيادة." This is ≈195 chars, and the rule `max-w-[62ch]` was tuned for English. In Arabic this becomes a 4-5 line block of dense text where the eye loses track of the line above. Cairo at 17-19px with `leading-[1.6]` is borderline tight for that block length.

**Pillar:** Typography (RTL)
**Fix:** For RTL, use `leading-[1.75]` on long body text (`max-w-[56ch]` instead of 62ch for Arabic). Add a `dir="rtl"` specific rule or pass a different className for the AR layout.

### R3. Hardcoded English aria-labels (covered in U3) particularly hurt Arabic users
Already covered. Worth restating: an Arabic-speaking screen-reader user who taps the mobile-nav X button hears "Close" in English voice — disorienting and unprofessional. This is the lowest-effort high-impact i18n fix in the codebase.

### R4. ICU plural for Arabic in `Profile.experience`
**Where:** `messages/ar.json:92` — `"{years, plural, =0 {من غير خبرة} =1 {سنة خبرة} =2 {سنتين خبرة} few {# سنين خبرة} many {# سنة خبرة} other {# سنة خبرة}}"`
**Pillar:** Copywriting (i18n)
**Issue:** Grammatically correct! But the `few` form (3-10) is "سنين" without a number — actually it reads `# سنين خبرة` so the `#` does inject the number. Good. The `many` form (11-99) drops to singular `سنة` — also grammatically correct for Arabic. **No fix needed**, calling out as a positive example.

### R5. Arabic ":" placement in summary labels
**Where:** `components/patient/dentist-card.tsx:62-63` uses `· ` (interpunct) as a separator. RTL renders that correctly when the dir attribute is set on the parent. But `app/[locale]/(patient)/dentist/[slug]/page.tsx:80-83` joins `t("atClinic")` ("في") with the clinic name and uses raw `·` — fine — but no Arabic comma (`،`) anywhere where lists use English comma (`, `). Not a bug; just an authenticity opportunity.

---

## What's working well

### Brand & color system
- The custom teal palette (50→900) sampled from the logo is **the single best decision in the codebase**. It's distinctive, properly cool-medical without going generic-medical-blue, and the 50/600/700 contrast pairs work for badges/buttons/icons consistently.
- `coral-500` reserved as a true accent (when used correctly) gives the design a second voice without diluting teal.
- The `surface: #F6FAFA` for alternating section backgrounds is a great call — keeps section transitions visible without heavy borders.

### Shadow language
- `shadow-card`, `shadow-card-hover`, `shadow-search`, `shadow-teal-glow` are layered (multiple offsets) and color-tinted (ink-900 with low alpha) — exactly what the project's anti-generic guardrails prescribe. The hero search card with `shadow-search` is genuinely premium-feeling.
- The `shadow-teal-glow` on the booking success page check icon (`app/[locale]/(patient)/book/[clinicDentistId]/success/page.tsx:19`) is the right kind of small celebratory moment.

### Typography pairing
- Jakarta (display) + Manrope (sans) is a sharp, modern pairing that doesn't read as default-system.
- Cairo for Arabic is the right choice — high x-height, readable at small sizes, modern.
- `display-h1` letter-spacing `-0.03em` is the kind of intentional craft most agencies skip.

### Component vocabulary
- The `.search-field` system (border-bottom on mobile, border-right on desktop, RTL-aware) is elegant and reusable.
- `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.chip` / `.field-input` / `.field-label` — having semantic component classes (not just utility soup) makes the codebase auditable and the design enforceable.
- 16px font-size on mobile inputs to prevent iOS Safari zoom — the right detail.

### Specific screens that punch above MVP weight
- **Home hero search card** (`app/[locale]/(patient)/page.tsx:62-131`) — multi-field hero search with eyebrow labels, brand-color icons, and a filled CTA on the side is a Vezeeta-level affordance.
- **Dentist profile right-rail** (`app/[locale]/(patient)/dentist/[slug]/page.tsx:152-230`) — sticky aside with hero, fee, calendar mode hint, and a "open in Google Maps" CTA is a complete affordance set. The teal-bordered Maps button is well-balanced against the white card.
- **Admin GMV strip** (modulo U9 contrast) — the gradient ink card with the teal-tinted Wallet icon and Arabic colloquial copy ("الدفع بيتم في العيادة — Dental Map مش بتقبض") is the right tone for an Egyptian operator dashboard.
- **Onboard pending success state** — even though U16 flags the color overload, the structure (pending badge, timeframe, call note, email note in a sub-card, primary CTA) is genuinely reassuring. With color discipline applied, this is a model success screen.

### Mobile-nav drawer
- Portal-rendered to body, transform-animation only (no `width` transitions), 84% width with 340px cap, Escape key handling, scroll lock — this is genuinely solid mobile drawer work. The only fixes needed are the hardcoded "Close" aria-label (U3) and the broken `shadow-glow` (U1).

---

## Files audited
- `app/layout.tsx`, `app/[locale]/layout.tsx`, `app/globals.css`, `tailwind.config.ts`
- `app/[locale]/(patient)/layout.tsx`, `app/[locale]/(patient)/page.tsx`
- `app/[locale]/(patient)/search/page.tsx`, `app/[locale]/(patient)/dentist/[slug]/page.tsx`, `app/[locale]/(patient)/clinic/[slug]/page.tsx`
- `app/[locale]/(patient)/book/[clinicDentistId]/page.tsx`, `app/[locale]/(patient)/book/[clinicDentistId]/success/page.tsx`
- `app/[locale]/(patient)/onboard/page.tsx`, `app/[locale]/(patient)/for-clinics/page.tsx`, `app/[locale]/(patient)/specialties/page.tsx`
- `app/[locale]/(dentist)/dashboard/page.tsx`, `app/[locale]/(ops)/admin/page.tsx`
- `components/site-header.tsx`, `components/site-footer.tsx`, `components/brand-mark.tsx`, `components/mobile-nav.tsx`, `components/header-search.tsx`
- `components/patient/search-results.tsx`, `components/patient/search-filters.tsx`, `components/patient/clinic-card.tsx`, `components/patient/dentist-card.tsx`, `components/patient/clinic-map.tsx`, `components/patient/slot-grid.tsx`, `components/patient/booking-form.tsx`, `components/patient/account-settings-card.tsx`
- `components/clinic/onboard-form.tsx`
- `components/auth/signin-form.tsx`, `components/auth/role-picker.tsx`
- `components/ops/clinic-row-actions.tsx`
- `messages/en.json`, `messages/ar.json` (partial — through Dashboard namespace)
- Live HTML sampled from `https://dentalmap.app/en` (font-size distribution survey)
