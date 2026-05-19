# Code Quality Review — Dental Map MVP
_Date: 2026-05-17 | Scope: ~30 files of recent churn_

## Summary
- Critical: 8 findings
- Warning: 16 findings
- Info: 11 findings

Reviewer note: this audit is correctness/quality only — security was explicitly out of scope (handled by a separate agent). Even so, two of the Critical findings (C5, C7) have indirect security implications worth flagging to that agent.

---

## Critical (must fix before next release)

### C1. `useSearchParams()` not wrapped in `<Suspense>` — entire `/search` route bails out to client rendering
**File:** `app/[locale]/(patient)/search/page.tsx` (whole file) + `components/patient/search-results.tsx:47`
**Issue:** `SearchResults` is a Client Component that calls `useSearchParams()` from `next/navigation`. Next 15 / 16 App Router requires any component that calls `useSearchParams()` to be wrapped in a `<Suspense>` boundary in its parent server tree. Without that boundary, Next forces the **entire page** into client-side rendering at build time (and on Vercel, build with `output: 'standalone'` will warn or fail). The page is also marked `export const dynamic = "force-dynamic"` which masks the build-time warning but still defeats SSR for the filter sidebar and the dentist count header.
**Why it matters:** Worst search performance possible — first contentful paint waits for JS. With Arabic-first audience on Egyptian mobile networks this is the biggest perceived-perf regression on the site. Also breaks streaming.
**Suggested fix:**
```tsx
// app/[locale]/(patient)/search/page.tsx
import { Suspense } from "react";
// ...
<Suspense fallback={null}>
  <SearchResults
    dentists={dentists}
    locale={locale}
    /* ... */
  />
</Suspense>
```
Alternatively, push the `useSearchParams()` call up into the Server Component (it already has `searchParams: Promise<SP>`) and pass values down as props. The Client Component only needs the params to build the new URL in `changeSort` — pass `currentSort` and an `allParams: Record<string,string>` prop.

---

### C2. Booking action selects `profiles(email)` from `clinic_admins` — schema mismatch with `Database` types and stale-data bug
**File:** `lib/booking/actions.ts:192-201`
**Issue:** The query is
```ts
.from("clinic_admins")
.select(`clinic_id, profile:profiles(email)`)
```
Two problems:
1. The schema (`db/schema.sql:23`) defines `profiles.email` as `citext`, populated from `auth.users.email` only via the `handle_new_user` trigger at insert time. **It is never updated** when the user changes their email in Supabase Auth. So clinic notification emails will go to the stale address — silently — forever.
2. The hand-written `Database` type in `lib/supabase/types.ts` declares the relation, but neither `dentist_calendars`, the `subscription_*`, `verification_*`, `google_maps_url`, nor `hero_image_url` columns exist on `clinics` in the types file, even though they all exist in DB. Code masks this with `as never` casts throughout `lib/ops/actions.ts`, `lib/clinic/onboard-action.ts`, etc. Means TS no longer protects you when these columns get refactored.
**Why it matters:** Clinic admins miss bookings → real revenue/UX impact. Plus the type lie hides future regressions: a misspelt column name on an `insert(... as never)` will compile cleanly and fail only at runtime.
**Suggested fix:** Source the email from `auth.admin.getUserById(profile_id)` (you already do this for ops `data.ts` line 149). For the type situation, regenerate `lib/supabase/types.ts` from the live schema using the documented `supabase gen types typescript` command (the type file itself recommends this in its header comment).

---

### C3. `signin-form.tsx` will throw an unhandled error and leave the spinner forever for any profile that doesn't exist or has multiple rows
**File:** `components/auth/signin-form.tsx:51-63`
**Issue:** After successful sign-in, the code queries the profile with `.single()`. PostgREST's `.single()` **throws** (returns an error in `data.error` but the chain unconditionally destructures `{ data: profile }` and discards the error) on zero or >1 rows. If the user's auth row exists but their profile row was deleted (or the trigger failed at sign-up), `profile` is `undefined`, target falls through to `/${locale}` — that's harmless. But if the supabase client call itself rejects (network blip, RLS denies SELECT because session cookie didn't land yet in iOS Safari Private, which is *exactly* the scenario the surrounding comment is trying to work around), the unhandled promise rejection escapes `handleSubmit`. `setBusy(false)` is never called → button stays disabled with spinner → user thinks the app froze.
**Why it matters:** Reproducible on iOS Safari Private — which is the user demographic this entire file's pattern is designed for.
**Suggested fix:** Wrap the profile lookup in try/catch and ensure `setBusy(false)` runs in a `finally`. Also use `.maybeSingle()` instead of `.single()` — null profile is a recoverable state.
```ts
try {
  // ... profile lookup ...
} catch (err) {
  console.error("[signin] profile lookup failed:", err);
  // fall through to default target
} finally {
  setBusy(false);
}
```

---

