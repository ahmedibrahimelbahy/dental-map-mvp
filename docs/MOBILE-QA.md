# Dental Map · Mobile QA Report

**Date:** 2026-05-06
**Tested viewports:** iPhone 14 (390×844), iPhone SE (375×667)
**Live URL:** https://dentalmap.app
**Tested with:** Playwright MCP (Chromium, mobile viewport emulation)
**Console errors:** 0 across all pages tested
**Auth state:** Not signed in (booking + onboard tested as redirect targets)

---

## Summary

- **Overall mobile health:** **Has issues** — site is usable but two critical bugs would frustrate real patients.
- **Pages tested:** 12 EN routes + 2 AR spot-checks (14 page-loads × 2 viewports = 28 measured states)
- **Issues found:** **15 total** — **2 blockers**, **5 major**, **8 minor**
- **Best news:** zero console errors anywhere, RTL/Arabic layout mirrors correctly, Cairo font loads, dentist profile + slot grid work cleanly, FAQ accordion works, marketing pages (home + for-clinics) are pixel-tight.

---

## Top issues to fix first

1. **Mobile nav drawer collapses to a 60px-tall strip — drawer content (Browse links, Sign-out) is unreachable.** — Every page (header) — **BLOCKER**
2. **`/search` (list view) horizontally overflows by ~44px on iPhone 14 / ~59px on iPhone SE — Map toggle button is clipped off-screen on iPhone SE.** — Search list — **BLOCKER**
3. **`/privacy` (and likely all legal pages) horizontally overflows by 62–77px — Cookies tab and body legal text are clipped.** — Legal pages — **MAJOR**
4. **All form inputs (sign-in, sign-up, search hero) use 15px font — iOS auto-zooms on focus, which is jarring.** — Site-wide — **MAJOR**
5. **Slot-picker buttons on dentist profile are 33px tall (below the 44px iOS HIG tap target). These are the highest-conversion buttons on the site.** — Dentist profile — **MAJOR**

---

## Per-page findings

### `/en` — Home
**Screenshots:** `01-home-en-i14.png`, `15-home-en-iSE.png`
**Status:** **Pass** (with site-wide caveats)

- No horizontal overflow on either viewport.
- Hero search card layout is clean, specialties grid renders 2-up nicely.
- **Hamburger button (`button[aria-label=Menu]`) is 40×40 — 4px under the iOS 44px minimum.** Close to the threshold and easy to miss.
- **Sign up button in header is 68×35 — height 9px under minimum.**
- **Search hero inputs (Specialty, Area, When) are 23px tall** in their visible content area and use 15px font. The visible height is fine (parent card padding compensates), but `font-size: 15px` on the `<input>` triggers iOS Safari to zoom on focus (Safari only stops zooming at 16px+).
- `When` `<select>` is 70px wide — narrow but scrollable native picker so OK.

### `/en/search` (List view) — **BLOCKER**
**Screenshots:** `03-search-list-i14.png`, `16-search-list-iSE.png`
**Status:** **Has issues** — horizontal overflow.

- **`docW=434` on a 390px viewport (44px overflow) on iPhone 14. `docW=434` on a 375px viewport (59px overflow) on iPhone SE.** Page horizontally scrolls, which is a fundamental mobile usability bug.
- **iPhone SE: the "Map" toggle button is clipped off the right edge** — users on small phones literally can't see they can switch to map view. (Confirmed visually in `16-search-list-iSE.png`.)
- Filters trigger button measures 419px wide while it should be ≤342 (375 − 32 px-4 − scrollbar). Multiple sibling DOM nodes all clamp to width 419 (`flex items-center justify-end`, `grid sm:grid-cols-2`, every dentist card link).
- **Root cause:** the parent grid `grid lg:grid-cols-[260px_1fr]` (in `app/[locale]/(patient)/search/page.tsx:62`) does not set `min-width: 0` on children. On mobile (no `lg:grid-cols`), grid still applies and falls back to a single auto track that grows to fit the largest min-content of any descendant. Some descendant — most likely a card name like "Dr. Mona Soliman · Heliopolis" or the gap-rich card layout — pushes the track past viewport.
- Suggested fix: add `min-w-0` to the grid items, or move the mobile filter bar / list out of the grid wrapper, or set the parent to `block` on mobile and `grid` only at `lg:`.
- **List/Map toggle buttons are 32–33px tall** — under 44px minimum.
- "Filters" trigger is 46px tall ✓ but inherits the overflow from its parent.

### `/en/search` (Map view)
**Screenshots:** `05-search-map-i14.png`
**Status:** **Pass** (functional) — but ergonomics could improve.

