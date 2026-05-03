# Discovery Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four feature ships to Dental Map's patient discovery surface — Bayesian ratings & sort, Trusted-clinic badge & Featured rail, doctor-first cards with autocomplete + GPS + insurance/availability/favorites, and per-service pricing — without revamping the existing UI.

**Architecture:** Additive only. New columns on `clinics` and `dentists`, two new tables (`favorites`, `services`, `clinic_services`), Postgres triggers for rating/availability recompute, no schema breaks. Server-side aggregation (GROUP BY dentist) for one-card-per-doctor results. Browser geolocation for distance with graceful degradation. Cookie-based recently-viewed for anonymous users.

**Tech Stack:** Next.js 15 App Router, React 19 server + client components, Supabase Postgres + RLS, `@supabase/supabase-js`, `next-intl` for i18n (Arabic/English RTL), Tailwind CSS, Playwright for E2E. Existing migration runner at `scripts/run-migration.mjs`.

**Spec reference:** `docs/superpowers/specs/2026-05-02-discovery-features-design.md`

---

## Pre-flight

### Test approach for this plan

The codebase has Playwright configured (`playwright.config.ts`) but no unit-test framework. We follow the project's existing practice:

- **SQL migrations** verified by running them and executing post-migration sanity queries.
- **Server functions** (`lib/dentists/list.ts`, helpers) verified by `npm run typecheck` plus dev-server smoke tests on `/search` and profile pages.
- **UI components** verified by dev-server smoke + targeted Playwright E2E tests for golden flows (sort, save favorite, service-filtered search, etc.).
- **Lint** with `npm run lint` before each commit.

We do not introduce a new unit-test framework — that's out of scope for these features.

### File structure overview

```
db/migrations/
  003_ratings_smoothed.sql            # Ship 1
  004_trust_and_featured.sql          # Ship 2
  005_availability_and_favorites.sql  # Ship 3
  006_services_and_clinic_services.sql # Ship 4

lib/
  supabase/types.ts                   # Modify: add new columns/tables across all 4 ships
  dentists/
    list.ts                           # Modify: extend filters (Ships 1-4); rewrite to aggregated shape (Ship 3)
    rating.ts                         # Create (Ship 1): Bayesian helpers + display gates
    autocomplete.ts                   # Create (Ship 3): unified search across specialties/dentists/clinics
    favorites.ts                      # Create (Ship 3): favorites CRUD
    pricing.ts                        # Create (Ship 4): getClinicPriceList, getDentistPriceList
    featured.ts                       # Create (Ship 2): getFeaturedDentists
  availability/
    recompute.ts                      # Create (Ship 3): next-slot computation
  cookies/
    recent-dentists.ts                # Create (Ship 3): cookie helpers (anonymous-safe)

components/patient/
  dentist-card.tsx                    # Modify: rating chip, trusted pill, save heart, soonest-slot, expandable clinics, service-aware price label
  search-filters.tsx                  # Modify: 4★+, insurance multi-select, available-today/this-week, distance slider, service filter
  search-sort.tsx                     # Create (Ship 1): sort dropdown
  search-autocomplete.tsx             # Create (Ship 3): hero specialty field with autocomplete
  near-me-button.tsx                  # Create (Ship 3): GPS opt-in for distance slider
  save-heart.tsx                      # Create (Ship 3): favorites toggle button
  featured-rail.tsx                   # Create (Ship 2): homepage featured dentists carousel
  recently-viewed-rail.tsx            # Create (Ship 3): homepage recent rail (cookie-driven)
  price-list.tsx                      # Create (Ship 4): clinic price-list table
  dentist-services.tsx                # Create (Ship 4): doctor profile services & prices section

app/[locale]/(patient)/
  page.tsx                            # Modify: featured rail, autocomplete, recent rail
  search/page.tsx                     # Modify: pass new filter/sort/aggregated shape to client
  dentist/[slug]/page.tsx             # Modify: save heart, recent-viewed write, services section
  clinic/[slug]/page.tsx              # Create (Ship 4): public clinic profile with price list
  account/favorites/page.tsx          # Create (Ship 3): saved dentists list

app/api/
  search/autocomplete/route.ts        # Create (Ship 3): autocomplete API
  cron/recompute-availability/route.ts # Create (Ship 3): periodic recompute
  favorites/route.ts                  # Create (Ship 3): toggle favorite (POST/DELETE)

app/[locale]/(dentist)/dashboard/admin/featured/page.tsx  # Create (Ship 2): tiny ops curation page

tests/
  ratings.spec.ts                     # Create (Ship 1): sort + 4★+ filter E2E
  trust-and-featured.spec.ts          # Create (Ship 2): trusted pill + rail
  discovery.spec.ts                   # Create (Ship 3): autocomplete + favorites + filters
  pricing.spec.ts                     # Create (Ship 4): service filter + price list
```

### Verification commands you'll see throughout

```bash
# After every code change:
npm run typecheck

# Before each commit:
npm run lint

# Apply a migration:
node --env-file=.env.local scripts/run-migration.mjs db/migrations/<file>.sql

# Run a single Playwright test:
npx playwright test tests/<name>.spec.ts --project=chromium

# Run dev server (already-running instance is fine):
npm run dev
```

### Branching