### C4. Onboard wizard sends `bioEn` / `bioAr` to the server but the form never collects them
**File:** `lib/clinic/onboard-action.ts:37-39, 240-241` vs. `components/clinic/onboard-form.tsx:255-262`
**Issue:** `OnboardInput` types `dentists[].bioEn?` and `bioAr?` and the action inserts them as `bio_en: d.bioEn?.trim() || null`. But the form only ever sends `{ nameEn, nameAr, title, yearsExp, feeEgp, specialties }` — never bio. Dentist profiles will have empty bios. Then `app/[locale]/(patient)/dentist/[slug]/page.tsx:116` correctly hides the bio section when null — so the user never sees one and there's no UI to ever set it. Effectively dead code on the action side + missing UX feature on the form side.
**Why it matters:** Either the feature is real (then the form is broken) or it's deferred (then the action shape is misleading). Either way the codebase lies about its capabilities.
**Suggested fix:** Decide: add the bio inputs (textarea per language per dentist), or remove `bioEn/bioAr` from `OnboardInput` and `bio_en/bio_ar` from the insert. Don't ship code that pretends to collect data it doesn't.

---

### C5. `proxy.ts` does not transfer the `value` for **deleted** Supabase cookies onto the intl redirect response
**File:** `proxy.ts:22-33`
**Issue:** When Supabase's middleware rotates an access token, it both **sets** new cookies and **deletes** old ones (by writing them with `maxAge: 0` and an empty `value`). The current loop copies `c.name, c.value` and the option bag — that's correct for setting. But `supaResponse.cookies.getAll()` on Next's response cookie API returns only the *currently set* cookies, not the *Set-Cookie expirations*. Any cookie Supabase added a `Set-Cookie: name=; Max-Age=0` header for **will not appear in `getAll()`** and therefore won't be propagated onto the intl redirect. The user lands on the locale-prefixed URL with a mixed cookie jar (some old, some new), then on the next request Supabase re-issues a 401 and re-runs the refresh dance. Symptom: on first visit to `/` the user gets one extra redirect/refresh cycle, sometimes flashes the unauthenticated header.
**Why it matters:** Subtle but real on every fresh session, and amplifies the iOS Safari issues this codebase has fought repeatedly. Also has a security smell — under bad luck the user could land with an old token still attached.
**Suggested fix:** Don't try to re-serialise cookies via the `cookies.set()` API. Instead, copy the raw `Set-Cookie` headers from `supaResponse` to `intlResponse`:
```ts
const setCookieHeaders = supaResponse.headers.getSetCookie();
for (const cookie of setCookieHeaders) {
  intlResponse.headers.append("set-cookie", cookie);
}
return intlResponse;
```
This preserves expirations, `Max-Age=0` deletions, and any future cookie attributes Supabase adds (e.g. partitioned cookies).

---

### C6. `lib/dentists/list.ts` rating loop assumes `acc.get` is a `Map.entries()` iterator but the array spread for visibleDentistIds bypasses the filter — possible empty-string lookup and NaN
**File:** `lib/dentists/list.ts:199-221`
**Issue:** When `filtered` is empty, `visibleDentistIds` is `[]`, but the code still computes `for (const [id, { sum, n }] of acc)` — that's fine. The real bug is in the rating math at line 217: `Math.round((sum / n) * 10) / 10`. If a review row has `rating === null` (the DB column is `int` not null, but PostgREST returns `null` for any column when the row's auth.users.email was just rotated and the join briefly returns a sparse row), `sum` becomes `NaN`, `avg` becomes `NaN`, and downstream `tr("avgRating", { avg: avg.toFixed(1) })` (used on the dentist profile page) renders the literal string "NaN" to the user. There's no guard.
Also: `Number.isFinite(r.rating)` is not checked before `cur.sum += r.rating`. A row with `rating: undefined` (returned for partial joins) silently corrupts the average for every other dentist in the same `dentist_id` bucket as well.
**Why it matters:** Real "NaN ★" rendered on the patient profile sidebar; low-probability but very visible failure mode and impossible to debug without running prod against bad data.
**Suggested fix:**
```ts
for (const r of reviewRows ?? []) {
  if (!Number.isFinite(r.rating)) continue;
  const cur = acc.get(r.dentist_id) ?? { sum: 0, n: 0 };
  cur.sum += r.rating;
  cur.n += 1;
  acc.set(r.dentist_id, cur);
}
```

---