- Map renders correctly via Leaflet with 7 pins. **No horizontal overflow** in map view (interesting — the overflow only happens in list view).
- Map sits at y=315 in the page (you scroll past header + hero + filters before seeing it) and is only 518px tall. On a 844px screen this is fine, but on iPhone SE (667h) the map is squeezed and you have to scroll down for cards.
- Pins are 25px wide (default Leaflet markers) — under tap target spec. Acceptable for map context but could use the new "tap target" extension that adds invisible 44px hit area.
- Sidebar list of cards under the map is reachable via scroll — good.

### `/en/search` (Filters bottom-sheet)
**Screenshots:** `04-filters-drawer-i14.png`
**Status:** **Has issues**

- Bottom sheet renders correctly at `bottom-0` with `max-h-[85vh]` ✓.
- Backdrop tap to dismiss works ✓ but is a `<button aria-label="Close">` underneath the panel (Playwright "click intercepted" by panel header) — works for real touch users since the visible backdrop area is above the sheet.
- **Drawer container is missing `role="dialog"` and `aria-modal="true"`** — accessibility regression vs. the mobile-nav drawer.
- The X close button inside the panel is 36×36 — 8px under tap target.
- Dropdowns inside use 15px font — same iOS zoom problem.

### `/en/dentist/dr-sara-hassan`
**Screenshots:** `06-dentist-profile-i14.png`, `17-dentist-iSE.png`
**Status:** **Has issues**

- No horizontal overflow ✓.
- Layout is clean, specialties pills, slot calendar reads well.
- **78 slot buttons are each ~84×33** — height 33px is below the 44px iOS HIG minimum. This is the most-tapped button on the most important page, on the path to conversion. Recommended fix: bump `py-1.5` to `py-2.5` or add `min-h-[44px]`.
- Tapping a slot correctly redirects to `/en/signin?next=/en/book/...` ✓.

### `/en/book/...`
**Status:** **Pass** (redirect target is signin)

- Confirmed: unauth users are correctly redirected to `/en/signin?next=...` with the booking URL preserved as a `next` param.

### `/en/for-clinics`
**Screenshots:** `09-for-clinics-full-i14.png`, `19-for-clinics-iSE.png`, `10-for-clinics-faq-open-i14.png`
**Status:** **Pass**

- 6252px tall page, no horizontal overflow on either viewport.
- All sections render: hero, why-grid, Dentolize callout, how-it-works, pricing, FAQ, final CTA.
- FAQ accordion (native `<details>/<summary>`) opens cleanly with the answer revealed inline — no janky reflow.
- Hero "Get more bookings, without a single new login." — the line break style is preserved on mobile.
- Final CTA button at the bottom is white-on-teal, full-width — easy to tap.

### `/en/onboard`
**Status:** **Cannot test (auth-gated)** — correctly redirects to `/en/signin?next=/onboard`. Source review recommended; tested separately.

### `/en/signin`
**Screenshots:** `07-signin-i14.png`
**Status:** **Has issues**

- Clean two-field form (email + password).
- Inputs are 342×52 — width and height good.
- **Inputs and submit button use `font-size: 15px` — iOS will zoom on focus.** This is the single most common iOS-mobile-form regression.
- Submit button is full-width 51px tall ✓.
- "No account yet? **Sign up**" link at bottom — the "Sign up" link is only 19px tall — small but acceptable as inline text link.

### `/en/signup`
**Screenshots:** `08-signup-i14.png`
**Status:** **Has issues**

- Same input patterns as signin: 342×52 ✓, but `font-size: 15px` ✗ (iOS zoom).
- Four fields + submit, all full-width and consistent.
- Phone field uses `type="tel"` ✓.
- Several `<input type="hidden">` (locale, locales, etc.) which is fine.

### `/en/privacy` — **MAJOR**
**Screenshots:** `11-privacy-i14.png`, `18-privacy-iSE.png`
**Status:** **Has issues** — horizontal overflow.

- **`docW=452` on 390 viewport (62px overflow). `docW=452` on 375 viewport (77px overflow).**
- Top section nav (Privacy / Terms / Cancellation / Cookies) uses `overflow-x-auto` to be horizontally scrollable, BUT it's wrapped in `-mx-4 sm:-mx-5 md:mx-0 px-4 sm:px-5 md:px-0` which uses negative margin to bleed-edge. On a parent that's already viewport-width, the negative margin pushes the child past viewport, and the body article inherits the same width.
- Result on iPhone SE: "Cookies" tab is clipped off-screen, and **all body legal text is clipped at the right edge** ("This is a working draft prepared for legal review. Final versi…", "law and applicable best practices…", etc. all show truncation in the screenshot). Users have to horizontally scroll to read each line. Awful for a legal page.
- This pattern applies to all `(patient)/(legal)` routes (Privacy, Terms, Cancellation, Cookies) — same shared layout.
- Suggested fix: drop the negative-margin bleed on the section nav; instead let it scroll horizontally inside its natural width.