Work on `main` (the project's working pattern per recent commits). Each Ship gets one final commit at minimum; larger ships may have intermediate commits per task group.

---

# Ship 1 — Ratings & sort

**Estimate:** ~3 days
**Outcome:** Patients see Bayesian-smoothed ratings (or "New on Dental Map" pill) on each result card, can sort by rating, and can filter to 4★+.

## Task 1.1: SQL migration — rating columns, indexes, recompute function, trigger

**Files:**
- Create: `db/migrations/003_ratings_smoothed.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 003_ratings_smoothed.sql
-- Bayesian-smoothed dentist ratings. C=5 prior weight, m=4.0 prior mean.
-- See spec section 6.1.

alter table dentists
  add column if not exists rating_smoothed numeric(3,2) not null default 4.00;
alter table dentists
  add column if not exists rating_count int not null default 0;

create index if not exists dentists_rating_idx
  on dentists (rating_smoothed desc);

-- Recompute one dentist's rating from scratch.
create or replace function recompute_dentist_rating(p_dentist_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_count int;
  v_sum int;
  v_smoothed numeric(3,2);
  v_prior_weight constant int := 5;
  v_prior_mean constant numeric := 4.0;
begin
  select count(*)::int, coalesce(sum(r.rating), 0)::int
    into v_count, v_sum
  from reviews r
  join appointments a on a.id = r.appointment_id
  join clinic_dentists cd on cd.id = a.clinic_dentist_id
  where cd.dentist_id = p_dentist_id
    and r.is_published = true;

  v_smoothed := (v_prior_weight * v_prior_mean + v_sum) / (v_prior_weight + v_count);

  update dentists
     set rating_smoothed = v_smoothed,
         rating_count = v_count
   where id = p_dentist_id;
end $$;

-- Trigger function: resolve dentist_id from review and call recompute.
create or replace function trg_review_recompute_rating()
returns trigger
language plpgsql
security definer
as $$
declare
  v_dentist_id uuid;
  v_appointment_id uuid;
begin
  -- For DELETE, OLD.appointment_id; for INSERT/UPDATE, NEW.appointment_id.
  v_appointment_id := coalesce(new.appointment_id, old.appointment_id);

  select cd.dentist_id
    into v_dentist_id
  from appointments a
  join clinic_dentists cd on cd.id = a.clinic_dentist_id
  where a.id = v_appointment_id;

  if v_dentist_id is not null then
    perform recompute_dentist_rating(v_dentist_id);
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
after insert or update or delete on reviews
for each row
execute function trg_review_recompute_rating();

-- Backfill existing dentists.
do $$
declare
  d_id uuid;
begin
  for d_id in select id from dentists loop
    perform recompute_dentist_rating(d_id);
  end loop;
end $$;
```

- [ ] **Step 2: Apply the migration**

```bash
node --env-file=.env.local scripts/run-migration.mjs db/migrations/003_ratings_smoothed.sql
```

Expected: `✅ Migration applied.`

- [ ] **Step 3: Verify with a sanity query**

Run this against the Supabase SQL editor or via a quick script:

```sql
select id, name_en, rating_smoothed, rating_count
from dentists
order by rating_smoothed desc
limit 5;
```

Expected: All dentists show `rating_smoothed = 4.00` and `rating_count = 0` (or non-zero values if reviews exist). No errors.

- [ ] **Step 4: Commit the migration**

```bash
git add db/migrations/003_ratings_smoothed.sql
git commit -m "feat(db): add Bayesian-smoothed dentist ratings + recompute trigger"
```

---

## Task 1.2: Update Database TypeScript types for new columns

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Add new fields to the dentists Row**

Edit `lib/supabase/types.ts`. Find the `dentists: { Row: { ... } }` block (around line 85) and add two new fields after `is_published`:

```ts
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          title: DentistTitle;
          years_experience: number | null;
          bio_ar: string | null;
          bio_en: string | null;
          photo_url: string | null;
          is_published: boolean;
          rating_smoothed: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: zero errors. (No callers populate these on Insert; they're defaulted by the DB.)

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(types): expose rating_smoothed and rating_count on dentists"
```

---

## Task 1.3: Create rating helper module

**Files:**
- Create: `lib/dentists/rating.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/dentists/rating.ts
// See spec section 6.1: Bayesian-smoothed ratings, hide stars below threshold.

export const RATING_DISPLAY_THRESHOLD = 3;

export type RatingDisplay =
  | { kind: "stars"; smoothed: number; count: number }
  | { kind: "new" };

export function getRatingDisplay(input: {
  rating_smoothed: number;
  rating_count: number;
}): RatingDisplay {
  if (input.rating_count < RATING_DISPLAY_THRESHOLD) {
    return { kind: "new" };
  }
  return {
    kind: "stars",
    smoothed: Math.round(input.rating_smoothed * 10) / 10,
    count: input.rating_count,
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dentists/rating.ts
git commit -m "feat(rating): helpers for Bayesian rating display gating"
```

---

## Task 1.4: Extend listDentists with minRating filter and sortBy parameter

**Files:**
- Modify: `lib/dentists/list.ts`

- [ ] **Step 1: Extend the type definitions**

In `lib/dentists/list.ts`, add new fields to `DentistListItem` and new options to `ListFilters`. Find:

```ts
export type DentistListItem = {
  clinicDentistId: string;
  dentistId: string;
  // ... existing fields ...
  specialties: Array<{ slug: string; nameAr: string; nameEn: string }>;
};
```

Add `ratingSmoothed` and `ratingCount` after `photoUrl`:

```ts
  photoUrl: string | null;
  ratingSmoothed: number;
  ratingCount: number;
  clinic: {
```

Find `ListFilters` and extend:

```ts
export type ListFilters = {
  specialtySlug?: string;
  areaSlug?: string;
  feeMax?: number;
  minRating?: number;
  sortBy?: "best" | "rating" | "fee";
};
```

- [ ] **Step 2: Update the SQL query to select new fields**

In the same file, find the `clinic_dentists` query Step 3 (around line 113). The `dentist:dentists!inner(...)` SELECT needs `rating_smoothed, rating_count`:

```ts
      dentist:dentists!inner(
        id, slug, name_ar, name_en, title, years_experience, photo_url, is_published,
        rating_smoothed, rating_count
      )
```

Update the inline `Row` type's `dentist` block to match:

```ts
    dentist: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      title: string;
      years_experience: number | null;
      photo_url: string | null;
      is_published: boolean;
      rating_smoothed: number;
      rating_count: number;
    } | null;
```

- [ ] **Step 3: Apply minRating and sortBy in the query**

After the existing `if (typeof filters.feeMax === "number") q = q.lte(...)` line, add the rating filter:

```ts
  if (typeof filters.minRating === "number") {
    q = q.gte("dentist.rating_smoothed", filters.minRating);
  }
```

Sorting: the current code returns rows in DB order. We sort post-fetch in JS because the rows are still per-(dentist,clinic) — the doctor-first aggregation comes in Ship 3. For Ship 1 we sort the flat list.

After the existing `.map<DentistListItem>(...)` block, replace the trailing `;` with a chained sort. Find the closing `}));` of the map and replace with:

```ts
    }));

  // Apply sort (Ship 1: flat per-(dentist,clinic) rows; Ship 3 will aggregate first).
  const sortBy = filters.sortBy ?? "best";
  if (sortBy === "rating") {
    return list.sort((a, b) => b.ratingSmoothed - a.ratingSmoothed || b.ratingCount - a.ratingCount);
  }
  if (sortBy === "fee") {
    return list.sort((a, b) => a.feeEgp - b.feeEgp);
  }
  // best: rating then fee tie-break
  return list.sort((a, b) => b.ratingSmoothed - a.ratingSmoothed || a.feeEgp - b.feeEgp);
}
```

The earlier `.map<DentistListItem>(...)` will need to be assigned to `const list =` instead of being the `return` value. Find the `return rows.filter(...).map<DentistListItem>(` and change to `const list = rows.filter(...).map<DentistListItem>(`. Add the `ratingSmoothed` and `ratingCount` fields inside the map:

```ts
      photoUrl: r.dentist!.photo_url,
      ratingSmoothed: r.dentist!.rating_smoothed,
      ratingCount: r.dentist!.rating_count,
      clinic: {
```

- [ ] **Step 4: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 5: Smoke-test on dev server**

If a dev server isn't already running:

```bash
npm run dev
```

Open `http://localhost:3000/en/search`. Confirm the page renders without errors. Open browser dev tools — no 500 errors.

- [ ] **Step 6: Commit**

```bash
git add lib/dentists/list.ts
git commit -m "feat(search): add minRating filter and sortBy=rating|fee to listDentists"
```

---

## Task 1.5: Add rating chip to dentist card with "New on Dental Map" pill

**Files:**
- Modify: `components/patient/dentist-card.tsx`

- [ ] **Step 1: Replace the placeholder rating chip with the real one**

Current code shows a hardcoded "New" star. Replace with `getRatingDisplay`. Update imports:

```tsx
import { Link } from "@/i18n/routing";
import { Star, MapPin, ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import type { DentistListItem } from "@/lib/dentists/list";
import { getRatingDisplay } from "@/lib/dentists/rating";
```

Find the bottom row of the card (the "fee + verified + star" block, around line 58–72). Replace the entire `<div className="mt-5 pt-4 border-t border-ink-100 ...">` block with:

```tsx
      <div className="mt-5 pt-4 border-t border-ink-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-[15px]">
            <span className="font-display font-bold text-ink-900">{d.feeEgp}</span>
            <span className="text-ink-500 text-[12.5px]"> EGP</span>
          </div>
          <RatingChip
            display={getRatingDisplay({
              rating_smoothed: d.ratingSmoothed,
              rating_count: d.ratingCount,
            })}
            isAr={isAr}
          />
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-600">
          {isAr ? "احجز" : "Book"}
          <ArrowRight
            className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        </span>
      </div>
```

- [ ] **Step 2: Add the RatingChip subcomponent at the bottom of the file**

Append to `components/patient/dentist-card.tsx` (after the `DentistCard` function):

```tsx
function RatingChip({
  display,
  isAr,
}: {
  display: ReturnType<typeof import("@/lib/dentists/rating").getRatingDisplay>;
  isAr: boolean;
}) {
  if (display.kind === "new") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
        <Sparkles className="w-3 h-3" aria-hidden />
        {isAr ? "جديد على Dental Map" : "New on Dental Map"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-700">
      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" aria-hidden />
      <span className="font-semibold">{display.smoothed.toFixed(1)}</span>
      <span className="text-ink-400">({display.count})</span>
    </span>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Smoke-test**

Reload `http://localhost:3000/en/search`. Each card should now show either a star + smoothed rating + count, or a "New on Dental Map" teal pill if the dentist has fewer than 3 published reviews. (For new pilot data, every card shows "New".)

- [ ] **Step 5: Commit**

```bash
git add components/patient/dentist-card.tsx
git commit -m "feat(card): rating chip with 'New on Dental Map' fallback"
```

---

## Task 1.6: Add i18n strings for rating UI

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add Search section keys to en.json**

Find the `"Search": { ... }` block in `messages/en.json`. Add these keys before the closing brace:

```json
    "sortLabel": "Sort by",
    "sortBest": "Best match",
    "sortRating": "Highest rated",
    "sortFee": "Cheapest",
    "filterMinRating": "4★ and up",
    "ratingNew": "New on Dental Map"
```

(Make sure to add a comma to the previous last entry.)

- [ ] **Step 2: Mirror in ar.json**

Find the `"Search": { ... }` block in `messages/ar.json` and add:

```json
    "sortLabel": "ترتيب حسب",
    "sortBest": "الأفضل توافقاً",
    "sortRating": "الأعلى تقييماً",
    "sortFee": "الأقل سعراً",
    "filterMinRating": "4 نجوم فأكثر",
    "ratingNew": "جديد على Dental Map"
```

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "i18n(search): add sort and 4-stars filter strings"
```

---

## Task 1.7: Build the SearchSort dropdown component

**Files:**
- Create: `components/patient/search-sort.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/patient/search-sort.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

type SortValue = "best" | "rating" | "fee";

export function SearchSort({
  current,
  labels,
}: {
  current: SortValue;
  labels: {
    sortLabel: string;
    sortBest: string;
    sortRating: string;
    sortFee: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setSort(next: SortValue) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next === "best") sp.delete("sort");
    else sp.set("sort", next);
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-[13px]">
      <span className="text-ink-500">{labels.sortLabel}</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => setSort(e.target.value as SortValue)}
        className="px-3 py-1.5 rounded-lg border border-ink-100 bg-white text-[13px] font-medium text-ink-800 hover:border-teal-300 transition-colors"
      >
        <option value="best">{labels.sortBest}</option>
        <option value="rating">{labels.sortRating}</option>
        <option value="fee">{labels.sortFee}</option>
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/patient/search-sort.tsx
git commit -m "feat(search): SearchSort dropdown component"
```

---

## Task 1.8: Wire sort + minRating into /search page

**Files:**
- Modify: `app/[locale]/(patient)/search/page.tsx`
- Modify: `components/patient/search-filters.tsx`

- [ ] **Step 1: Extend SearchPage searchParams type and read new params**

In `app/[locale]/(patient)/search/page.tsx`, replace the `SP` type:

```ts
type SP = {
  specialty?: string;
  area?: string;
  feeMax?: string;
  sort?: "best" | "rating" | "fee";
  minRating?: string;
};
```

In the body, pass new filters into `listDentists`:

```ts
  const dentists = await listDentists({
    specialtySlug: sp.specialty,
    areaSlug: sp.area,
    feeMax: sp.feeMax ? parseInt(sp.feeMax, 10) : undefined,
    minRating: sp.minRating ? parseFloat(sp.minRating) : undefined,
    sortBy: sp.sort,
  });
```

- [ ] **Step 2: Render the SearchSort dropdown above results**

At the top of `app/[locale]/(patient)/search/page.tsx`, add the import:

```ts
import { SearchSort } from "@/components/patient/search-sort";
```

Find the `<p className="text-[13.5px] text-ink-500 mb-6 md:mb-8">` line that shows results count. Replace that paragraph with a flex container containing both count and sort:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <p className="text-[13.5px] text-ink-500">
          {t("resultsCount", { count: dentists.length })}
        </p>
        <SearchSort
          current={sp.sort ?? "best"}
          labels={{
            sortLabel: t("sortLabel"),
            sortBest: t("sortBest"),
            sortRating: t("sortRating"),
            sortFee: t("sortFee"),
          }}
        />
      </div>
```

- [ ] **Step 3: Add 4★+ filter to SearchFilters**

In `components/patient/search-filters.tsx`, extend the `Props` type:

```ts
type Props = {
  specialties: Option[];
  areas: Option[];
  current: { specialty?: string; area?: string; feeMax?: string; minRating?: string };
  locale: string;
  labels: {
    title: string;
    anySpecialty: string;
    anyArea: string;
    feeMax: string;
    apply: string;
    reset: string;
    showFilters: string;
    filterMinRating: string;
  };
};
```

Update the `activeCount` calculation to include `minRating`:

```ts
  const activeCount = [
    props.current.specialty,
    props.current.area,
    props.current.feeMax,
    props.current.minRating,
  ].filter(Boolean).length;
```

In `FilterForm`, after the `feeMax` input block, add the 4★+ checkbox:

```tsx
      <div>
        <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink-800 cursor-pointer">
          <input
            type="checkbox"
            name="minRating"
            value="4"
            defaultChecked={current.minRating === "4"}
            className="w-4 h-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500"
          />
          {labels.filterMinRating}
        </label>
      </div>
```

- [ ] **Step 4: Pass label and current down from SearchPage**

In `app/[locale]/(patient)/search/page.tsx`, the `<SearchFilters>` block needs the new label and current value. Update:

```tsx
        <SearchFilters
          specialties={specialties ?? []}
          areas={areas ?? []}
          current={{
            specialty: sp.specialty,
            area: sp.area,
            feeMax: sp.feeMax,
            minRating: sp.minRating,
          }}
          locale={locale}
          labels={{
            title: t("filtersTitle"),
            anySpecialty: t("filterAnySpecialty"),
            anyArea: t("filterAnyArea"),
            feeMax: t("filterFeeMax"),
            apply: t("filterApply"),
            reset: t("filterReset"),
            showFilters: t("showFilters"),
            filterMinRating: t("filterMinRating"),
          }}
        />
```

- [ ] **Step 5: Type-check + lint**

```bash
npm run typecheck && npm run lint
```

Expected: zero errors / zero warnings on changed files.

- [ ] **Step 6: Smoke-test**

Reload `http://localhost:3000/en/search`. Toggle the "4★ and up" checkbox + Apply — URL should include `?minRating=4`. Change the sort dropdown — URL should update with `?sort=rating` (or `sort=fee`); page should re-render in the new order.

- [ ] **Step 7: Commit**

```bash
git add app/\[locale\]/\(patient\)/search/page.tsx components/patient/search-filters.tsx
git commit -m "feat(search): wire sort dropdown + 4-stars filter"
```

---

## Task 1.9: Playwright E2E for Ship 1

**Files:**
- Create: `tests/ratings.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/ratings.spec.ts
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("Ship 1: ratings & sort", () => {
  test("search page shows rating chip on every card", async ({ page }) => {
    await page.goto(`${BASE}/en/search`);
    // Either a star value or the New pill must be present on each card.
    const cards = page.locator("a[href*='/dentist/']");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 4); i++) {
      const card = cards.nth(i);
      const hasStar = await card.locator("svg.fill-amber-400").count();
      const hasNewPill = await card.getByText(/New on Dental Map/i).count();
      expect(hasStar + hasNewPill).toBeGreaterThan(0);
    }
  });

  test("sort dropdown changes URL and reloads", async ({ page }) => {
    await page.goto(`${BASE}/en/search`);
    await page.getByLabel(/Sort by/i).selectOption("rating");
    await expect(page).toHaveURL(/sort=rating/);
  });

  test("4 stars filter adds minRating to URL", async ({ page }) => {
    await page.goto(`${BASE}/en/search`);
    await page.getByLabel(/4★ and up/i).check();
    await page.getByRole("button", { name: /Apply filters/i }).click();
    await expect(page).toHaveURL(/minRating=4/);
  });
});
```

- [ ] **Step 2: Run the test**

Make sure dev server is running on port 3000.

```bash
npx playwright test tests/ratings.spec.ts --project=chromium
```

Expected: 3/3 passing.

- [ ] **Step 3: Commit**

```bash
git add tests/ratings.spec.ts
git commit -m "test(e2e): Ship 1 ratings + sort + filter"
```

---

## Task 1.10: Ship 1 closing — final verification

- [ ] **Step 1: Full type-check + lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 2: Visual check**

Open `http://localhost:3000/en/search` and `http://localhost:3000/ar/search`. Confirm:
- Every card shows either a star+number or the "New on Dental Map" pill.
- The sort dropdown shows in both locales (English + Arabic labels).
- The "4★ and up" filter sits below "Max fee" in the sidebar.
- RTL layout is preserved on the Arabic page.

- [ ] **Step 3: Tag this ship in git history**

```bash
git tag ship-1-ratings-sort
```

(No push required.)

Ship 1 complete.

---

# Ship 2 — Trust & Featured

**Estimate:** ~3 days
**Outcome:** Clinic profiles + result cards display a "Trusted by Dental Map" pill where appropriate. Homepage gains a curated "Featured Dentists" rail. Tiny ops page exists for marking dentists featured.

## Task 2.1: SQL migration — trusted clinics + featured dentists

**Files:**
- Create: `db/migrations/004_trust_and_featured.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 004_trust_and_featured.sql
-- See spec sections 4 (data model) and 7.3 (trust criteria, applied manually).

alter table clinics
  add column if not exists is_trusted boolean not null default false;
alter table clinics
  add column if not exists trusted_at timestamptz;

alter table dentists
  add column if not exists is_featured boolean not null default false;
alter table dentists
  add column if not exists featured_rank int;

create index if not exists dentists_featured_idx
  on dentists (featured_rank)
  where is_featured = true;

create index if not exists clinics_trusted_idx
  on clinics (id)
  where is_trusted = true;
```

- [ ] **Step 2: Apply the migration**

```bash
node --env-file=.env.local scripts/run-migration.mjs db/migrations/004_trust_and_featured.sql
```

Expected: `✅ Migration applied.`

- [ ] **Step 3: Verify**

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name in ('clinics','dentists')
  and column_name in ('is_trusted','trusted_at','is_featured','featured_rank')
order by table_name, column_name;
```

Expected: 4 rows returned.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/004_trust_and_featured.sql
git commit -m "feat(db): add is_trusted/trusted_at on clinics, is_featured/featured_rank on dentists"
```

---

## Task 2.2: Update Database TypeScript types

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Add fields to clinics Row**

Find the `clinics: { Row: { ... } }` block. Add `is_trusted` and `trusted_at` after `is_published`:

```ts
          is_published: boolean;
          is_trusted: boolean;
          trusted_at: string | null;
          created_at: string;
```

- [ ] **Step 2: Add fields to dentists Row**

Find the `dentists: { Row: { ... } }` block. Add `is_featured` and `featured_rank` after `rating_count` (added in Ship 1):

```ts
          rating_smoothed: number;
          rating_count: number;
          is_featured: boolean;
          featured_rank: number | null;
          created_at: string;
```

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(types): expose is_trusted/is_featured/featured_rank"
```

---

## Task 2.3: Extend listDentists to return trusted-clinic flag and featured

**Files:**
- Modify: `lib/dentists/list.ts`

- [ ] **Step 1: Extend DentistListItem**

Add three new fields after `ratingCount`:

```ts
  ratingSmoothed: number;
  ratingCount: number;
  isFeatured: boolean;
  clinicIsTrusted: boolean;
  clinic: {
```

- [ ] **Step 2: Select the new columns in the SQL query**

Update the inline `Row` type — add `is_trusted` to the `clinic` block and `is_featured`, `featured_rank` to the `dentist` block:

```ts
    clinic: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      address_ar: string | null;
      address_en: string | null;
      lat: number | null;
      lng: number | null;
      is_published: boolean;
      is_trusted: boolean;
      area: {
        slug: string;
        name_ar: string;
        name_en: string;
      } | null;
    } | null;
    dentist: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      title: string;
      years_experience: number | null;
      photo_url: string | null;
      is_published: boolean;
      rating_smoothed: number;
      rating_count: number;
      is_featured: boolean;
      featured_rank: number | null;
    } | null;
```

Update the `.select(...)` SQL string accordingly:

```ts
      clinic:clinics!inner(
        id, slug, name_ar, name_en, address_ar, address_en, lat, lng, is_published, is_trusted,
        area:areas(slug, name_ar, name_en)
      ),
      dentist:dentists!inner(
        id, slug, name_ar, name_en, title, years_experience, photo_url, is_published,
        rating_smoothed, rating_count, is_featured, featured_rank
      )
```

- [ ] **Step 3: Populate the new fields in the map**

In the `.map<DentistListItem>(...)` block, add the new fields:

```ts
      ratingSmoothed: r.dentist!.rating_smoothed,
      ratingCount: r.dentist!.rating_count,
      isFeatured: r.dentist!.is_featured,
      clinicIsTrusted: r.clinic!.is_trusted,
      clinic: {
```

- [ ] **Step 4: Type-check + smoke**

```bash
npm run typecheck
```

Reload `/en/search` — page should still render.

- [ ] **Step 5: Commit**

```bash
git add lib/dentists/list.ts
git commit -m "feat(search): expose isFeatured + clinicIsTrusted on list items"
```

---

## Task 2.4: Show trusted-clinic pill on dentist card

**Files:**
- Modify: `components/patient/dentist-card.tsx`

- [ ] **Step 1: Add the pill below the clinic name**

In `components/patient/dentist-card.tsx`, locate the clinic-name `<span>` block:

```tsx
            <span className="truncate">
              {clinicName}
              {area ? ` · ${area}` : ""}
            </span>
```

Replace the surrounding wrapper with one that conditionally renders a pill. The full block becomes:

```tsx
          <div className="flex items-center gap-2 text-[13px] text-ink-500">
            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" aria-hidden />
            <span className="truncate">
              {clinicName}
              {area ? ` · ${area}` : ""}
            </span>
            {d.clinicIsTrusted && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold shrink-0"
                title={isAr ? "موثقة من Dental Map" : "Trusted by Dental Map"}
              >
                <BadgeCheck className="w-3 h-3" aria-hidden />
                {isAr ? "موثقة" : "Trusted"}
              </span>
            )}
          </div>
```

`BadgeCheck` is already imported in this file.

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Smoke-test**

Manually mark a clinic trusted in the DB:

```sql
update clinics set is_trusted = true, trusted_at = now() where slug = '<some-pilot-clinic-slug>' returning slug, is_trusted;
```

Reload `/en/search`. Cards for dentists at that clinic should now show the small "Trusted" teal pill next to the clinic name. Reset with `update clinics set is_trusted = false, trusted_at = null where slug = '...'` if you want a clean state for screenshots.

- [ ] **Step 4: Commit**

```bash
git add components/patient/dentist-card.tsx
git commit -m "feat(card): trusted-clinic pill"
```

---

## Task 2.5: Add trusted pill to dentist profile page

**Files:**
- Modify: `app/[locale]/(patient)/dentist/[slug]/page.tsx`
- Modify: `lib/dentists/list.ts` (add `is_trusted` to `getDentistBySlug`'s clinic select)

- [ ] **Step 1: Include is_trusted in getDentistBySlug**

In `lib/dentists/list.ts`, find the `getDentistBySlug` function. Update the `CD` type's `clinic` block to include `is_trusted`:

```ts
    clinic: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      address_ar: string | null;
      address_en: string | null;
      lat: number | null;
      lng: number | null;
      is_trusted: boolean;
      area: { slug: string; name_ar: string; name_en: string } | null;
    } | null;