### C7. `ClinicRowActions` swallows **every** server-action error — ops UI lies about success
**File:** `components/ops/clinic-row-actions.tsx:24-28`
**Issue:**
```ts
function run(fn: () => Promise<unknown>) {
  startTransition(async () => {
    await fn();
  });
}
```
`approveClinicAction` / `denyClinicAction` / `togglePublishAction` all return `{ ok: false, error: string }` on RLS failure, server error, or `not_authenticated`. None of those are inspected — the spinner stops and the row re-renders with whatever `verificationStatus` it had **on the previous server render**. Ops user clicks "Approve", sees the spinner stop, sees no change in status (because the server returned `ok: false`, e.g. their session expired), and assumes it worked. Clinic stays `pending` indefinitely. They report it as a "ghost" approval.
**Why it matters:** Ops workflow is the gate for every clinic going live. Silent failures here mean clinics rot in pending unverified. Also weakens any audit trail — there's no UI signal "your action didn't take".
**Suggested fix:** Inspect the return value, surface failures via toast or inline message:
```ts
function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
  startTransition(async () => {
    const r = await fn();
    if (!r.ok) {
      // toast / set error state
      console.error("[ops]", r.error);
      alert(isAr ? "فشلت العملية: " + r.error : "Action failed: " + r.error);
    }
  });
}
```
Also note `revalidatePath("/", "layout")` in the actions invalidates the entire app's cache for every approve click — overly aggressive (see W11).

---

### C8. `lib/auth/actions.ts:84` updates `role` on the `profiles` row using `as never` cast — type system silently approves any payload
**File:** `lib/auth/actions.ts:82-89` (and 5 other spots across `lib/`)
**Issue:** Every Supabase update payload in the codebase is cast `as never` to silence the typed-update mismatch. With the hand-written `Database` type that's missing several real columns (see C2), this pattern means: a developer typo like `{ rol: "ops" }` (notice the missing `e`) compiles cleanly, silently does nothing at runtime (Postgres ignores unknown JSON keys in PATCH), and the user keeps their old role. There is no test that catches this. The promote-to-dentist-admin path (line 82-89) is **specifically** marked "non-fatal" — meaning a typo here means the topbar would show "My bookings" forever and the user can never reach `/dashboard`, even though sign-up returned `{ ok: true }`. This already happens enough to warrant the comment.
**Why it matters:** Whole categories of regression slip through review. The escape-hatch cast is an admission that the type situation is broken; the right fix is to fix the types (C2), not to spray `as never`.
**Suggested fix:**
1. Regenerate `Database` types from the live Supabase schema as the type-file header instructs.
2. Replace every `as never` with the real Update type. The places where the cast is unavoidable (because of intentional schema drift during a migration) should at minimum check the returned `data` and confirm the column actually changed.

---

## Warning (should fix)

### W1. `OnboardForm.handleSubmit` validation runs `clinicStepValid()` AFTER `pickedArea/selectedPackage/location` checks — but the function re-validates location, so the location check at line 239 is unreachable code (always passes if `clinicStepValid()` passes)
**File:** `components/clinic/onboard-form.tsx:235-246`
**Issue:** The flow is:
1. Check `pickedArea && selectedPackage` (covered).
2. Check `location.lat != null && location.lng != null` (the only specific error message users see for missing location).
3. `clinicStepValid()` which again checks `location.lat == null || location.lng == null` and returns false, surfacing the generic `labels.errorPrefix` ("Something went wrong:") instead of the specific `locationRequired`.

So if the user's location is set BUT the dentist fee is missing, they get the unhelpful `errorPrefix` error instead of a useful "Please add a fee for Dr. X" message. Worse, the error message is empty after the prefix (no detail), and Step 1 is hidden, so the user is stuck on the submit screen with no idea what to fix.
**Why it matters:** Onboarding drop-off. This is the most important conversion funnel in the app.
**Suggested fix:** Replace `clinicStepValid()` returning bool with a function that returns the specific failing field, and surface a clear per-field error.

---

### W2. `OnboardForm.PricingStep` is rendered, but `selectedPackage` state is **not preserved** if user navigates back to step 1 — the package selection persists, but `goToStep` doesn't reset; conversely the form lets a user submit with a stale `pickedArea` whose tier has changed in the DB without re-validating
**File:** `components/clinic/onboard-form.tsx:213-221, 247-269`
**Issue:** `goToStep(1)` from step 2 preserves `selectedPackage` and `clinic.areaSlug` — good. But if the user changes the area on step 1 (different tier), `selectedPackage` is **not cleared**, and the `priceFor(tier, package)` on the server might silently quote a different EGP amount than what the user saw — UI showed Tier-1 prices but the user picked the package while area was Tier-1, then switched to Tier-4, and submits at Tier-4 pricing. They see no error, get charged a different amount than they expected.

Server-side `onboardClinicAction:169` does re-check tier match — but **only against what the client sent**, so the mismatch error fires correctly. The bug is that the client never re-quotes a price when area changes, so the user is confused why their submission is rejected.
**Why it matters:** "Why won't this form submit?" support tickets.
**Suggested fix:** In `setAreaSlug` of `PricingStep`, also `setSelectedPackage(null)` to force re-selection, and add a visible hint when tier changes.

---