### Mobile nav drawer (header hamburger) — **BLOCKER**
**Screenshots:** `02-drawer-en-i14.png`, `02b-drawer-fullpage-i14.png`, `13-drawer-ar-i14.png`
**Status:** **BROKEN**

- Visually: drawer opens but renders **only as a 60px-tall horizontal strip at the top of the screen**, showing "Menu | X" and a tiny "BROWSE" caption underneath. The browse links (Search / Specialties / Areas / For clinics) and the Sign-in / Sign-up CTAs render below the visible strip but **the dialog itself is only 60px tall and the backdrop only covers those 60px**, so most of the page underneath remains interactive and undimmed.
- Confirmed via DOM: `[role="dialog"]` outer container has `position: fixed; inset: 0` but its `getBoundingClientRect()` returns `{ x:0, y:0, w:390, h:60 }`. The panel inside (`absolute top-0 bottom-0 start-0`) inherits the 60px height from its parent.
- **Cause:** `<MobileNav>` is rendered inside the sticky `<header>` which has `h-[60px]`. Even though the dialog has `position:fixed` (which normally escapes ancestor sizes), in this case the bounding rect is computed against the parent — likely because of how Next.js/React renders this mid-tree, possibly combined with backdrop-filter on the header creating a containing block in some browsers. (No `transform`/`filter`/`contain` on the chain, but `<header>` does have `backdrop-blur-md` which is `backdrop-filter` — that **does** create a containing block for fixed children in modern browsers.)
- **Recommended fix:** render `<MobileNav>` via a React Portal (`createPortal(..., document.body)`), or move the `{open && <Dialog>}` JSX out of the `<header>` and into the page root. This will let `position: fixed` truly escape the sticky/backdrop-blur ancestor.
- Same bug appears on every page (every page renders the same `<Header>`), and same on Arabic (`13-drawer-ar-i14.png` shows it equally broken in RTL).
- Once fixed, verify: full viewport height; backdrop covers full screen; body scroll is locked (it already is — `body.style.overflow = 'hidden'` works); RTL slides from right (panel x-position confirmed correct in current code).

### `/ar` — Home in Arabic
**Screenshots:** `12-home-ar-i14.png`
**Status:** **Pass**

- `<html dir="rtl" lang="ar">` set ✓.
- Cairo font loads (fontFamily: `Cairo, "Cairo Fallback", Manrope, …`) ✓.
- Hero card mirrors correctly: "ابحث عن طبيب" CTA right-aligned, search icons on right, labels/inputs RTL.
- Specialties grid mirrors correctly.
- "How it works" steps render right-to-left with `STEP · 01` aligning right.
- Footer columns mirror correctly.
- No horizontal overflow.

### `/ar/for-clinics` — For-clinics in Arabic
**Screenshots:** `14-for-clinics-ar-i14.png`
**Status:** **Pass**

- Layout mirrors correctly throughout the long page.
- Bento grid, Dentolize callout, pricing card, FAQ — all correctly RTL.
- Hero CTAs and final-CTA full-width buttons render properly.
- No horizontal overflow.
- Hamburger drawer slides from the right (correct for RTL) — confirmed via DOM (`panel.x = 62` in 390 viewport = right-anchored).

---

## RTL parity

- **Pass overall.** Every page tested in Arabic matches the English layout's structure with correct mirroring.
- **Drawer slide direction is correct:** in EN, panel x=0 (slides from left); in AR, panel x≈62 (anchored right, slides from right). Logical CSS properties (`start-0`, `rtl:translate-x-full`) doing their job.
- **Drawer height bug applies in AR too** — same root cause.
- **Cairo font** loads correctly with proper Arabic typography.
- No arrows pointing the wrong way detected (sub-headers and nav arrows use Lucide `ArrowRight` which is icon-mirrored via `dir=rtl` CSS in some places — would benefit from a closer pixel review on the for-clinics CTA arrows specifically, but visually appears correct in `14-for-clinics-ar-i14.png`).

---

## Cross-cutting issues