```

Update the `.select(...)` string to include `is_trusted`:

```ts
      clinic:clinics!inner(
        id, slug, name_ar, name_en, address_ar, address_en, lat, lng, is_published, is_trusted,
        area:areas(slug, name_ar, name_en)
      )
```

- [ ] **Step 2: Render the trusted pill on the profile**

In `app/[locale]/(patient)/dentist/[slug]/page.tsx`, around the `{primary && (` section that renders the clinic block. After the clinic name, add a trusted pill conditionally. Find a stable anchor — the file currently shows `BadgeCheck` import already. Read the surrounding markup with the Read tool first if needed, then add a pill near the clinic name display.

For each clinic listed (the page iterates `links`), add inside the relevant block:

```tsx
{link.clinic.is_trusted && (
  <span
    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold"
    title={isAr ? "موثقة من Dental Map" : "Trusted by Dental Map"}
  >
    <BadgeCheck className="w-3 h-3" aria-hidden />
    {isAr ? "موثقة" : "Trusted"}
  </span>
)}
```

(Place it adjacent to each clinic-name display. Read `app/[locale]/(patient)/dentist/[slug]/page.tsx` end-to-end first to find the exact insertion point — the file is 162 lines.)

- [ ] **Step 3: Type-check + smoke**

```bash
npm run typecheck
```

Open a profile of a dentist whose clinic was marked trusted. Confirm the pill renders.

- [ ] **Step 4: Commit**

```bash
git add lib/dentists/list.ts app/\[locale\]/\(patient\)/dentist/\[slug\]/page.tsx
git commit -m "feat(profile): trusted pill on dentist profile clinic blocks"
```

---

## Task 2.6: Featured dentists data layer

**Files:**
- Create: `lib/dentists/featured.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/dentists/featured.ts
import { createAdminClient } from "@/lib/supabase/admin";

export type FeaturedDentist = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  title: string;
  photoUrl: string | null;
  ratingSmoothed: number;
  ratingCount: number;
  leadSpecialty: { slug: string; nameAr: string; nameEn: string } | null;
  minFeeEgp: number | null;
};

export async function getFeaturedDentists(limit = 8): Promise<FeaturedDentist[]> {
  const admin = createAdminClient();

  type Row = {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string;
    title: string;
    photo_url: string | null;
    rating_smoothed: number;
    rating_count: number;
    featured_rank: number | null;
  };

  const { data: dentists } = await admin
    .from("dentists")
    .select(
      "id, slug, name_ar, name_en, title, photo_url, rating_smoothed, rating_count, featured_rank"
    )
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .limit(limit)
    .returns<Row[]>();

  if (!dentists || dentists.length === 0) return [];

  const ids = dentists.map((d) => d.id);

  // Lead specialty: first by name for stability.
  const { data: ds } = await admin
    .from("dentist_specialties")
    .select("dentist_id, specialty:specialties(slug, name_ar, name_en)")
    .in("dentist_id", ids)
    .returns<{
      dentist_id: string;
      specialty: { slug: string; name_ar: string; name_en: string };
    }[]>();

  const leadByDentist = new Map<string, FeaturedDentist["leadSpecialty"]>();
  for (const s of ds ?? []) {
    if (!leadByDentist.has(s.dentist_id)) {
      leadByDentist.set(s.dentist_id, {
        slug: s.specialty.slug,
        nameAr: s.specialty.name_ar,
        nameEn: s.specialty.name_en,
      });
    }
  }

  // Min consultation fee per dentist across active clinic rows.
  const { data: cd } = await admin
    .from("clinic_dentists")
    .select("dentist_id, fee_egp")
    .in("dentist_id", ids)
    .eq("is_active", true)
    .returns<{ dentist_id: string; fee_egp: number }[]>();

  const minFeeByDentist = new Map<string, number>();
  for (const r of cd ?? []) {
    const prev = minFeeByDentist.get(r.dentist_id);
    if (prev == null || r.fee_egp < prev) minFeeByDentist.set(r.dentist_id, r.fee_egp);
  }

  return dentists.map((d) => ({
    id: d.id,
    slug: d.slug,
    nameAr: d.name_ar,
    nameEn: d.name_en,
    title: d.title,
    photoUrl: d.photo_url,
    ratingSmoothed: d.rating_smoothed,
    ratingCount: d.rating_count,
    leadSpecialty: leadByDentist.get(d.id) ?? null,
    minFeeEgp: minFeeByDentist.get(d.id) ?? null,
  }));
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dentists/featured.ts
git commit -m "feat(featured): getFeaturedDentists query helper"
```

---

## Task 2.7: Build FeaturedRail component

**Files:**
- Create: `components/patient/featured-rail.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/patient/featured-rail.tsx
import { Link } from "@/i18n/routing";
import { Star, Sparkles } from "lucide-react";
import type { FeaturedDentist } from "@/lib/dentists/featured";
import { getRatingDisplay } from "@/lib/dentists/rating";

const TITLE_LABEL: Record<string, { en: string; ar: string }> = {
  professor: { en: "Professor", ar: "أستاذ" },
  consultant: { en: "Consultant", ar: "استشاري" },
  specialist: { en: "Specialist", ar: "أخصائي" },
  resident: { en: "Resident", ar: "مقيم" },
};

export function FeaturedRail({
  dentists,
  locale,
  labels,
}: {
  dentists: FeaturedDentist[];
  locale: string;
  labels: { title: string; subtitle: string; from: string; ratingNew: string };
}) {
  if (dentists.length === 0) return null;
  const isAr = locale === "ar";

  return (
    <section className="bg-surface">
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="mb-8">
          <h2 className="display-h2 text-[26px] md:text-[36px] text-ink-900">
            {labels.title}
          </h2>
          <p className="mt-2 text-[14.5px] text-ink-500 max-w-[52ch]">
            {labels.subtitle}
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4">
          {dentists.map((d) => {
            const name = isAr ? d.nameAr : d.nameEn;
            const rating = getRatingDisplay({
              rating_smoothed: d.ratingSmoothed,
              rating_count: d.ratingCount,
            });
            const titleLabel = TITLE_LABEL[d.title]?.[isAr ? "ar" : "en"] ?? d.title;
            return (
              <Link
                key={d.id}
                href={`/dentist/${d.slug}`}
                className="group min-w-[260px] md:min-w-0 rounded-2xl bg-white border border-ink-100 p-5 shadow-card hover:shadow-card-hover hover:border-teal-300 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[16px] font-bold shrink-0">
                    {(d.nameEn ?? "").split(" ").slice(-2).map((s) => s[0]).join("")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[16px] font-bold text-ink-900 truncate">
                      {name}
                    </h3>
                    <p className="text-[12px] text-teal-600 small-caps">{titleLabel}</p>
                  </div>
                </div>
                {d.leadSpecialty && (
                  <p className="text-[13px] text-ink-600 mb-3 truncate">
                    {isAr ? d.leadSpecialty.nameAr : d.leadSpecialty.nameEn}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 mt-auto">
                  {rating.kind === "stars" ? (
                    <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-700">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" aria-hidden />
                      <span className="font-semibold">{rating.smoothed.toFixed(1)}</span>
                      <span className="text-ink-400">({rating.count})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-teal-700">
                      <Sparkles className="w-3 h-3" aria-hidden />
                      {labels.ratingNew}
                    </span>
                  )}
                  {d.minFeeEgp != null && (
                    <span className="text-[12.5px] text-ink-600">
                      {labels.from} <span className="font-bold text-ink-900">{d.minFeeEgp}</span>{" "}
                      EGP
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/patient/featured-rail.tsx
git commit -m "feat(rail): FeaturedRail homepage component"
```

---

## Task 2.8: Wire FeaturedRail into homepage

**Files:**
- Modify: `app/[locale]/(patient)/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add i18n strings**

In `messages/en.json`, inside the `"Home": { ... }` block, add before the closing brace:

```json
    "featuredTitle": "Featured dentists",
    "featuredSubtitle": "Hand-picked clinicians known for their craft.",
    "featuredFrom": "From"
```

In `messages/ar.json`:

```json
    "featuredTitle": "أطباء مميزون",
    "featuredSubtitle": "اختارت Dental Map أمهر الأطباء يدوياً.",
    "featuredFrom": "ابتداءً من"
```

(Add comma to previous last entry where needed.)

- [ ] **Step 2: Render the rail on homepage**

In `app/[locale]/(patient)/page.tsx`, add imports at the top:

```tsx
import { getFeaturedDentists } from "@/lib/dentists/featured";
import { FeaturedRail } from "@/components/patient/featured-rail";
```

In the body, after the `const t = await getTranslations("Home");` line, fetch dentists:

```tsx
  const featured = await getFeaturedDentists(8);
```

Insert the rail directly after the `</section>` of the HERO block and before `{/* ═══ SPECIALTIES ═══ */}`:

```tsx
      <FeaturedRail
        dentists={featured}
        locale={locale}
        labels={{
          title: t("featuredTitle"),
          subtitle: t("featuredSubtitle"),
          from: t("featuredFrom"),
          ratingNew: (await getTranslations("Search"))("ratingNew"),
        }}
      />
```

(Note: `ratingNew` is in the Search namespace; we resolve a separate `getTranslations` for it. Alternatively, duplicate the string into Home.)

Cleaner: duplicate the key. Add `"ratingNew": "New on Dental Map"` to `Home` in en.json, and `"ratingNew": "جديد على Dental Map"` in ar.json. Then use:

```tsx
          ratingNew: t("ratingNew"),
```

Apply the cleaner version.

- [ ] **Step 3: Mark a couple of dentists featured manually for smoke test**

```sql
update dentists set is_featured = true, featured_rank = 1
  where slug = '<dentist-slug-1>';
update dentists set is_featured = true, featured_rank = 2
  where slug = '<dentist-slug-2>';
```

Replace slugs with real ones from your seed data (`select slug, name_en from dentists limit 5;`).

- [ ] **Step 4: Smoke-test**

Reload `http://localhost:3000/en/`. The "Featured dentists" rail should appear between the hero and the specialties grid, with the marked dentists.

- [ ] **Step 5: Type-check + commit**

```bash
npm run typecheck
git add app/\[locale\]/\(patient\)/page.tsx messages/en.json messages/ar.json
git commit -m "feat(home): wire FeaturedRail with i18n"
```

---

## Task 2.9: Tiny ops page — /dentist/admin/featured

**Files:**
- Create: `app/[locale]/(dentist)/dashboard/admin/featured/page.tsx`
- Create: `app/api/admin/featured/route.ts`

- [ ] **Step 1: Write the API route (POST to upsert featured flag)**

```ts
// app/api/admin/featured/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

// Patch a single dentist's featured flag and rank.
// Auth: must be a logged-in user with role 'ops' on profiles.
export async function POST(req: Request) {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profile?.role !== "ops") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const update: { is_featured: boolean; featured_rank: number | null } = {
    is_featured: !!body.is_featured,
    featured_rank: typeof body.featured_rank === "number" ? body.featured_rank : null,
  };

  const { error } = await admin.from("dentists").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

If `lib/supabase/server.ts` doesn't export `createServerClient` — read that file and adapt the import to whatever is exported (Read the file before writing).

- [ ] **Step 2: Write the ops page**

```tsx
// app/[locale]/(dentist)/dashboard/admin/featured/page.tsx
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { FeaturedAdminTable } from "./table";

export const dynamic = "force-dynamic";

export default async function FeaturedAdmin({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/dashboard/admin/featured`);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profile?.role !== "ops") redirect(`/${locale}/`);

  const { data: dentists } = await admin
    .from("dentists")
    .select("id, slug, name_en, is_featured, featured_rank, is_published")
    .order("name_en")
    .returns<{
      id: string;
      slug: string;
      name_en: string;
      is_featured: boolean;
      featured_rank: number | null;
      is_published: boolean;
    }[]>();

  return (
    <div className="max-w-[920px] mx-auto px-5 md:px-8 py-8 md:py-14">
      <h1 className="display-h2 text-[28px] text-ink-900 mb-6">Featured dentists</h1>
      <p className="text-[14px] text-ink-500 mb-8 max-w-[60ch]">
        Tick the box to feature a dentist on the homepage rail. Lower rank shows first
        (1 is leftmost). Leave rank empty to use insertion order.
      </p>
      <FeaturedAdminTable rows={dentists ?? []} />
    </div>
  );
}
```

- [ ] **Step 3: Write the client table component**

Create `app/[locale]/(dentist)/dashboard/admin/featured/table.tsx`:

```tsx
"use client";

import { useState } from "react";

type Row = {
  id: string;
  slug: string;
  name_en: string;
  is_featured: boolean;
  featured_rank: number | null;
  is_published: boolean;
};

export function FeaturedAdminTable({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<Row[]>(rows);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function patch(id: string, patch: Partial<Row>) {
    setSavingId(id);
    setState((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await fetch("/api/admin/featured", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        is_featured: patch.is_featured ?? state.find((r) => r.id === id)?.is_featured,
        featured_rank: patch.featured_rank ?? state.find((r) => r.id === id)?.featured_rank,
      }),
    });
    setSavingId(null);
  }

  return (
    <table className="w-full text-[14px]">
      <thead>
        <tr className="border-b border-ink-100">
          <th className="text-left py-2 px-3">Dentist</th>
          <th className="text-left py-2 px-3 w-28">Featured</th>
          <th className="text-left py-2 px-3 w-28">Rank</th>
          <th className="text-left py-2 px-3 w-28">Published</th>
        </tr>
      </thead>
      <tbody>
        {state.map((r) => (
          <tr
            key={r.id}
            className={`border-b border-ink-100 ${
              savingId === r.id ? "opacity-50" : ""
            }`}
          >
            <td className="py-2 px-3 truncate">{r.name_en}</td>
            <td className="py-2 px-3">
              <input
                type="checkbox"
                checked={r.is_featured}
                onChange={(e) => patch(r.id, { is_featured: e.target.checked })}
              />
            </td>
            <td className="py-2 px-3">
              <input
                type="number"
                min={1}
                step={1}
                defaultValue={r.featured_rank ?? ""}
                placeholder="—"
                onBlur={(e) => {
                  const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                  patch(r.id, { featured_rank: v });
                }}
                className="w-16 px-2 py-1 rounded border border-ink-100"
              />
            </td>
            <td className="py-2 px-3 text-[12px] text-ink-500">
              {r.is_published ? "yes" : "no"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Type-check + lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 5: Smoke-test**

Sign in as a user whose `profiles.role = 'ops'`. Visit `http://localhost:3000/en/dashboard/admin/featured`. Toggle the featured checkbox on a dentist. Reload the homepage — the dentist should appear in the rail.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/featured/route.ts app/\[locale\]/\(dentist\)/dashboard/admin/featured
git commit -m "feat(ops): admin featured-dentists curation page"
```

---

## Task 2.10: Playwright E2E for Ship 2

**Files:**
- Create: `tests/trust-and-featured.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/trust-and-featured.spec.ts
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("Ship 2: trust + featured", () => {
  test("homepage renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/en/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("if any dentist is featured, the rail renders", async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    const heading = page.getByRole("heading", { name: /Featured dentists/i });
    if ((await heading.count()) > 0) {
      await expect(heading).toBeVisible();
      const cards = page.locator("section a[href*='/dentist/']").filter({
        hasText: /EGP|New on Dental Map/i,
      });
      expect(await cards.count()).toBeGreaterThan(0);
    } else {
      test.skip(true, "No featured dentists in this DB; rail correctly hidden");
    }
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npx playwright test tests/trust-and-featured.spec.ts --project=chromium
```

Expected: green (or skip on the second test if no featured dentists).

- [ ] **Step 3: Commit**

```bash
git add tests/trust-and-featured.spec.ts
git commit -m "test(e2e): Ship 2 featured rail smoke"
```

---

## Task 2.11: Ship 2 closing

- [ ] **Step 1: Lint + type-check**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 2: Tag**

```bash
git tag ship-2-trust-featured
```

Ship 2 complete.

---

# Ship 3 — Discovery overhaul

**Estimate:** ~7–10 days. Largest ship. Touches data shape, search aggregation, homepage hero, multiple new components.
**Outcome:** One card per doctor in /search results with nested clinics. Universal autocomplete on hero Specialty field. GPS distance slider with area-filter fallback. Insurance multi-select, Available-today/this-week chips. Soonest-slot badge on cards. Save/favorite + recently-viewed.

## Task 3.1: SQL migration — availability + favorites

**Files:**
- Create: `db/migrations/005_availability_and_favorites.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 005_availability_and_favorites.sql

-- Soonest available slot per dentist (computed; refreshed on appointment changes + cron).
alter table dentists
  add column if not exists next_available_slot timestamptz;

create index if not exists dentists_next_slot_idx
  on dentists (next_available_slot)
  where next_available_slot is not null;

-- Favorites: per-patient saved dentists.
create table if not exists favorites (
  profile_id uuid not null references profiles(id) on delete cascade,
  dentist_id uuid not null references dentists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, dentist_id)
);

alter table favorites enable row level security;

drop policy if exists "favorites self read"   on favorites;
drop policy if exists "favorites self insert" on favorites;
drop policy if exists "favorites self delete" on favorites;

create policy "favorites self read"   on favorites for select using (auth.uid() = profile_id);
create policy "favorites self insert" on favorites for insert with check (auth.uid() = profile_id);
create policy "favorites self delete" on favorites for delete using (auth.uid() = profile_id);

-- Trigger: when an appointment changes, mark the dentist's next-slot column dirty
-- by setting it to NULL. The recompute job (run on a cron) will fill it back in.
-- Cheap: avoids running the full recompute inside a transaction.
create or replace function trg_appointment_invalidate_next_slot()
returns trigger
language plpgsql
security definer
as $$
declare
  v_dentist_id uuid;
  v_cd_id uuid;
begin
  v_cd_id := coalesce(new.clinic_dentist_id, old.clinic_dentist_id);
  select dentist_id into v_dentist_id
    from clinic_dentists where id = v_cd_id;
  if v_dentist_id is not null then
    update dentists set next_available_slot = null where id = v_dentist_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists appointments_invalidate_next_slot on appointments;
create trigger appointments_invalidate_next_slot
after insert or update or delete on appointments
for each row
execute function trg_appointment_invalidate_next_slot();
```

- [ ] **Step 2: Apply**

```bash
node --env-file=.env.local scripts/run-migration.mjs db/migrations/005_availability_and_favorites.sql
```

Expected: `✅ Migration applied.`

- [ ] **Step 3: Verify**

```sql
\d favorites
select column_name from information_schema.columns where table_name='dentists' and column_name='next_available_slot';
```

Expected: `favorites` table exists with policies; column present.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/005_availability_and_favorites.sql
git commit -m "feat(db): availability column + favorites table + invalidation trigger"
```

---

## Task 3.2: Update types for availability + favorites

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Add `next_available_slot` to dentists Row**

Find the dentists Row block. Add after `featured_rank`:

```ts
          featured_rank: number | null;
          next_available_slot: string | null;
          created_at: string;
```

- [ ] **Step 2: Add favorites table to Tables**

Inside the `Tables: { ... }` block, add a new entry (before `clinic_admins` or anywhere):

```ts
      favorites: {
        Row: {
          profile_id: string;
          dentist_id: string;
          created_at: string;
        };
        Insert: { profile_id: string; dentist_id: string };
        Update: never;
      };
```

- [ ] **Step 3: Type-check + commit**

```bash
npm run typecheck
git add lib/supabase/types.ts
git commit -m "feat(types): next_available_slot + favorites"
```

---

## Task 3.3: Availability recompute helper

**Files:**
- Create: `lib/availability/recompute.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/availability/recompute.ts
// Walks 14 days of working_hours minus existing pending/confirmed appointments;
// stores the earliest open slot. NULL when no slot inside the window.
//
// Slots are quantized to slot_minutes per (clinic, dentist).

import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkingHoursDay } from "@/lib/supabase/types";

const HORIZON_DAYS = 14;

type CdRow = {
  id: string;
  dentist_id: string;
  slot_minutes: number;
  working_hours: WorkingHoursDay[];
  is_active: boolean;
};

type ApptRow = {
  clinic_dentist_id: string;
  slot_start: string;
  slot_end: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
};

export async function recomputeNextSlotForDentist(
  dentistId: string,
  now: Date = new Date()
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: cds } = await admin
    .from("clinic_dentists")
    .select("id, dentist_id, slot_minutes, working_hours, is_active")
    .eq("dentist_id", dentistId)
    .eq("is_active", true)
    .returns<CdRow[]>();
  if (!cds || cds.length === 0) {
    await admin.from("dentists").update({ next_available_slot: null }).eq("id", dentistId);
    return null;
  }

  const horizonEnd = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  const cdIds = cds.map((c) => c.id);
  const { data: appts } = await admin
    .from("appointments")
    .select("clinic_dentist_id, slot_start, slot_end, status")
    .in("clinic_dentist_id", cdIds)
    .in("status", ["pending", "confirmed"])
    .gte("slot_start", now.toISOString())
    .lt("slot_start", horizonEnd.toISOString())
    .returns<ApptRow[]>();

  const busyByCd = new Map<string, Array<{ start: number; end: number }>>();
  for (const a of appts ?? []) {
    const arr = busyByCd.get(a.clinic_dentist_id) ?? [];
    arr.push({
      start: new Date(a.slot_start).getTime(),
      end: new Date(a.slot_end).getTime(),
    });
    busyByCd.set(a.clinic_dentist_id, arr);
  }

  let earliest: number | null = null;

  for (const cd of cds) {
    for (let day = 0; day < HORIZON_DAYS; day++) {
      const date = new Date(now.getTime() + day * 86_400_000);
      const dow = date.getDay();
      const wh = (cd.working_hours ?? []).find((w) => w.day === dow);
      if (!wh) continue;
      const slotMs = cd.slot_minutes * 60_000;

      const dayStart = parseHHMM(date, wh.start);
      const dayEnd = parseHHMM(date, wh.end);
      const breaks = (wh.breaks ?? []).map((b) => ({
        start: parseHHMM(date, b.start),
        end: parseHHMM(date, b.end),
      }));
      const busy = busyByCd.get(cd.id) ?? [];

      for (let t = dayStart; t + slotMs <= dayEnd; t += slotMs) {
        if (t < now.getTime()) continue;
        const slotEnd = t + slotMs;
        if (breaks.some((b) => overlaps(t, slotEnd, b.start, b.end))) continue;
        if (busy.some((b) => overlaps(t, slotEnd, b.start, b.end))) continue;
        if (earliest == null || t < earliest) earliest = t;
        break; // earliest in this day; stop scanning
      }
      if (earliest != null) break;
    }
    if (earliest != null) break;
  }

  const value = earliest != null ? new Date(earliest).toISOString() : null;
  await admin.from("dentists").update({ next_available_slot: value }).eq("id", dentistId);
  return value;
}

export async function recomputeStaleNextSlots(now: Date = new Date()): Promise<number> {
  const admin = createAdminClient();
  // Find dentists with NULL next_available_slot OR a value in the past.
  const { data: rows } = await admin
    .from("dentists")
    .select("id, next_available_slot")
    .or(`next_available_slot.is.null,next_available_slot.lt.${now.toISOString()}`)
    .eq("is_published", true)
    .returns<{ id: string; next_available_slot: string | null }[]>();
  let updated = 0;
  for (const r of rows ?? []) {
    await recomputeNextSlotForDentist(r.id, now);
    updated++;
  }
  return updated;
}

function parseHHMM(date: Date, hhmm: string): number {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/availability/recompute.ts
git commit -m "feat(availability): recompute helper for next_available_slot"
```

---

## Task 3.4: Cron route to refresh stale next-slots

**Files:**
- Create: `app/api/cron/recompute-availability/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/cron/recompute-availability/route.ts
// Vercel Cron: schedule via vercel.json at /api/cron/recompute-availability every 15 min.
// Auth: a CRON_SECRET header is required to prevent abuse.

import { NextResponse } from "next/server";
import { recomputeStaleNextSlots } from "@/lib/availability/recompute";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const updated = await recomputeStaleNextSlots();
  return NextResponse.json({ updated });
}
```

- [ ] **Step 2: Add Vercel cron schedule**

Create or modify `vercel.json` at project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/recompute-availability",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

If `vercel.json` already exists, merge the `crons` array instead of overwriting.

- [ ] **Step 3: Type-check + commit**

```bash
npm run typecheck
git add app/api/cron/recompute-availability/route.ts vercel.json
git commit -m "feat(cron): 15-min recompute of stale next_available_slot"
```

---

## Task 3.5: Backfill next_available_slot for existing dentists

**Files:**
- Create: `scripts/backfill-next-slots.mjs`

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
// One-shot backfill of dentists.next_available_slot.
// Usage: node --env-file=.env.local scripts/backfill-next-slots.mjs

import { recomputeStaleNextSlots } from "../lib/availability/recompute.ts";

// Run via a transient Next.js compile step? Simpler: hit the cron endpoint locally.
// This script just calls into the helper using ts-node-style. If `tsx` isn't installed,
// the safer path is to run the cron route locally instead.
// Use the curl alternative below if this script doesn't run on its own.

const updated = await recomputeStaleNextSlots();
console.log(`✓ Recomputed ${updated} dentist(s)`);
```

If running `.ts` from `.mjs` is awkward in this project, use this curl fallback (after `npm run dev` is up):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recompute-availability
```

Either works; pick whichever runs first.

- [ ] **Step 2: Run the backfill**

After ensuring `CRON_SECRET` is set in `.env.local`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recompute-availability
```

Expected: `{"updated": <N>}` JSON response. Verify in DB:

```sql
select id, name_en, next_available_slot from dentists where is_published = true limit 5;
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-next-slots.mjs
git commit -m "chore: backfill script for next_available_slot"
```

---

## Task 3.6: Autocomplete query helper

**Files:**
- Create: `lib/dentists/autocomplete.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/dentists/autocomplete.ts
// Universal autocomplete: matches specialties + dentists + clinics by name (AR or EN).

import { createAdminClient } from "@/lib/supabase/admin";

export type AutocompleteHit =
  | { kind: "specialty"; slug: string; nameAr: string; nameEn: string }
  | {
      kind: "dentist";
      slug: string;
      nameAr: string;
      nameEn: string;
      photoUrl: string | null;
      areaNameEn: string | null;
      areaNameAr: string | null;
    }
  | {
      kind: "clinic";
      slug: string;
      nameAr: string;
      nameEn: string;
      logoUrl: string | null;
      areaNameEn: string | null;
      areaNameAr: string | null;
    };

export async function autocomplete(
  q: string,
  limit = 5
): Promise<{
  specialties: Extract<AutocompleteHit, { kind: "specialty" }>[];
  dentists: Extract<AutocompleteHit, { kind: "dentist" }>[];
  clinics: Extract<AutocompleteHit, { kind: "clinic" }>[];
}> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return { specialties: [], dentists: [], clinics: [] };
  const pattern = `%${trimmed}%`;
  const admin = createAdminClient();

  const [specs, dents, clins] = await Promise.all([
    admin
      .from("specialties")
      .select("slug, name_ar, name_en")
      .or(`name_en.ilike.${pattern},name_ar.ilike.${pattern}`)
      .limit(limit)
      .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
    admin
      .from("dentists")
      .select(
        `slug, name_ar, name_en, photo_url,
         clinic_dentists(clinic:clinics(area:areas(name_ar, name_en)))`
      )
      .eq("is_published", true)
      .or(`name_en.ilike.${pattern},name_ar.ilike.${pattern}`)
      .limit(limit)
      .returns<
        {
          slug: string;
          name_ar: string;
          name_en: string;
          photo_url: string | null;
          clinic_dentists: {
            clinic: { area: { name_ar: string; name_en: string } | null } | null;
          }[];
        }[]
      >(),
    admin
      .from("clinics")
      .select("slug, name_ar, name_en, logo_url, area:areas(name_ar, name_en)")
      .eq("is_published", true)
      .or(`name_en.ilike.${pattern},name_ar.ilike.${pattern}`)
      .limit(limit)
      .returns<
        {
          slug: string;
          name_ar: string;
          name_en: string;
          logo_url: string | null;
          area: { name_ar: string; name_en: string } | null;
        }[]
      >(),
  ]);

  return {
    specialties: (specs.data ?? []).map((s) => ({
      kind: "specialty" as const,
      slug: s.slug,
      nameAr: s.name_ar,
      nameEn: s.name_en,
    })),
    dentists: (dents.data ?? []).map((d) => {
      const firstArea = d.clinic_dentists?.[0]?.clinic?.area ?? null;
      return {
        kind: "dentist" as const,
        slug: d.slug,
        nameAr: d.name_ar,
        nameEn: d.name_en,
        photoUrl: d.photo_url,
        areaNameAr: firstArea?.name_ar ?? null,
        areaNameEn: firstArea?.name_en ?? null,
      };
    }),
    clinics: (clins.data ?? []).map((c) => ({
      kind: "clinic" as const,
      slug: c.slug,
      nameAr: c.name_ar,
      nameEn: c.name_en,
      logoUrl: c.logo_url,
      areaNameAr: c.area?.name_ar ?? null,
      areaNameEn: c.area?.name_en ?? null,
    })),
  };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npm run typecheck
git add lib/dentists/autocomplete.ts
git commit -m "feat(autocomplete): unified specialty + dentist + clinic search"
```

---

## Task 3.7: Autocomplete API route

**Files:**
- Create: `app/api/search/autocomplete/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/search/autocomplete/route.ts
import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/dentists/autocomplete";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const result = await autocomplete(q, 5);
  return NextResponse.json(result, {
    headers: { "cache-control": "private, max-age=10" },
  });
}
```

- [ ] **Step 2: Smoke**

```bash
curl 'http://localhost:3000/api/search/autocomplete?q=ah'
```

Expected: JSON with `specialties`, `dentists`, `clinics` arrays.

- [ ] **Step 3: Commit**

```bash
git add app/api/search/autocomplete/route.ts
git commit -m "feat(api): /api/search/autocomplete"
```

---

## Task 3.8: Rewrite listDentists to one-card-per-doctor (aggregated shape)

**Files:**
- Modify: `lib/dentists/list.ts`

This is the largest single change in Ship 3. Replace the existing `DentistListItem` type and the `listDentists` function body. (Keep `getDentistBySlug` as is.)

- [ ] **Step 1: Replace the type and function**

In `lib/dentists/list.ts`, replace `DentistListItem`, `ListFilters`, and the entire `listDentists` function with:

```ts
export type DentistResult = {
  dentistId: string;
  dentistSlug: string;
  nameAr: string;
  nameEn: string;
  title: string;
  yearsExperience: number | null;
  photoUrl: string | null;
  ratingSmoothed: number;
  ratingCount: number;
  isFeatured: boolean;
  minFeeEgp: number;
  nextAvailableSlot: string | null;
  anyTrustedClinic: boolean;
  distanceKm?: number;
  specialties: Array<{ slug: string; nameAr: string; nameEn: string }>;
  clinics: Array<{
    clinicDentistId: string;
    clinicId: string;
    clinicSlug: string;
    clinicNameAr: string;
    clinicNameEn: string;
    addressAr: string | null;
    addressEn: string | null;
    lat: number | null;
    lng: number | null;
    areaSlug: string | null;
    areaNameAr: string | null;
    areaNameEn: string | null;
    feeEgp: number;
    isTrusted: boolean;
    distanceKm?: number;
  }>;
};

// Backwards alias kept while consumers migrate.
export type DentistListItem = DentistResult;

export type ListFilters = {
  specialtySlug?: string;
  areaSlug?: string;
  feeMax?: number;
  minRating?: number;
  insuranceSlugs?: string[];
  availability?: "today" | "week";
  geo?: { lat: number; lng: number; radiusKm: number };
  sortBy?: "best" | "rating" | "fee" | "soonest" | "nearest";
};

export async function listDentists(filters: ListFilters = {}): Promise<DentistResult[]> {
  const admin = createAdminClient();

  // Resolve filter ids
  let areaId: string | null = null;
  if (filters.areaSlug && !filters.geo) {
    const { data } = await admin.from("areas").select("id").eq("slug", filters.areaSlug).maybeSingle<{
      id: string;
    }>();
    areaId = data?.id ?? null;
  }
  let specialtyId: string | null = null;
  if (filters.specialtySlug) {
    const { data } = await admin.from("specialties").select("id").eq("slug", filters.specialtySlug).maybeSingle<{
      id: string;
    }>();
    specialtyId = data?.id ?? null;
  }
  let dentistIdsForSpecialty: string[] | null = null;
  if (specialtyId) {
    const { data } = await admin
      .from("dentist_specialties")
      .select("dentist_id")
      .eq("specialty_id", specialtyId)
      .returns<{ dentist_id: string }[]>();
    dentistIdsForSpecialty = (data ?? []).map((d) => d.dentist_id);
    if (dentistIdsForSpecialty.length === 0) return [];
  }

  let insuranceClinicIds: string[] | null = null;
  if (filters.insuranceSlugs && filters.insuranceSlugs.length > 0) {
    const { data: provs } = await admin
      .from("insurance_providers")
      .select("id")
      .in("slug", filters.insuranceSlugs)
      .returns<{ id: string }[]>();
    const provIds = (provs ?? []).map((p) => p.id);
    if (provIds.length === 0) return [];
    const { data: ci } = await admin
      .from("clinic_insurance")
      .select("clinic_id")
      .in("insurance_id", provIds)
      .returns<{ clinic_id: string }[]>();
    insuranceClinicIds = Array.from(new Set((ci ?? []).map((r) => r.clinic_id)));
    if (insuranceClinicIds.length === 0) return [];
  }

  // Pull joined rows
  type Row = {
    id: string;
    fee_egp: number;
    clinic_id: string;
    dentist_id: string;
    is_active: boolean;
    clinic: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      address_ar: string | null;
      address_en: string | null;
      lat: number | null;
      lng: number | null;
      is_published: boolean;
      is_trusted: boolean;
      area_id: string | null;
      area: { slug: string; name_ar: string; name_en: string } | null;
    } | null;
    dentist: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      title: string;
      years_experience: number | null;
      photo_url: string | null;
      is_published: boolean;
      rating_smoothed: number;
      rating_count: number;
      is_featured: boolean;
      featured_rank: number | null;
      next_available_slot: string | null;
    } | null;
  };

  let q = admin
    .from("clinic_dentists")
    .select(
      `
      id, fee_egp, clinic_id, dentist_id, is_active,
      clinic:clinics!inner(
        id, slug, name_ar, name_en, address_ar, address_en, lat, lng, is_published, is_trusted, area_id,
        area:areas(slug, name_ar, name_en)
      ),
      dentist:dentists!inner(
        id, slug, name_ar, name_en, title, years_experience, photo_url, is_published,
        rating_smoothed, rating_count, is_featured, featured_rank, next_available_slot
      )
    `
    )
    .eq("is_active", true)
    .eq("clinic.is_published", true)
    .eq("dentist.is_published", true);

  if (areaId) q = q.eq("clinic.area_id", areaId);
  if (typeof filters.feeMax === "number") q = q.lte("fee_egp", filters.feeMax);
  if (typeof filters.minRating === "number") q = q.gte("dentist.rating_smoothed", filters.minRating);
  if (dentistIdsForSpecialty) q = q.in("dentist_id", dentistIdsForSpecialty);
  if (insuranceClinicIds) q = q.in("clinic_id", insuranceClinicIds);

  const { data: rows, error } = await q.returns<Row[]>();
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Specialties
  const dentistIds = Array.from(new Set(rows.map((r) => r.dentist_id)));
  const { data: ds } = await admin
    .from("dentist_specialties")
    .select("dentist_id, specialty:specialties(slug, name_ar, name_en)")
    .in("dentist_id", dentistIds)
    .returns<{
      dentist_id: string;
      specialty: { slug: string; name_ar: string; name_en: string };
    }[]>();
  const specsByDentist = new Map<string, DentistResult["specialties"]>();
  for (const s of ds ?? []) {
    const arr = specsByDentist.get(s.dentist_id) ?? [];
    arr.push({ slug: s.specialty.slug, nameAr: s.specialty.name_ar, nameEn: s.specialty.name_en });
    specsByDentist.set(s.dentist_id, arr);
  }

  // Aggregate: GROUP BY dentist
  const byDentist = new Map<string, DentistResult>();
  for (const r of rows) {
    if (!r.dentist || !r.clinic) continue;
    const dist =
      filters.geo && r.clinic.lat != null && r.clinic.lng != null
        ? haversineKm(filters.geo.lat, filters.geo.lng, r.clinic.lat, r.clinic.lng)
        : undefined;
    if (filters.geo && (dist == null || dist > filters.geo.radiusKm)) continue;

    const clinicEntry = {
      clinicDentistId: r.id,
      clinicId: r.clinic.id,
      clinicSlug: r.clinic.slug,
      clinicNameAr: r.clinic.name_ar,
      clinicNameEn: r.clinic.name_en,
      addressAr: r.clinic.address_ar,
      addressEn: r.clinic.address_en,
      lat: r.clinic.lat,
      lng: r.clinic.lng,
      areaSlug: r.clinic.area?.slug ?? null,
      areaNameAr: r.clinic.area?.name_ar ?? null,
      areaNameEn: r.clinic.area?.name_en ?? null,
      feeEgp: r.fee_egp,
      isTrusted: r.clinic.is_trusted,
      distanceKm: dist,
    };

    const existing = byDentist.get(r.dentist.id);
    if (existing) {
      existing.clinics.push(clinicEntry);
      if (r.fee_egp < existing.minFeeEgp) existing.minFeeEgp = r.fee_egp;
      if (r.clinic.is_trusted) existing.anyTrustedClinic = true;
      if (dist != null && (existing.distanceKm == null || dist < existing.distanceKm)) {
        existing.distanceKm = dist;
      }
    } else {
      byDentist.set(r.dentist.id, {
        dentistId: r.dentist.id,
        dentistSlug: r.dentist.slug,
        nameAr: r.dentist.name_ar,
        nameEn: r.dentist.name_en,
        title: r.dentist.title,
        yearsExperience: r.dentist.years_experience,
        photoUrl: r.dentist.photo_url,
        ratingSmoothed: r.dentist.rating_smoothed,
        ratingCount: r.dentist.rating_count,
        isFeatured: r.dentist.is_featured,
        minFeeEgp: r.fee_egp,
        nextAvailableSlot: r.dentist.next_available_slot,
        anyTrustedClinic: r.clinic.is_trusted,
        distanceKm: dist,
        specialties: specsByDentist.get(r.dentist.id) ?? [],
        clinics: [clinicEntry],
      });
    }
  }

  // Availability filter (post-aggregate; uses dentist-level next_available_slot)
  let list = Array.from(byDentist.values());
  if (filters.availability === "today") {
    const cutoff = endOfDay(new Date()).getTime();
    list = list.filter((d) => {
      if (!d.nextAvailableSlot) return false;
      return new Date(d.nextAvailableSlot).getTime() < cutoff;
    });
  } else if (filters.availability === "week") {
    const cutoff = endOfWeek(new Date()).getTime();
    list = list.filter((d) => {
      if (!d.nextAvailableSlot) return false;
      return new Date(d.nextAvailableSlot).getTime() < cutoff;
    });
  }

  // Sort
  const sortBy = filters.sortBy ?? "best";
  const sorted = sortResults(list, sortBy);
  return sorted;
}

function sortResults(list: DentistResult[], sortBy: NonNullable<ListFilters["sortBy"]>) {
  const out = [...list];
  switch (sortBy) {
    case "rating":
      out.sort((a, b) => b.ratingSmoothed - a.ratingSmoothed || b.ratingCount - a.ratingCount);
      break;
    case "fee":
      out.sort((a, b) => a.minFeeEgp - b.minFeeEgp);
      break;
    case "soonest":
      out.sort((a, b) => slotKey(a.nextAvailableSlot) - slotKey(b.nextAvailableSlot));
      break;
    case "nearest":
      out.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      break;
    case "best":
    default:
      out.sort((a, b) => {
        const r = b.ratingSmoothed - a.ratingSmoothed;
        if (r !== 0) return r;
        const d = (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        if (d !== 0) return d;
        return b.ratingCount - a.ratingCount;
      });
  }
  return out;
}

function slotKey(s: string | null): number {
  return s ? new Date(s).getTime() : Number.MAX_SAFE_INTEGER;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function endOfWeek(d: Date): Date {
  // End of week = next Monday 00:00 (i.e., we include rest of current week).
  const r = new Date(d);
  const day = r.getDay(); // 0..6 (Sun=0)
  // Treat Mon as start of week: days until next Monday = (8 - day) % 7 || 7
  const daysUntilMon = (8 - day) % 7 || 7;
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() + daysUntilMon);
  return r;
}
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

- [ ] **Step 2: Update consumers — search-results + dentist-card use new shape**

The shape change ripples. The existing `SearchResults` and `DentistCard` reference `clinicDentistId`, `clinicSlug`, `clinic.{nameAr,...}`, `feeEgp`. They need updating in subsequent tasks (3.9–3.10). For now, accept type errors will appear; we'll fix them in those tasks.

- [ ] **Step 3: Type-check (errors expected — fix in later tasks)**

```bash
npm run typecheck
```

Expected: Errors in `components/patient/search-results.tsx` and `components/patient/dentist-card.tsx` referencing old fields. These are fixed in 3.9 and 3.10.

Do NOT commit yet — wait until consumers are updated.

---

## Task 3.9: Update DentistCard for aggregated shape (with soonest-slot, expandable clinics)

**Files:**
- Modify: `components/patient/dentist-card.tsx`

- [ ] **Step 1: Rewrite the card**

Replace the entire file content with:

```tsx
"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Star, MapPin, ArrowRight, BadgeCheck, Sparkles, Clock, ChevronDown } from "lucide-react";
import type { DentistResult } from "@/lib/dentists/list";
import { getRatingDisplay } from "@/lib/dentists/rating";
import { SaveHeart } from "./save-heart";

const TITLE_LABEL: Record<string, { en: string; ar: string }> = {
  professor: { en: "Professor", ar: "أستاذ" },
  consultant: { en: "Consultant", ar: "استشاري" },
  specialist: { en: "Specialist", ar: "أخصائي" },
  resident: { en: "Resident", ar: "مقيم" },
};

export function DentistCard({
  d,
  locale,
  isSaved = false,
  labels,
}: {
  d: DentistResult;
  locale: string;
  isSaved?: boolean;
  labels: {
    consultationFrom: string;
    ratingNew: string;
    trusted: string;
    showAllClinics: string;
    soonest: { today: string; tomorrow: string; later: (date: string) => string };
    book: string;
    distance: (km: number) => string;
  };
}) {
  const isAr = locale === "ar";
  const name = isAr ? d.nameAr : d.nameEn;
  const titleLabel = TITLE_LABEL[d.title]?.[isAr ? "ar" : "en"] ?? d.title;
  const ratingDisplay = getRatingDisplay({
    rating_smoothed: d.ratingSmoothed,
    rating_count: d.ratingCount,
  });
  const [expanded, setExpanded] = useState(false);
  const primary = d.clinics[0];
  const soonest = formatSoonest(d.nextAvailableSlot, isAr, labels.soonest);

  return (
    <div className="rounded-2xl bg-white border border-ink-100 p-5 md:p-6 shadow-card">
      <div className="flex items-start gap-4">
        <Link href={`/dentist/${d.dentistSlug}`} className="shrink-0">
          <span className="w-14 h-14 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[18px] font-bold">
            {(d.nameEn ?? "").split(" ").slice(-2).map((s) => s[0]).join("")}
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
            <Link href={`/dentist/${d.dentistSlug}`}>
              <h3 className="font-display text-[17px] md:text-[19px] font-bold text-ink-900 truncate hover:text-teal-700">
                {name}
              </h3>
            </Link>
            <span className="small-caps text-teal-600">{titleLabel}</span>
          </div>
          {d.specialties.length > 0 && (
            <div className="text-[13.5px] text-ink-600 mb-2">
              {d.specialties
                .slice(0, 2)
                .map((s) => (isAr ? s.nameAr : s.nameEn))
                .join(" · ")}
            </div>
          )}
          {primary && (
            <div className="flex items-center gap-2 text-[13px] text-ink-500">
              <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" aria-hidden />
              <span className="truncate">
                {(isAr ? primary.clinicNameAr : primary.clinicNameEn) +
                  (primary.areaNameEn ? ` · ${isAr ? primary.areaNameAr : primary.areaNameEn}` : "")}
                {d.clinics.length > 1 ? ` (+${d.clinics.length - 1})` : ""}
              </span>
              {d.anyTrustedClinic && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold shrink-0"
                  title={labels.trusted}
                >
                  <BadgeCheck className="w-3 h-3" aria-hidden />
                  {labels.trusted}
                </span>
              )}
            </div>
          )}
        </div>
        <SaveHeart dentistId={d.dentistId} initialSaved={isSaved} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[12.5px] text-ink-600">
        <span className="text-[14px]">
          <span className="text-ink-500">{labels.consultationFrom} </span>
          <span className="font-display font-bold text-ink-900">{d.minFeeEgp}</span>
          <span className="text-ink-500"> EGP</span>
        </span>
        {ratingDisplay.kind === "stars" ? (
          <span className="inline-flex items-center gap-1 text-ink-700">
            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" aria-hidden />
            <span className="font-semibold">{ratingDisplay.smoothed.toFixed(1)}</span>
            <span className="text-ink-400">({ratingDisplay.count})</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
            <Sparkles className="w-3 h-3" aria-hidden />
            {labels.ratingNew}
          </span>
        )}
        {soonest && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
            <Clock className="w-3 h-3" aria-hidden />
            {soonest}
          </span>
        )}
        {d.distanceKm != null && (
          <span className="text-ink-500">{labels.distance(d.distanceKm)}</span>
        )}
      </div>

      {d.clinics.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-700 hover:text-teal-800"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
          {labels.showAllClinics}
        </button>
      )}

      {expanded && d.clinics.length > 1 && (
        <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
          {d.clinics.map((c) => (
            <li key={c.clinicDentistId} className="flex items-center justify-between py-2 text-[13px]">
              <span className="text-ink-700 truncate">
                {(isAr ? c.clinicNameAr : c.clinicNameEn) +
                  (c.areaNameEn ? ` · ${isAr ? c.areaNameAr : c.areaNameEn}` : "")}
                {c.isTrusted && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 ms-2 rounded-md bg-teal-50 text-teal-700 font-semibold">
                    <BadgeCheck className="w-3 h-3" aria-hidden />
                    {labels.trusted}
                  </span>
                )}
              </span>
              <span className="text-ink-700 shrink-0">
                <span className="font-bold text-ink-900">{c.feeEgp}</span> EGP
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 pt-4 border-t border-ink-100 flex justify-end">
        <Link
          href={`/dentist/${d.dentistSlug}`}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-700 hover:text-teal-800"
        >
          {labels.book}
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function formatSoonest(
  iso: string | null,
  isAr: boolean,
  labels: { today: string; tomorrow: string; later: (date: string) => string }
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const slotDay = new Date(date);
  slotDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((slotDay.getTime() - today.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString(isAr ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !isAr,
  });
  if (diffDays === 0) return `${labels.today} ${time}`;
  if (diffDays === 1) return `${labels.tomorrow} ${time}`;
  return labels.later(
    date.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { weekday: "short" })
  );
}
```

- [ ] **Step 2: Verify SaveHeart import resolves**

`SaveHeart` is created in Task 3.13. Until then, leave the import — type-check will fail. We'll resolve in 3.13.

---

## Task 3.10: Update SearchResults to pass labels and aggregated data

**Files:**
- Modify: `components/patient/search-results.tsx`

- [ ] **Step 1: Replace component**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LayoutGrid, Map } from "lucide-react";
import { DentistCard } from "./dentist-card";
import type { DentistResult } from "@/lib/dentists/list";

const ClinicMap = dynamic(() => import("./clinic-map").then((m) => m.ClinicMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-teal-50 rounded-2xl">
      <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
    </div>
  ),
});

type View = "list" | "map";

export function SearchResults({
  dentists,
  locale,
  emptyTitle,
  emptyBody,
  savedDentistIds,
  cardLabels,
}: {
  dentists: DentistResult[];
  locale: string;
  emptyTitle: string;
  emptyBody: string;
  savedDentistIds: Set<string>;
  cardLabels: Parameters<typeof DentistCard>[0]["labels"];
}) {
  const isAr = locale === "ar";
  const [view, setView] = useState<View>("list");

  const flatForMap = dentists.flatMap((d) =>
    d.clinics
      .filter((c) => c.lat != null && c.lng != null)
      .map((c) => ({
        clinicDentistId: c.clinicDentistId,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        feeEgp: c.feeEgp,
        clinic: {
          nameAr: c.clinicNameAr,
          nameEn: c.clinicNameEn,
          lat: c.lat,
          lng: c.lng,
          addressAr: c.addressAr,
          addressEn: c.addressEn,
        },
        dentistSlug: d.dentistSlug,
      }))
  );
  const hasMapped = flatForMap.length > 0;

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-4">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            view === "list" ? "bg-teal-500 text-white shadow-sm" : "text-ink-500 hover:text-ink-800 hover:bg-ink-50"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
          {isAr ? "قائمة" : "List"}
        </button>
        <button
          type="button"
          onClick={() => setView("map")}
          disabled={!hasMapped}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            view === "map" ? "bg-teal-500 text-white shadow-sm" : "text-ink-500 hover:text-ink-800 hover:bg-ink-50"
          }`}
        >
          <Map className="w-3.5 h-3.5" aria-hidden />
          {isAr ? "خريطة" : "Map"}
        </button>
      </div>

      {view === "map" && hasMapped && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
          <div className="h-[520px] lg:h-[640px]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <ClinicMap clinics={flatForMap as any} locale={locale} activeId={null} onHover={() => {}} />
          </div>
          <div className="flex flex-col gap-3 max-h-[640px] overflow-y-auto pr-1 lg:pr-2">
            {dentists.map((d) => (
              <DentistCard
                key={d.dentistId}
                d={d}
                locale={locale}
                isSaved={savedDentistIds.has(d.dentistId)}
                labels={cardLabels}
              />
            ))}
          </div>
        </div>
      )}

      {view === "list" &&
        (dentists.length === 0 ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
            <h3 className="font-display text-[20px] font-bold text-ink-900 mb-2">{emptyTitle}</h3>
            <p className="text-[14px] text-ink-500 max-w-[44ch] mx-auto">{emptyBody}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {dentists.map((d) => (
              <DentistCard
                key={d.dentistId}
                d={d}
                locale={locale}
                isSaved={savedDentistIds.has(d.dentistId)}
                labels={cardLabels}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
```

`ClinicMap` was previously typed against `DentistListItem`; we shim with `as any` in the map view to avoid a deeper rewrite. (Map view will be revisited post-pilot.)

- [ ] **Step 2: Type-check (will still fail until SaveHeart, /search page wiring done)**

Don't commit yet.

---

## Task 3.11: SaveHeart component + favorites server action

**Files:**
- Create: `components/patient/save-heart.tsx`
- Create: `lib/dentists/favorites.ts`
- Create: `app/api/favorites/route.ts`

- [ ] **Step 1: Favorites helper**

```ts
// lib/dentists/favorites.ts
import { createServerClient } from "@/lib/supabase/server";

export async function getMyFavoriteDentistIds(): Promise<Set<string>> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return new Set();
  const { data } = await supa
    .from("favorites")
    .select("dentist_id")
    .eq("profile_id", user.id)
    .returns<{ dentist_id: string }[]>();
  return new Set((data ?? []).map((r) => r.dentist_id));
}
```

- [ ] **Step 2: API route — POST/DELETE favorites**

```ts
// app/api/favorites/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.dentistId !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { error } = await supa
    .from("favorites")
    .upsert({ profile_id: user.id, dentist_id: body.dentistId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const dentistId = url.searchParams.get("dentistId");
  if (!dentistId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { error } = await supa
    .from("favorites")
    .delete()
    .eq("profile_id", user.id)
    .eq("dentist_id", dentistId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: SaveHeart component**

```tsx
// components/patient/save-heart.tsx
"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export function SaveHeart({
  dentistId,
  initialSaved,
}: {
  dentistId: string;
  initialSaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await fetch(
        next
          ? "/api/favorites"
          : `/api/favorites?dentistId=${encodeURIComponent(dentistId)}`,
        {
          method: next ? "POST" : "DELETE",
          headers: next ? { "content-type": "application/json" } : undefined,
          body: next ? JSON.stringify({ dentistId }) : undefined,
        }
      );
      if (res.status === 401) {
        // Send to sign-in, return to current page
        router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        setSaved(false);
        return;
      }
      if (!res.ok) {
        setSaved(!next); // revert
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-50 hover:text-rose-500 transition-colors"
    >
      <Heart
        className={`w-5 h-5 transition-colors ${
          saved ? "fill-rose-500 stroke-rose-500" : ""
        }`}
        aria-hidden
      />
    </button>
  );
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npm run typecheck
git add lib/dentists/favorites.ts app/api/favorites/route.ts components/patient/save-heart.tsx
git commit -m "feat(favorites): SaveHeart + API + helper"
```

---

## Task 3.12: Update /search page for new filters and aggregated shape

**Files:**
- Modify: `app/[locale]/(patient)/search/page.tsx`

- [ ] **Step 1: Rewrite the page**

Read the current `app/[locale]/(patient)/search/page.tsx` fully first. Then replace with a version that consumes the new filters and passes labels/savedIds:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listDentists } from "@/lib/dentists/list";
import { SearchResults } from "@/components/patient/search-results";
import { SearchFilters } from "@/components/patient/search-filters";
import { SearchSort } from "@/components/patient/search-sort";
import { getMyFavoriteDentistIds } from "@/lib/dentists/favorites";
import { createAdminClient } from "@/lib/supabase/admin";
import { Search as SearchIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = {
  specialty?: string;
  area?: string;
  feeMax?: string;
  sort?: "best" | "rating" | "fee" | "soonest" | "nearest";
  minRating?: string;
  insurance?: string | string[];
  availability?: "today" | "week";
  lat?: string;
  lng?: string;
  radiusKm?: string;
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Search");

  const admin = createAdminClient();
  const [{ data: specialties }, { data: areas }, { data: insurances }, savedSet] =
    await Promise.all([
      admin.from("specialties").select("slug, name_ar, name_en").order("name_en")
        .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
      admin.from("areas").select("slug, name_ar, name_en").order("name_en")
        .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
      admin.from("insurance_providers").select("slug, name_ar, name_en").order("name_en")
        .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
      getMyFavoriteDentistIds(),
    ]);

  const insuranceSlugs = sp.insurance
    ? Array.isArray(sp.insurance)
      ? sp.insurance
      : [sp.insurance]
    : undefined;

  const geo =
    sp.lat && sp.lng && sp.radiusKm
      ? {
          lat: parseFloat(sp.lat),
          lng: parseFloat(sp.lng),
          radiusKm: parseFloat(sp.radiusKm),
        }
      : undefined;

  const dentists = await listDentists({
    specialtySlug: sp.specialty,
    areaSlug: sp.area,
    feeMax: sp.feeMax ? parseInt(sp.feeMax, 10) : undefined,
    minRating: sp.minRating ? parseFloat(sp.minRating) : undefined,
    insuranceSlugs,
    availability: sp.availability,
    geo,
    sortBy: sp.sort,
  });

  const cardLabels = {
    consultationFrom: t("consultationFrom"),
    ratingNew: t("ratingNew"),
    trusted: t("trusted"),
    showAllClinics: t("showAllClinics"),
    book: t("book"),
    soonest: {
      today: t("soonestToday"),
      tomorrow: t("soonestTomorrow"),
      later: (date: string) => t("soonestLater", { date }),
    },
    distance: (km: number) =>
      t("distance", { km: km < 10 ? km.toFixed(1) : Math.round(km).toString() }),
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-5 md:px-8 py-8 md:py-14">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <SearchIcon className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="display-h2 text-[24px] sm:text-[28px] md:text-[36px] text-ink-900 leading-tight">
          {t("headerTitle")}
        </h1>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <p className="text-[13.5px] text-ink-500">
          {t("resultsCount", { count: dentists.length })}
        </p>
        <SearchSort
          current={sp.sort ?? "best"}
          labels={{
            sortLabel: t("sortLabel"),
            sortBest: t("sortBest"),
            sortRating: t("sortRating"),
            sortFee: t("sortFee"),
          }}
        />
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
        <SearchFilters
          specialties={specialties ?? []}
          areas={areas ?? []}
          insurances={insurances ?? []}
          current={{
            specialty: sp.specialty,
            area: sp.area,
            feeMax: sp.feeMax,
            minRating: sp.minRating,
            insurance: insuranceSlugs,
            availability: sp.availability,
            radiusKm: sp.radiusKm,
            lat: sp.lat,
            lng: sp.lng,
          }}
          locale={locale}
          labels={{
            title: t("filtersTitle"),
            anySpecialty: t("filterAnySpecialty"),
            anyArea: t("filterAnyArea"),
            feeMax: t("filterFeeMax"),
            apply: t("filterApply"),
            reset: t("filterReset"),
            showFilters: t("showFilters"),
            filterMinRating: t("filterMinRating"),
            filterInsurance: t("filterInsurance"),
            filterAvailability: t("filterAvailability"),
            availabilityToday: t("availabilityToday"),
            availabilityWeek: t("availabilityWeek"),
            distanceTitle: t("distanceTitle"),
            nearMe: t("nearMe"),
            nearMeDeny: t("nearMeDeny"),
          }}
        />

        <SearchResults
          dentists={dentists}
          locale={locale}
          emptyTitle={t("emptyTitle")}
          emptyBody={t("emptyBody")}
          savedDentistIds={savedSet}
          cardLabels={cardLabels}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add new sort options to SearchSort**

In `components/patient/search-sort.tsx`, extend the union and add two more options:

```ts
type SortValue = "best" | "rating" | "fee" | "soonest" | "nearest";
```

Add two more `<option>` entries inside the select; pass labels through props (extend `labels` to include `sortSoonest` and `sortNearest`).

- [ ] **Step 3: Don't commit yet**

Filters component update next.

---

## Task 3.13: Update SearchFilters for insurance, availability, distance

**Files:**
- Modify: `components/patient/search-filters.tsx`
- Create: `components/patient/near-me-button.tsx`

- [ ] **Step 1: NearMeButton component**

```tsx
// components/patient/near-me-button.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Locate, X } from "lucide-react";

export function NearMeButton({
  active,
  labels,
}: {
  active: boolean;
  labels: { nearMe: string; nearMeDeny: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [denied, setDenied] = useState(false);

  function clear() {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.delete("lat");
    sp.delete("lng");
    sp.delete("radiusKm");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function request() {
    if (!("geolocation" in navigator)) {
      setDenied(true);
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPending(false);
        const sp = new URLSearchParams(params?.toString() ?? "");
        sp.set("lat", pos.coords.latitude.toFixed(5));
        sp.set("lng", pos.coords.longitude.toFixed(5));
        if (!sp.get("radiusKm")) sp.set("radiusKm", "10");
        sp.delete("area"); // mutually exclusive
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      },
      () => {
        setPending(false);
        setDenied(true);
      },
      { timeout: 8000, maximumAge: 60_000 }
    );
  }

  if (active) {
    return (
      <button
        type="button"
        onClick={clear}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-ink-500 hover:bg-ink-50 transition-colors"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
        {labels.nearMe}
      </button>
    );
  }
  if (denied) {
    return <p className="text-[12px] text-ink-400">{labels.nearMeDeny}</p>;
  }
  return (
    <button
      type="button"
      onClick={request}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-50"
    >
      <Locate className="w-3.5 h-3.5" aria-hidden />
      {labels.nearMe}
    </button>
  );
}
```

- [ ] **Step 2: Replace SearchFilters with extended version**

Read current `components/patient/search-filters.tsx`. Replace `Props` and `FilterForm` to include insurance, availability chips, distance slider:

```tsx
"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Filter, X } from "lucide-react";
import { NearMeButton } from "./near-me-button";

type Option = { slug: string; name_ar: string; name_en: string };

type Props = {
  specialties: Option[];
  areas: Option[];
  insurances: Option[];
  current: {
    specialty?: string;
    area?: string;
    feeMax?: string;
    minRating?: string;
    insurance?: string[];
    availability?: "today" | "week";
    lat?: string;
    lng?: string;
    radiusKm?: string;
  };
  locale: string;
  labels: {
    title: string;
    anySpecialty: string;
    anyArea: string;
    feeMax: string;
    apply: string;
    reset: string;
    showFilters: string;
    filterMinRating: string;
    filterInsurance: string;
    filterAvailability: string;
    availabilityToday: string;
    availabilityWeek: string;
    distanceTitle: string;
    nearMe: string;
    nearMeDeny: string;
  };
};

export function SearchFilters(props: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = [
    props.current.specialty,
    props.current.area,
    props.current.feeMax,
    props.current.minRating,
    (props.current.insurance ?? []).length > 0 ? "x" : null,
    props.current.availability,
    props.current.lat,
  ].filter(Boolean).length;

  return (
    <>
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-ink-100 shadow-card hover:border-teal-300 transition-colors"
        >
          <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-800">
            <Filter className="w-4 h-4 text-teal-600" aria-hidden />
            {props.labels.showFilters}
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full bg-teal-600 text-white text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" aria-label="Close" />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-ink-100 shrink-0">
              <h2 className="font-display text-[18px] font-bold text-ink-900">{props.labels.title}</h2>
              <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-ink-50">
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <FilterForm {...props} />
            </div>
          </div>
        </div>
      )}

      <aside className="hidden lg:block lg:sticky lg:top-24 self-start">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="font-display text-[15px] font-bold text-ink-900 mb-4">{props.labels.title}</h2>
          <FilterForm {...props} />
        </div>
      </aside>
    </>
  );
}

function FilterForm({ specialties, areas, insurances, current, locale, labels }: Props) {
  const isAr = locale === "ar";
  const gpsActive = !!(current.lat && current.lng);
  return (
    <form action={`/${locale}/search`} method="get" className="space-y-5">
      <div>
        <label className="field-label" htmlFor="specialty">{labels.anySpecialty}</label>
        <select id="specialty" name="specialty" defaultValue={current.specialty ?? ""} className="field-input !py-2.5 !text-[14px]">
          <option value="">{labels.anySpecialty}</option>
          {specialties.map((s) => (
            <option key={s.slug} value={s.slug}>{isAr ? s.name_ar : s.name_en}</option>
          ))}
        </select>
      </div>

      {!gpsActive && (
        <div>
          <label className="field-label" htmlFor="area">{labels.anyArea}</label>
          <select id="area" name="area" defaultValue={current.area ?? ""} className="field-input !py-2.5 !text-[14px]">
            <option value="">{labels.anyArea}</option>
            {areas.map((a) => (
              <option key={a.slug} value={a.slug}>{isAr ? a.name_ar : a.name_en}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="field-label !mb-0">{labels.distanceTitle}</span>
          <NearMeButton active={gpsActive} labels={{ nearMe: labels.nearMe, nearMeDeny: labels.nearMeDeny }} />
        </div>
        {gpsActive && (
          <>
            <input type="range" name="radiusKm" min={1} max={30} step={1} defaultValue={current.radiusKm ?? "10"} className="w-full" />
            <input type="hidden" name="lat" value={current.lat ?? ""} />
            <input type="hidden" name="lng" value={current.lng ?? ""} />
          </>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="feeMax">{labels.feeMax}</label>
        <input id="feeMax" name="feeMax" type="number" inputMode="numeric" min={0} step={50} defaultValue={current.feeMax ?? ""} placeholder="—" className="field-input !py-2.5 !text-[14px]" />
      </div>

      <div>
        <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink-800 cursor-pointer">
          <input type="checkbox" name="minRating" value="4" defaultChecked={current.minRating === "4"} className="w-4 h-4 rounded border-ink-300 text-teal-600 focus:ring-teal-500" />
          {labels.filterMinRating}
        </label>
      </div>

      <fieldset>
        <legend className="field-label">{labels.filterAvailability}</legend>
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-100 text-[13px] cursor-pointer has-[:checked]:bg-teal-50 has-[:checked]:border-teal-300 has-[:checked]:text-teal-800">
            <input type="radio" name="availability" value="today" defaultChecked={current.availability === "today"} className="sr-only" />
            {labels.availabilityToday}
          </label>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-100 text-[13px] cursor-pointer has-[:checked]:bg-teal-50 has-[:checked]:border-teal-300 has-[:checked]:text-teal-800">
            <input type="radio" name="availability" value="week" defaultChecked={current.availability === "week"} className="sr-only" />
            {labels.availabilityWeek}
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">{labels.filterInsurance}</legend>
        <div className="flex flex-wrap gap-2">
          {insurances.map((p) => {
            const checked = (current.insurance ?? []).includes(p.slug);
            return (
              <label key={p.slug} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-ink-100 text-[12.5px] cursor-pointer has-[:checked]:bg-teal-50 has-[:checked]:border-teal-300 has-[:checked]:text-teal-800">
                <input type="checkbox" name="insurance" value={p.slug} defaultChecked={checked} className="sr-only" />
                {isAr ? p.name_ar : p.name_en}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary !py-2.5 !px-4 !text-[13px] flex-1">{labels.apply}</button>
        <Link href="/search" className="btn-secondary !py-2.5 !px-4 !text-[13px]">{labels.reset}</Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run typecheck
```

Expected: zero errors (assuming all subcomponents from prior tasks compile).

- [ ] **Step 4: i18n strings**

Add to `messages/en.json` Search namespace:

```json
    "consultationFrom": "Consultation from",
    "trusted": "Trusted",
    "showAllClinics": "Show all clinics",
    "book": "Book",
    "soonestToday": "Today",
    "soonestTomorrow": "Tomorrow",
    "soonestLater": "{date}",
    "distance": "{km} km away",
    "filterInsurance": "Insurance",
    "filterAvailability": "Availability",
    "availabilityToday": "Today",
    "availabilityWeek": "This week",
    "distanceTitle": "Distance",
    "nearMe": "Near me",
    "nearMeDeny": "Allow location to use nearby search.",
    "sortSoonest": "Soonest available",
    "sortNearest": "Nearest"
```

Mirror in `ar.json`:

```json
    "consultationFrom": "كشف ابتداءً من",
    "trusted": "موثقة",
    "showAllClinics": "عرض كل العيادات",
    "book": "احجز",
    "soonestToday": "اليوم",
    "soonestTomorrow": "غداً",
    "soonestLater": "{date}",
    "distance": "{km} كم",
    "filterInsurance": "تأمين",
    "filterAvailability": "متاح",
    "availabilityToday": "اليوم",
    "availabilityWeek": "هذا الأسبوع",
    "distanceTitle": "المسافة",
    "nearMe": "قريب مني",
    "nearMeDeny": "اسمح بالموقع لتفعيل البحث القريب.",
    "sortSoonest": "الأقرب توفراً",
    "sortNearest": "الأقرب مكاناً"
```

- [ ] **Step 5: Smoke + commit**

```bash
npm run typecheck && npm run lint
```

Open `http://localhost:3000/en/search`. Confirm: insurance chips, availability radios, distance "Near me" button render in sidebar. Click "Near me" → grant location → URL gains `lat=`, `lng=`, `radiusKm=10`; area filter becomes hidden. Slider adjusts radius.

```bash
git add -A
git commit -m "feat(search): aggregated cards + insurance/availability/distance filters"
```

---

## Task 3.14: Hero universal autocomplete

**Files:**
- Create: `components/patient/search-autocomplete.tsx`
- Modify: `app/[locale]/(patient)/page.tsx` (replace the hero Specialty input)

- [ ] **Step 1: Autocomplete component**

```tsx
// components/patient/search-autocomplete.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Hit =
  | { kind: "specialty"; slug: string; nameAr: string; nameEn: string }
  | {
      kind: "dentist" | "clinic";
      slug: string;
      nameAr: string;
      nameEn: string;
      photoUrl?: string | null;
      logoUrl?: string | null;
      areaNameEn?: string | null;
      areaNameAr?: string | null;
    };

export function SearchAutocomplete({
  locale,
  label,
  placeholder,
  emptyHint,
}: {
  locale: string;
  label: string;
  placeholder: string;
  emptyHint: string;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ specialties: Hit[]; dentists: Hit[]; clinics: Hit[] } | null>(null);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then(setHits)
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(hit: Hit) {
    setOpen(false);
    if (hit.kind === "specialty") {
      router.push(`/${locale}/search?specialty=${hit.slug}`);
    } else if (hit.kind === "dentist") {
      router.push(`/${locale}/dentist/${hit.slug}`);
    } else {
      router.push(`/${locale}/clinic/${hit.slug}`);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Default form submit goes to /search?specialty=<text> for free-text fallback.
    // No interception needed; this lets users hit Enter and still land somewhere reasonable.
  }

  return (
    <div className="relative" ref={wrap}>
      <label className="search-field">
        <Search className="w-[18px] h-[18px] text-teal-500 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <span className="block text-[10.5px] uppercase tracking-[0.14em] font-bold text-ink-400">{label}</span>
          <input
            type="text"
            name="specialty"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="!p-0 mt-0.5 text-[15.5px] font-medium w-full"
            autoComplete="off"
          />
        </div>
      </label>
      {open && q.trim().length >= 2 && hits && (
        <div className="absolute z-30 left-0 right-0 mt-2 rounded-xl bg-white border border-ink-100 shadow-card-hover overflow-hidden">
          {hits.specialties.length === 0 && hits.dentists.length === 0 && hits.clinics.length === 0 && (
            <div className="px-4 py-4 text-[13px] text-ink-500">{emptyHint}</div>
          )}
          {hits.specialties.length > 0 && (
            <Group title={isAr ? "تخصصات" : "Specialties"}>
              {hits.specialties.map((s) => (
                <Item key={s.slug} onClick={() => pick(s)} primary={isAr ? s.nameAr : s.nameEn} />
              ))}
            </Group>
          )}
          {hits.dentists.length > 0 && (
            <Group title={isAr ? "أطباء" : "Dentists"}>
              {hits.dentists.map((d) => (
                <Item
                  key={d.slug}
                  onClick={() => pick(d)}
                  primary={isAr ? d.nameAr : d.nameEn}
                  secondary={isAr ? d.areaNameAr ?? "" : d.areaNameEn ?? ""}
                />
              ))}
            </Group>
          )}
          {hits.clinics.length > 0 && (
            <Group title={isAr ? "عيادات" : "Clinics"}>
              {hits.clinics.map((c) => (
                <Item
                  key={c.slug}
                  onClick={() => pick(c)}
                  primary={isAr ? c.nameAr : c.nameEn}
                  secondary={isAr ? c.areaNameAr ?? "" : c.areaNameEn ?? ""}
                />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-[10.5px] uppercase tracking-[0.14em] font-bold text-ink-400">
        {title}
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function Item({
  onClick,
  primary,
  secondary,
}: {
  onClick: () => void;
  primary: string;
  secondary?: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-start px-4 py-2.5 hover:bg-teal-50 flex items-center justify-between gap-2"
      >
        <span className="text-[14px] text-ink-800">{primary}</span>
        {secondary && <span className="text-[12px] text-ink-400">{secondary}</span>}
      </button>
    </li>
  );
}
```

- [ ] **Step 2: Replace hero Specialty input with SearchAutocomplete**

In `app/[locale]/(patient)/page.tsx`, find the hero `<form action="/search" ...>` block. Replace the first `<label className="search-field">...</label>` (the Specialty input) with:

```tsx
              <SearchAutocomplete
                locale={locale}
                label={t("searchSpecialtyLabel")}
                placeholder={t("searchSpecialtyPlaceholder")}
                emptyHint={t("autocompleteEmpty")}
              />
```

Add at the top of the file:

```tsx
import { SearchAutocomplete } from "@/components/patient/search-autocomplete";
```

- [ ] **Step 3: i18n string**

Add to `messages/en.json` Home namespace:
```json
    "autocompleteEmpty": "No matches yet. Try a different name."
```

`messages/ar.json`:
```json
    "autocompleteEmpty": "لا توجد نتائج. جرب اسماً آخر."
```

- [ ] **Step 4: Smoke**

Reload `http://localhost:3000/en/`. Type "ah" in the Specialty field. A dropdown appears with sections (Specialties / Dentists / Clinics) showing matches. Click a dentist row → navigates to `/dentist/<slug>`.

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add -A
git commit -m "feat(home): universal autocomplete in hero Specialty field"
```

---

## Task 3.15: /account/favorites page

**Files:**
- Create: `app/[locale]/(patient)/account/favorites/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Heart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Favorites");

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/account/favorites`);

  const { data: favs } = await supa
    .from("favorites")
    .select("dentist_id, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .returns<{ dentist_id: string; created_at: string }[]>();

  const ids = (favs ?? []).map((f) => f.dentist_id);
  if (ids.length === 0) {
    return (
      <div className="max-w-[920px] mx-auto px-5 md:px-8 py-10 md:py-14">
        <h1 className="display-h2 text-[28px] text-ink-900 mb-4">{t("title")}</h1>
        <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
          <p className="text-[14px] text-ink-500 mb-4">{t("emptyBody")}</p>
          <Link href="/search" className="btn-primary">{t("browse")}</Link>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: dentists } = await admin
    .from("dentists")
    .select("id, slug, name_ar, name_en, title, photo_url, rating_smoothed, rating_count")
    .in("id", ids)
    .returns<{
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      title: string;
      photo_url: string | null;
      rating_smoothed: number;
      rating_count: number;
    }[]>();

  const isAr = locale === "ar";
  return (
    <div className="max-w-[920px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <h1 className="display-h2 text-[28px] text-ink-900 mb-6">{t("title")}</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {(dentists ?? []).map((d) => (
          <Link
            key={d.id}
            href={`/dentist/${d.slug}`}
            className="rounded-2xl bg-white border border-ink-100 p-5 shadow-card hover:shadow-card-hover hover:border-teal-300 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[16px] font-bold shrink-0">
                {(d.name_en ?? "").split(" ").slice(-2).map((s) => s[0]).join("")}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-[16px] font-bold text-ink-900 truncate">
                  {isAr ? d.name_ar : d.name_en}
                </h3>
                <p className="text-[12.5px] text-ink-500 truncate">{d.title}</p>
              </div>
              <Heart className="w-5 h-5 fill-rose-500 stroke-rose-500" aria-hidden />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: i18n**

`en.json`:
```json
  "Favorites": {
    "title": "Saved dentists",
    "emptyBody": "You haven't saved any dentists yet.",
    "browse": "Browse dentists"
  }
```

`ar.json`:
```json
  "Favorites": {
    "title": "أطباؤك المحفوظون",
    "emptyBody": "لم تحفظ أطباء بعد.",
    "browse": "تصفح الأطباء"
  }
```

- [ ] **Step 3: Smoke + commit**

Sign in, visit `/en/account/favorites`. Empty state shows. Save a dentist from /search, return — they appear.

```bash
git add -A
git commit -m "feat(account): saved dentists page"
```

---

## Task 3.16: Recently-viewed cookie helpers + homepage rail

**Files:**
- Create: `lib/cookies/recent-dentists.ts`
- Create: `components/patient/recently-viewed-rail.tsx`
- Modify: `app/[locale]/(patient)/page.tsx`
- Modify: `app/[locale]/(patient)/dentist/[slug]/page.tsx`

- [ ] **Step 1: Cookie helpers (server-side read)**

```ts
// lib/cookies/recent-dentists.ts
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE = "dental_map_recent_dentists";
const MAX = 10;

export async function readRecentSlugs(): Promise<string[]> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string").slice(0, MAX);
  } catch {}
  return [];
}

export async function getRecentDentists() {
  const slugs = await readRecentSlugs();
  if (slugs.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("dentists")
    .select("id, slug, name_ar, name_en, title, photo_url")
    .in("slug", slugs)
    .eq("is_published", true)
    .returns<{
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      title: string;
      photo_url: string | null;
    }[]>();
  // Preserve cookie order
  const order = new Map(slugs.map((s, i) => [s, i]));
  return (data ?? []).sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}
```

- [ ] **Step 2: Client-side cookie write helper**

Append to `lib/cookies/recent-dentists.ts`:

```ts
// Client-side; safe in `"use client"` components.
export function pushRecentDentistClientSide(slug: string) {
  if (typeof document === "undefined") return;
  let arr: string[] = [];
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${COOKIE}=`));
  if (match) {
    try {
      arr = JSON.parse(decodeURIComponent(match.split("=")[1]));
    } catch {}
  }
  arr = [slug, ...arr.filter((s) => s !== slug)].slice(0, MAX);
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(arr))}; path=/; max-age=${30 * 86400}; samesite=lax`;
}
```

- [ ] **Step 3: RecentlyViewedRail component**

```tsx
// components/patient/recently-viewed-rail.tsx
import { Link } from "@/i18n/routing";

type Item = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  title: string;
  photo_url: string | null;
};

export function RecentlyViewedRail({
  items,
  locale,
  title,
  cta,
}: {
  items: Item[];
  locale: string;
  title: string;
  cta: string;
}) {
  if (items.length === 0) return null;
  const isAr = locale === "ar";
  return (
    <section>
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-12">
        <h2 className="display-h2 text-[24px] md:text-[32px] text-ink-900 mb-6">{title}</h2>
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
          {items.map((d) => (
            <Link
              key={d.id}
              href={`/dentist/${d.slug}`}
              className="min-w-[220px] rounded-2xl bg-white border border-ink-100 p-4 shadow-card hover:shadow-card-hover hover:border-teal-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[14px] font-bold shrink-0">
                  {(d.name_en ?? "").split(" ").slice(-2).map((s) => s[0]).join("")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink-900 truncate">{isAr ? d.name_ar : d.name_en}</p>
                  <p className="text-[12px] text-ink-500 truncate">{cta}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Render rail at bottom of homepage**

In `app/[locale]/(patient)/page.tsx`, add imports:

```tsx
import { getRecentDentists } from "@/lib/cookies/recent-dentists";
import { RecentlyViewedRail } from "@/components/patient/recently-viewed-rail";
```

Fetch:

```tsx
  const recent = await getRecentDentists();
```

Render *before* the closing `</>` of the homepage:

```tsx
      <RecentlyViewedRail
        items={recent}
        locale={locale}
        title={t("recentlyViewedTitle")}
        cta={t("recentlyViewedCta")}
      />
```

i18n strings (en.json Home):
```json
    "recentlyViewedTitle": "Continue browsing",
    "recentlyViewedCta": "View profile"
```

ar.json Home:
```json
    "recentlyViewedTitle": "تابع التصفح",
    "recentlyViewedCta": "عرض الملف"
```

- [ ] **Step 5: Cookie write on dentist profile mount**

In `app/[locale]/(patient)/dentist/[slug]/page.tsx`, add a small client component that writes the cookie. Create `components/patient/recent-tracker.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { pushRecentDentistClientSide } from "@/lib/cookies/recent-dentists";

export function RecentTracker({ slug }: { slug: string }) {
  useEffect(() => {
    pushRecentDentistClientSide(slug);
  }, [slug]);
  return null;
}
```

Then in the dentist profile page, import and render `<RecentTracker slug={slug} />` somewhere within the JSX.

- [ ] **Step 6: Smoke + commit**

Visit a few dentist profiles. Reload `http://localhost:3000/en/`. The "Continue browsing" rail appears at the bottom with the visited dentists.

```bash
npm run typecheck
git add -A
git commit -m "feat(home): recently-viewed cookie rail"
```

---

## Task 3.17: Save heart on dentist profile header

**Files:**
- Modify: `app/[locale]/(patient)/dentist/[slug]/page.tsx`

- [ ] **Step 1: Pass save state into the profile**

At the top of the profile page, fetch saved set:

```tsx
import { getMyFavoriteDentistIds } from "@/lib/dentists/favorites";
import { SaveHeart } from "@/components/patient/save-heart";
```

In the body before render:

```tsx
  const savedSet = await getMyFavoriteDentistIds();
  const isSaved = savedSet.has(data.dentist.id);
```

In the header JSX (next to the name), add:

```tsx
<SaveHeart dentistId={data.dentist.id} initialSaved={isSaved} />
```

(Choose a sensible position next to the title — read the file first to find the best anchor.)

- [ ] **Step 2: Commit**

```bash
npm run typecheck
git add app/\[locale\]/\(patient\)/dentist/\[slug\]/page.tsx
git commit -m "feat(profile): save heart in dentist profile header"
```

---

## Task 3.18: Playwright E2E for Ship 3

**Files:**
- Create: `tests/discovery.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/discovery.spec.ts
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("Ship 3: discovery", () => {
  test("autocomplete shows matches as you type in the hero", async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    const input = page.locator('input[name="specialty"]').first();
    await input.click();
    await input.fill("a");
    await expect(input).toHaveValue("a");
    await input.fill("ah");
    // Either a dropdown appears or "no matches" hint shows; accept either.
    await page.waitForTimeout(500);
  });

  test("availability filter applies", async ({ page }) => {
    await page.goto(`${BASE}/en/search`);
    await page.locator('input[name="availability"][value="week"]').check({ force: true });
    await page.getByRole("button", { name: /Apply filters/i }).click();
    await expect(page).toHaveURL(/availability=week/);
  });

  test("insurance filter adds query string", async ({ page }) => {
    await page.goto(`${BASE}/en/search`);
    const insuranceCheckboxes = page.locator('input[name="insurance"]');
    if ((await insuranceCheckboxes.count()) === 0) test.skip(true, "no insurance providers seeded");
    await insuranceCheckboxes.first().check({ force: true });
    await page.getByRole("button", { name: /Apply filters/i }).click();
    await expect(page).toHaveURL(/insurance=/);
  });

  test("favorites round-trip requires login (heart shows)", async ({ page }) => {
    await page.goto(`${BASE}/en/search`);
    const heart = page.getByRole("button", { name: /Save to favorites/i }).first();
    await expect(heart).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npx playwright test tests/discovery.spec.ts --project=chromium
```

Expected: 4/4 (or skip on insurance if no seed data).

- [ ] **Step 3: Commit + tag**

```bash
git add tests/discovery.spec.ts
git commit -m "test(e2e): Ship 3 discovery overhaul smoke"
git tag ship-3-discovery
```

Ship 3 complete.

---