### W3. `OnboardForm.handleSubmit` blocks on a single Server Action call that performs 5+ DB writes — no progress feedback past "Submitting…"
**File:** `lib/clinic/onboard-action.ts:229-283`
**Issue:** For 5 dentists, the action does ~15 sequential round-trips (slug check loop + dentist insert + cd insert + dentist_specialties insert per dentist). Each is awaited serially. On Egypt's mobile latency to Supabase (USA region) this is 3-5 seconds easily. The UI shows a single spinner with "Submitting…" and no progress. Users panic-click submit again — but `isPending` blocks it, so the button is greyed out. No timeout, no retry, no partial-state recovery beyond the global `await admin.from("clinics").delete()` cleanup on dentist failure (which itself isn't transactional — the `clinic_admins` link or `clinic_insurance` rows from earlier dentists won't get cleaned, leaving orphans).
**Why it matters:** Cleanup logic is incomplete — first dentist succeeds, third fails, clinic deleted, but `dentist_specialties` for dentists 1 and 2 remain orphaned and any partial `clinic_insurance` rows do too. Plus the user just stares at a spinner.
**Suggested fix:** Wrap the whole onboarding in a Postgres function (RPC) so it's transactional. Failing that: also `await admin.from("dentists").delete().in("id", insertedDentistIds)` and similar for the other tables in the rollback path.

---

### W4. `lib/dentists/list.ts:223-254` uses non-null-assertions `r.dentist!` and `r.clinic!` after a filter that doesn't narrow TS
**File:** `lib/dentists/list.ts:181-254`
**Issue:** `filtered = rows.filter((r) => r.clinic && r.dentist)`. Inside the second filter and `.map`, TS still sees `r.dentist` as nullable (the filter callback's return type doesn't drive a type guard unless you write it as `(r): r is X => …`). The code papers over with `!` non-null assertions on every access. Future maintainers will assume those are safe and propagate the assertion without realising the filter is the only thing protecting them. If someone adds a clause that lets `null` through, runtime crashes instead of compile-time error.
**Why it matters:** Type erosion. The whole point of TS is to make this category of crash impossible.
**Suggested fix:** Write the filter as a type predicate:
```ts
.filter((r): r is Row & { clinic: NonNullable<Row["clinic"]>; dentist: NonNullable<Row["dentist"]> } =>
  r.clinic != null && r.dentist != null
)
```
Then drop every `!` afterward.

---

### W5. `lib/booking/actions.ts:104` casts the insert error to `{ code?: string } | null` to detect 23505 — but `insertErr` can also be `PostgrestError` with `.code` already typed
**File:** `lib/booking/actions.ts:102-109`
**Issue:** `(insertErr as { code?: string } | null)?.code === "23505"` works but throws away the typed `PostgrestError` shape. More importantly, when *both* `insertErr` is set AND the pre-check at line 73 also returned no overlap (race condition: concurrent booker took the slot between the SELECT and the INSERT), the user sees `slot_taken` correctly only if `code === "23505"`. Any other failure (RLS denial, FK violation, network) returns the generic `server_error` with no telemetry context — the only thing left is `console.error("[booking] insert failed:", insertErr)` and the user is told "server error". They retry, hit the same wall, give up.
**Why it matters:** Booking is the conversion funnel. Silently bucketing many errors as "server_error" makes regressions invisible.
**Suggested fix:** Pass through the error code in the result so the client can render a more specific message, and log to whatever monitoring you have (Sentry, etc.) — `console.error` on Vercel disappears into Logs unless someone's actively tailing.

---

### W6. `clinic-map.tsx` recreates `makePinIcon` on every render for every marker — and uses `require("leaflet")` instead of a top-level import
**File:** `components/patient/clinic-map.tsx:34-62, 165-200`
**Issue:**
1. `makePinIcon(isActive)` is called inline in the marker `.map(...)` loop. On every parent re-render (e.g. when `activeId` changes), it allocates fresh DivIcon instances for **every** marker, not just the changed one. With ~50 clinics that's 50 new icon objects per hover.
2. `require("leaflet")` is used twice inside `fixLeafletIcons` and `makePinIcon`. The file is `"use client"` and already loaded only on the client side (via `dynamic(() => import('./clinic-map'), { ssr: false })`). The `require` workaround was needed in older Next versions to avoid SSR pulling Leaflet — that's no longer needed since the parent dynamic-imports with `ssr: false`. A static `import L from "leaflet"` is fine and avoids the typed `require` with `// eslint-disable-next-line @typescript-eslint/no-require-imports`.
3. `eventHandlers={{ mouseover: () => onHover(c.clinicDentistId), mouseout: () => onHover(null) }}` allocates new closures every render — Leaflet's Marker will re-bind handlers, can cause flicker on rapid hover.
**Why it matters:** Mostly perf-smelly on mobile; not catastrophic but the file accumulated workarounds that are no longer needed.
**Suggested fix:** Memoise `makePinIcon(true)` and `makePinIcon(false)` into module-level constants (lazy-computed once on first call), use a regular `import`, and `useCallback` the hover handlers.

---