### **C1. Form input font-size is 15px site-wide → iOS will auto-zoom on focus**
- Affected: home hero search, sign-in, sign-up, filters bottom sheet, and likely the onboarding form.
- Fix: bump `<input>`, `<select>`, `<textarea>` font-size to **16px** on mobile (or globally — the 1px difference at desktop is invisible). Tailwind: change `text-[15px]` → `text-[16px]` or add a global `input { font-size: 16px; }`.

### **C2. Tap targets under 44×44 throughout**
Catalog of below-spec interactive elements found:
- Header hamburger Menu button: 40×40
- Header Sign-up CTA: 68×35
- Header language toggle "العربية": 66×36
- Slot picker buttons (dentist profile): 84×33 (height fail)
- List/Map toggle buttons (search): 70×32 (height fail)
- Filters drawer X close button: 36×36
- Mobile-nav drawer X close button: 36×36
- Footer links: most are 19px tall (acceptable as text links, but the active hit area should still be 44px tall vertically)

Most are **height** failures by 4–11 pixels. Bumping vertical padding would fix the majority without redesign.

### **C3. Sticky header `backdrop-blur-md` is the likely root of the drawer bug**
- `backdrop-filter: blur(12px)` creates a new containing block for `position: fixed` descendants in modern browsers (Chrome 105+, Safari 18+, all current mobile browsers). This is exactly the symptom we see.
- Recommendation: **Portal the drawer to `document.body`**. This is standard pattern for any modal living inside a stylized header.

### **C4. No skeleton loaders for clinic / dentist images**
- The 6 dentist cards on `/search` use `SH` / `AF` / `OE` initials avatars — there are no real photos yet. Once photos arrive, ensure the `<img>` has explicit width/height + a placeholder/blur to avoid layout shift on slow Cairo 4G.

### **C5. Filters drawer missing accessibility attrs**
- The bottom-sheet filters drawer has no `role="dialog"` or `aria-modal="true"`. Screen-reader users won't know it's modal.

### **C6. Body scroll lock on drawer open: the home page mobile nav drawer correctly sets `body.style.overflow = 'hidden'`, but the broken drawer height means the lock is moot — users can scroll inside the unblocked region behind the drawer.** This will be fixed automatically once C3 is resolved.

---

## Recommended next steps (in priority order)

1. **Fix the mobile nav drawer (BLOCKER).** Render via `createPortal(..., document.body)`. Verify on iPhone Safari that drawer covers full height, backdrop covers full screen, and body scroll is locked.

2. **Fix `/search` (list view) horizontal overflow (BLOCKER).** In `app/[locale]/(patient)/search/page.tsx:62`, change the wrapper to:
   ```tsx
   <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6 lg:gap-8">
   ```
   The `minmax(0, 1fr)` (or adding `min-w-0` to grid children) prevents the auto track from growing to fit min-content. Verify both at `lg` and below.

3. **Fix `/privacy` and other legal pages horizontal overflow (MAJOR).** Remove `-mx-4 sm:-mx-5 md:mx-0` from the section nav `<aside>` — the bleed-edge negative margin is pushing content past viewport.

4. **Bump form input font-size to 16px globally (MAJOR).** Trivial CSS fix; affects every form on the site.

5. **Bump slot-picker buttons (`components/patient/slot-picker.tsx` or wherever) to `min-h-[44px]` (MAJOR).** This is the conversion-funnel button.

6. **Bump mobile header buttons (hamburger, language toggle, Sign up) to 44px height (MINOR).** A few extra pixels of padding.

7. **Add `role="dialog"` + `aria-modal="true"` to the search filters bottom sheet (MINOR).** Match the mobile nav drawer for accessibility parity.

8. **Sweep for `font-size: 13px` and below site-wide (MINOR).** Some footer link / metadata text is borderline-tiny on iPhone SE. Bump to 14px minimum for body copy.

9. **Add invisible 44px hit areas to map pins (MINOR).** Use Leaflet's `iconAnchor` or wrap the icon DOM in a larger transparent button.

10. **(Future)** Once real dentist photos exist, add explicit `width`/`height` and a blur placeholder to prevent CLS.

---

## Test artifacts

All 19 screenshots saved to:
`d:/Projects/Dental map MVP/temporary screenshots/mobile-qa/`

Notable ones:
- `02b-drawer-fullpage-i14.png` — proof of the drawer-height bug
- `16-search-list-iSE.png` — proof Map button is clipped on iPhone SE
- `18-privacy-iSE.png` — proof of legal-page overflow
- `12-home-ar-i14.png`, `14-for-clinics-ar-i14.png` — RTL parity confirmation