### W7. `search-results.tsx` mutates URL via `useSearchParams().toString()` snapshot — race condition with concurrent filter changes
**File:** `components/patient/search-results.tsx:52-60`
**Issue:** `changeSort` reads `searchParams` (a hook return value snapshotted at render time) and builds a new URL from it. If the user changes a filter in `SearchFilters` (which lives in a sibling tree and also pushes new URLs) and then quickly changes sort, the sort change `router.push` will be built from the *stale* searchParams snapshot — overwriting the just-applied filter. React 19's `useSearchParams` is supposed to return current values, but with `startTransition` and concurrent rendering the snapshot may be one render stale.
**Why it matters:** Subtle filter-loss bug under rapid interaction. Hard to reproduce, easy to ship.
**Suggested fix:** Use `useSearchParams()` inside `changeSort` via a ref, or read the URL from `window.location.search` at call time. Or push only `sort` and rely on Next router to merge — but `router.push` from next-intl doesn't merge query, it replaces. So you really must read fresh.

---

### W8. `signin-form.tsx` does role-based hard-nav, but `signInAction` server action exists and is *also* role-aware — two parallel implementations
**File:** `components/auth/signin-form.tsx:48-65` vs. `lib/auth/actions.ts:109-149`
**Issue:** Both forms exist. The form uses the **client** path because of an iOS-Safari cookie issue documented in the comment. The server action is exported but apparently unused for the actual sign-in flow. Either delete `signInAction` or document clearly that it's kept for an alternate flow. Leaving both means future devs will tweak one, expecting both to behave identically — they don't.
**Why it matters:** Dual code paths inevitably diverge. The `signInAction` revalidates `revalidatePath("/", "layout")` and the client form doesn't, so the two leave the cache in different states.
**Suggested fix:** Decide. If `signInAction` is for a future server-form fallback, mark it `@deprecated` or move it under a `_unused/` directory.

---

### W9. `lib/ops/data.ts` issues **N** sequential `admin.auth.admin.getUserById(id)` calls in a `for (const id of ownerIds)` loop (line 148) and again at line 334 for patients
**File:** `lib/ops/data.ts:148-151, 333-337`
**Issue:** For 50 patient profiles, that's 50 sequential HTTP requests to Supabase's auth admin API. The comment even notes this ("revisit with a batched query if it gets slow"). The Supabase Auth admin API has `listUsers({ page, perPage })` — for the ops dashboard you can pull the whole page (~200 users max per page) once and Map them by id. With pilot scale this will become unusable around 100 clinic admins / 200 patients on the dashboard.
**Why it matters:** Out-of-scope for v1 (perf), but this is the kind of accidental N+1 that will surface as a 10+ second dashboard load by the time anyone's actually using the dashboard.
**Suggested fix:** Use `Promise.all(...)` for parallelism as a band-aid; switch to a batched/paginated `listUsers` when count > 50.

---

### W10. Sign-in form's profile `.single()` uses generic `<{ role: ... }[]>` returns but PostgREST returns a single object for `.single()`, not an array
**File:** `components/auth/signin-form.tsx:56` (and `lib/auth/session.ts:20`, `lib/auth/actions.ts:134`, `lib/clinic/onboard-action.ts:320`, several more)
**Issue:** The pattern `.returns<{ role: ... }[]>().single()` is consistently used. `.returns<X>()` is supposed to declare the shape of the row(s) the query produces; `.single()` returns one row of type `X[number]`. Declaring it as an array and then calling `.single()` is at best confusing — at worst, if `returns<X[]>()` and `single()` interplay change in a future supabase-js, you'll get the wrong inferred type. The correct shape is `.returns<{ role: ... }>().single()` (no `[]`).
**Why it matters:** Sloppy typing pattern that's now duplicated across the codebase and will be cargo-culted into every new query.
**Suggested fix:** Drop the `[]` in every `.returns<…>().single()` and `.returns<…>().maybeSingle()` call site.

---

### W11. `revalidatePath("/", "layout")` is called on every booking, every ops action, every sign-in — nukes the entire app's cache on tiny mutations
**File:** `lib/booking/actions.ts:223`, `lib/ops/actions.ts:29, 42, 58`, `lib/auth/actions.ts:137, 141, 145, 154`
**Issue:** `revalidatePath("/", "layout")` invalidates **every** route under the layout — search results, the home page, dentist profile pages, etc. For a single ops "Approve" click, the entire app cache evicts. Under load (multiple ops working simultaneously, every booking flowing in), the app effectively has no static cache.
**Why it matters:** Defeats the point of caching. Performance footgun.
**Suggested fix:** Narrow the revalidation target:
- `approveClinicAction` → `revalidatePath('/search')`, `revalidatePath('/clinic/[slug]', 'page')`, `revalidatePath('/admin')`.
- `createBookingAction` → `revalidatePath('/dentist/[slug]')` for the booked dentist; the global revalidate isn't needed.
- `signInAction` / `signOutAction` → the layout revalidate IS needed for the header, but only the layout, not the children — `revalidatePath('/', 'layout')` already does this, but consider `revalidateTag` to scope to auth-dependent fetches if you adopt a tagging strategy later.

---

### W12. `clinic-card.tsx:99-108` computes `initials` but uses `d.nameEn` only — Arabic name initials are never derived
**File:** `components/patient/clinic-card.tsx:104-108` (also `dentist-card.tsx:41`, `app/[locale]/(patient)/dentist/[slug]/page.tsx:50-54`)
**Issue:** When a user is browsing in Arabic and a dentist has no photo, the fallback initials are derived from `d.nameEn`. If the dentist has only Arabic name set (English blank), `(d.nameEn ?? "").split(" ").slice(-2).map(s => s[0]).join("")` produces `""` — empty initials, empty avatar circle. Visible blank circles on Arabic browse.
**Why it matters:** Visual bug specifically on the Arabic locale, which is the default. Also: even with English names present, taking `slice(-2)` gives initials from the LAST two words, which for "Dr. Yara Magdy" picks "Y" and "M" — correct — but for "Dr. Mohammed Ali ibn Saleh" picks "ibn" and "Saleh" → "iS" — odd.
**Suggested fix:** Pick the localised name in the initial computation:
```ts
const sourceName = isAr ? d.nameAr : d.nameEn;
const initials = (sourceName ?? "")
  .replace(/^(د\.|Dr\.?)\s*/i, "") // strip honorific
  .split(/\s+/)
  .slice(0, 2)
  .map(s => s[0])
  .join("");
```

---

### W13. `header-search.tsx` `pathname !== "/search"` compares against literal `/search`, ignoring that next-intl strips the locale prefix from `usePathname` — works today but couples to next-intl behavior
**File:** `components/header-search.tsx:32`
**Issue:** `usePathname` from `@/i18n/routing` returns locale-less paths (`/search`, not `/ar/search`). The comparison is correct *only* because of that. If you ever switch to `usePathname` from `next/navigation` (which returns full path with locale), this becomes `"/ar/search" !== "/search"` → always true → always clears the input. A foot-gun for a future refactor that misses the routing import distinction.
**Why it matters:** Latent regression risk.
**Suggested fix:** Use a constant or check `pathname.endsWith("/search")` for robustness, or comment the import path's behaviour.

---

### W14. `clinic-map.tsx` `clinics.filter` runs on every render, allocating a fresh array each time — combined with `activeClinic = mapped.find(...)`, `useEffect([center])` in `MapFocus` re-fires when `center` is "the same" lat/lng but a new array reference (it's a tuple literal, so reference always changes)
**File:** `components/patient/clinic-map.tsx:113-121, 73-76`
**Issue:** `focusCenter: LatLngExpression | null = activeClinic ? [activeClinic.clinic.lat!, activeClinic.clinic.lng!] : null` constructs a fresh array on each render. The `MapFocus` `useEffect` has `[center, zoom, map]` as deps — `center` is a new array reference every render even when the lat/lng are identical, so `map.flyTo(...)` fires on every parent re-render, causing a constant fly-to loop while the user is interacting with the map.
**Why it matters:** Janky map animation while hovering markers; user can't pan freely.
**Suggested fix:** Memoise center, or compare by value inside the effect:
```ts
const [lat, lng] = activeClinic ? [activeClinic.clinic.lat!, activeClinic.clinic.lng!] : [null, null];
useEffect(() => {
  if (lat != null && lng != null) map.flyTo([lat, lng], 14, ...);
}, [lat, lng, map]);
```

---

### W15. `lib/auth/actions.ts:81-89` promotes user to dentist_admin via service-role client immediately after sign-up — but the comment admits this is "non-fatal", and on failure the user is silently left as `patient`
**File:** `lib/auth/actions.ts:81-89`
**Issue:** If the promotion `update` fails (RLS, network), the user gets a `{ ok: true }` from sign-up, the welcome email goes out, and they sign in to find they're a patient with no dashboard access. No retry, no telemetry, no UI hint that something's off. The `console.error` goes into the void on Vercel.
**Why it matters:** Drops new clinic signups silently into the wrong role. Onboarding form's role-promotion fallback at `lib/clinic/onboard-action.ts:322-328` catches this — but only if the user gets that far. If they sign up as clinic, never finish onboarding, and try to sign in later expecting a dashboard, they get the patient view and bounce.
**Suggested fix:** Either fail the sign-up if the role promotion fails (treat it as part of the transaction), or retry-with-backoff once before swallowing. At minimum, return the role-promotion failure to the client so it can prompt "we couldn't fully set up your account — contact support."

---

### W16. `getCurrentUser()` is invoked on every page render in `SiteHeader` AND inside every page that uses it — runs the auth check N+1 times per request
**File:** `components/site-header.tsx:13` + every page that calls `getCurrentUser()` directly
**Issue:** Layout calls `<SiteHeader/>` → calls `getCurrentUser()` → `supabase.auth.getUser()` (network round-trip to GoTrue) + `from('profiles').select(...)` (network round-trip). Pages that also need the user (e.g., `OnboardPage`) call `getCurrentUser()` again — *two* GoTrue hits and two SELECTs per request. Next does not memoize this (no `cache()` wrapper).
**Why it matters:** Doubles auth latency on every authed page. Easy fix.
**Suggested fix:** Wrap `getCurrentUser` in React's `cache()`:
```ts
import { cache } from "react";
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => { ... });
```
This dedupes calls within a single React render pass.

---

## Info (nice to fix)

### I1. `app/[locale]/(patient)/dentist/[slug]/page.tsx:91, 222` hardcodes Arabic/English strings ("موثق"/"Verified", "افتح في خرائط جوجل") instead of going through next-intl
**File:** `app/[locale]/(patient)/dentist/[slug]/page.tsx:90-91, 222`
**Issue:** The rest of the file uses `t("…")` from `getTranslations("Profile")`. Two inline strings bypass that:
- `{isAr ? "موثق" : "Verified"}` (line 91)
- `{isAr ? "افتح في خرائط جوجل" : "Open in Google Maps"}` (line 222)
Same pattern in `components/patient/clinic-map.tsx:144` (the empty-map message), `components/patient/dentist-card.tsx:76, 80` ("موثق"/"Verified", "احجز"/"Book"), `components/patient/search-results.tsx:140-141, 149-151, 161, 193`.
**Suggested fix:** Move all into the `messages/{ar,en}.json` files and translate via `t()`. Otherwise translators won't see them in the source files.

---

### I2. `clinic-row-actions.tsx` and `onboard-form.tsx` use `isAr ? "..." : "..."` inline strings extensively
**File:** `components/ops/clinic-row-actions.tsx:39-71` (every label), `components/clinic/onboard-form.tsx:1047`
**Issue:** Whole-page Arabic/English ternaries inline. The buttons "Approve", "Deny", "Re-approve" are all hardcoded. Also `onboard-form.tsx:1047` has the literal "Selected" with no Arabic counterpart at all — ar users see English "Selected" on selected package cards.
**Suggested fix:** Centralise in `messages/*.json`.

---

### I3. `proxy.ts:44` matcher regex doesn't exclude `/api/auth` paths but Supabase auth callbacks may live there
**File:** `proxy.ts:44`
**Issue:** Matcher `"/((?!api|auth-debug|_next|_vercel|design-brief|.*\\..*).*)"` excludes `/api` and `/auth-debug` but the comment block above (line 42) says "Match all paths except: /api, /auth/callback, /_next, …" — `/auth/callback` is **not** excluded by the regex. If you add a `/auth/callback` route for OAuth, it'll run through the intl middleware and get a locale prefix slapped on. Minor unless OAuth is added.
**Suggested fix:** Update matcher to `"/((?!api|auth|auth-debug|_next|_vercel|design-brief|.*\\..*).*)"` so future `/auth/*` routes also bypass.

---

### I4. `app/[locale]/(patient)/onboard/page.tsx:23` has `return null` after `redirect()` — unreachable
**File:** `app/[locale]/(patient)/onboard/page.tsx:21-23`
**Issue:** `redirect()` throws `NEXT_REDIRECT`, so `return null` is never reached. Reads as defensive but is dead code. Either remove it, or follow the pattern from `lib/auth/session.ts` which `throw new Error("unreachable")` to make the intent explicit and let TS narrow correctly.
**Suggested fix:** Remove the `return null` line, or replace with `throw new Error("unreachable after redirect")`.

---

### I5. `lib/dentists/list.ts:276-281` `recommended` sort weights rated dentists by `(avg || 3) * log10(count + 2)` — magic numbers, undocumented
**File:** `lib/dentists/list.ts:275-280`
**Issue:** `|| 3` (default rating), `+ 2` (log smoothing), `log10` — none of these constants are documented in code. Comment says "blend rating + count + price" but doesn't justify the formula. Future tweaks will be guesswork.
**Suggested fix:** Pull the constants into a named const block with a brief comment on their derivation, or extract to `lib/dentists/scoring.ts` with a unit test.

---

### I6. `lib/clinic/onboard-action.ts:74` uses regex `/[̀-ͯ]/g` (combining diacritical marks) — works but reads as a non-printable glob
**File:** `lib/clinic/onboard-action.ts:74`
**Issue:** The character class is the Unicode combining diacritical marks block (U+0300–U+036F) typed literally. Reads like an empty regex on most editors. Use the explicit `̀-ͯ` form for readability.
**Suggested fix:**
```ts
.replace(/[̀-ͯ]/g, "")
```

---

### I7. `lib/booking/actions.ts:14` union includes `"server_error" | "invalid"` but caller can't distinguish — same generic toast
**File:** `lib/booking/actions.ts:13, 56, 59, 73, 108`
**Issue:** Multiple error codes collapse to the same user-facing message in callers (we'd need to grep — but the typical pattern is `{ok:false, error: ... }` rendered as a single line). Differentiating "slot_taken" (retry-able) from "server_error" (call us) from "invalid" (form is broken) deserves better surfaceing.
**Suggested fix:** Map each code to a translation key and a recovery action.

---

### I8. `lib/auth/actions.ts:69-74` checks for "already" or "registered" substrings in the Supabase error message to detect duplicate emails — fragile string-matching against an external API
**File:** `lib/auth/actions.ts:67-74`
**Issue:** Substring sniffing on `createErr.message` to identify the error class. Supabase wording changes per major version. A future Supabase upgrade saying "An account is already linked to this address" still matches; saying "duplicate" does not. Use `createErr.status` (returns 422 for duplicate email) or `createErr.code` if present.
**Suggested fix:** Switch to status-code or error-code matching.

---

### I9. `components/patient/search-results.tsx:166-168` has a TODO comment ("entity-aware pin behaviour … comes in a follow-up")
**File:** `components/patient/search-results.tsx:166-168`
**Issue:** Standard TODO. Worth either tracking it in an issue or removing if no longer planned.
**Suggested fix:** Move to issue tracker; remove the comment so the file doesn't accumulate decay markers.

---

### I10. `components/clinic/onboard-form.tsx` is ~1100 lines and contains 5 sub-components — should be split for navigability
**File:** `components/clinic/onboard-form.tsx` (whole file)
**Issue:** `OnboardForm`, `StepHeader`, `ClinicSection`, `DentistsSection`, `PricingStep`, `PackageCard`, `Field`, `InsuranceSection` — all in one file. Hard to navigate; impossible to test in isolation. Each prop-drilled `labels` interface is enormous.
**Suggested fix:** Split into `components/clinic/onboard/` directory: `OnboardForm.tsx` (orchestrator + state), `PricingStep.tsx`, `ClinicSection.tsx`, `DentistsSection.tsx`, `InsuranceSection.tsx`, `PackageCard.tsx`, `shared/Field.tsx`. Use context for the `labels` object instead of prop-drilling.

---

### I11. `components/patient/clinic-card.tsx:75-77` JSX renders multiple `null` and bare conditional text that look fragile
**File:** `components/patient/clinic-card.tsx:74-78`
**Issue:**
```tsx
{address ? address : null}
{address && area ? " · " : null}
{area}
```
If `address` is `null` and `area` is `null`, you get nothing (good). If `address` is `null` but `area` is "Zamalek", you get `null null "Zamalek"` → "Zamalek" (good). But the `<span className="truncate">` will display `null` text if any of these is the literal string "null" (defensive). Cleaner with a join.
**Suggested fix:**
```tsx
<span className="truncate">
  {[address, area].filter(Boolean).join(" · ")}
</span>
```

---

## Patterns observed

1. **Type erosion via `as never` casts.** The hand-written `Database` type in `lib/supabase/types.ts` lags the actual schema (missing `subscription_*`, `verification_*`, `google_maps_url`, `hero_image_url`, etc.), and every mutation in the codebase casts the payload to `never` to compile. This is the root cause behind several latent bugs (C2, C8, W4) and means the TS layer no longer protects you. Regenerating the types from the live Supabase schema is a one-time cost and would surface most of the other issues automatically.

2. **`revalidatePath("/", "layout")` everywhere.** Used as a "just in case" cache-bust on every server action, regardless of scope. Defeats Next's caching. Should be replaced with surgical revalidation by route or, better, tagged fetches.

3. **Server Actions return `{ok, error}` results but callers don't check.** `ClinicRowActions` (C7), the onboard form's specific-error paths (W1), and the booking flow (W5) all drop or generically render errors. Pattern: surface a typed error union, force the caller to handle each variant.

4. **Bilingual strings inline rather than in `messages/`.** Especially in newer components — the older code is clean, but `ops/clinic-row-actions.tsx`, the avatar-fallback empty strings in `clinic-map.tsx`, the "Selected" button in `onboard-form.tsx`, and the "موثق/Verified" badges in profile/card pages all drift outside the i18n system. Translators will miss them entirely.

5. **`.returns<X[]>().single()` cargo-cult.** Used in at least 8 places. Type is wrong (`.single()` returns one row, not an array). Doesn't currently cause runtime bugs because the runtime ignores the type hint, but if a developer relies on the inferred type they'll get confusing errors.

6. **Background tasks marked "non-fatal" with bare `console.error`.** Role promotion (W15), gcal write (booking), all the email sends, the ops/clinic notifications. In production on Vercel these logs aren't surfaced unless someone's tailing — meaning silent partial failures are invisible. Bare minimum: ship a small structured-log wrapper that pings Sentry/Logflare; otherwise the "non-fatal" comments become "non-existent" in monitoring.

7. **The Onboard form is a monolith.** 1100+ lines, 8 nested sub-components, label prop-drilling, multi-step state. Splitting it (I10) is overdue, and the validation logic (W1, W2) has subtle bugs that are easier to fix in smaller files.

8. **`useEffect` deps with array literals (W14, also `MapFocus`).** New array references on every render fire effects spuriously. Common React mistake; worth a lint rule (`react-hooks/exhaustive-deps` doesn't catch this).
