# Discovery Features — Design Spec

**Date:** 2026-05-02
**Status:** Approved for implementation planning
**Owner:** Ahmed Ibrahim
**Related plan:** TBD (writing-plans skill will produce the implementation plan)

---

## 1. Goal

Strengthen patient-side discovery on Dental Map without revamping the existing UI. Add the filtering, trust, and doctor-first features that Vezeeta lacks, in a way that ships inside the 5–6 week pilot timeline for Greater Cairo (20–50 clinics).

The differentiator is **simplicity and a flawless UI**: every feature here is additive to the current surface, designed to slot into existing pages without redesign work.

---

## 2. Scope

Four additive ships, no UI revamp:

- **Ship 1 — Ratings & sort.** Bayesian-smoothed dentist ratings, "New on Dental Map" treatment, sort-by-rating + 4★+ filter on `/search`.
- **Ship 2 — Trust & Featured.** "Trusted by Dental Map" badge on clinic cards + profiles. Curated "Featured Dentists" rail on the homepage.
- **Ship 3 — Discovery overhaul.** One-card-per-doctor results, universal autocomplete on the Specialty field, GPS distance slider with area-filter fallback, insurance filter, "Available today / this week" filter, soonest-slot badge on every card, save/favorite dentists, recently-viewed dentists.
- **Ship 4 — Per-service pricing.** Per-clinic price list (cleaning, filling, implant, etc.). Price list section on clinic and doctor profiles; service-specific filter + price cap on `/search` ("dentists offering implants under 5000 EGP").

### Out of scope

For the record, the following were considered and explicitly excluded from these four ships. They may be revisited post-pilot:

- Side-by-side dentist comparison
- Doctor video intros
- Pediatric-friendly badge (separate from the pediatric specialty)
- Gender-of-dentist filter
- Languages-spoken filter
- WhatsApp button on cards / profiles (`clinics.whatsapp` data exists but not surfaced)
- Verified-review pill on individual reviews

---

## 3. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Trusted badge attaches to | Clinics only | 20–50 hand-onboarded clinics can be verified personally; dentist-level trust would need a credential pipeline that doesn't fit pilot scope. |
| Doctor-first search shape | One card per doctor; clinics nested inside | De-duplicates the listing, matches the "I want Dr. X; where can I see them?" mental model, directly enables the multi-clinic doctor experience. |
| Distance | Hybrid: area filter (always) + GPS slider (when granted) | Area is the safe primary cut for users who deny geolocation; the slider is a Tinder-style magic moment for users who allow it. |
| Ratings | Bayesian-smoothed; hide stars until 3 reviews ("New on Dental Map") | Cold-start gaming-resistant; "New" treatment turns absence-of-stars into a positive trust signal. |
| Featured dentists | Homepage rail only (no search boost) | Keeps editorial separate from organic search; protects long-term trust in result rankings. |
| Doctor / clinic name search | Existing Specialty field upgraded to universal search with autocomplete | Capability addition without visual revamp; field shape stays the same. |
| Per-service pricing scope | Display + service filter on `/search` (no service-specific sort) | Patients can answer "where can I get an implant under 5000 EGP" in one query; service-specific sort would bloat the sort dropdown without adding answers display can't already give. |
| Per-service pricing ownership | Per-clinic, not per-(dentist, clinic) | Most Egyptian clinics use a flat clinic price list regardless of dentist; equipment-driven services (implants, scaling) are clinic-bound. Dentist-level fee variance still lives on `clinic_dentists.fee_egp` (the consultation fee). |

---

## 4. Data model deltas

All changes are additive — no breaking changes to existing tables.

### `clinics` — add columns

```sql
alter table clinics add column is_trusted boolean not null default false;
alter table clinics add column trusted_at timestamptz;
```

### `dentists` — add columns

```sql
alter table dentists add column is_featured boolean not null default false;
alter table dentists add column featured_rank int;
alter table dentists add column rating_smoothed numeric(3,2) not null default 4.00;
alter table dentists add column rating_count int not null default 0;
alter table dentists add column next_available_slot timestamptz;

create index dentists_featured_idx on dentists (is_featured, featured_rank) where is_featured = true;
create index dentists_rating_idx on dentists (rating_smoothed desc);
create index dentists_next_slot_idx on dentists (next_available_slot) where next_available_slot is not null;
```

### `favorites` — new table

```sql
create table favorites (
  profile_id uuid not null references profiles(id) on delete cascade,
  dentist_id uuid not null references dentists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, dentist_id)
);

alter table favorites enable row level security;
create policy "favorites self read"   on favorites for select using (auth.uid() = profile_id);
create policy "favorites self insert" on favorites for insert with check (auth.uid() = profile_id);
create policy "favorites self delete" on favorites for delete using (auth.uid() = profile_id);
```

### Recently viewed — no DB

Cookie `dental_map_recent_dentists`, JSON array of up to 10 dentist slugs, written client-side on profile visits, expires in 30 days. Works for anonymous users.

### Triggers and recompute jobs

**Rating recompute** — fires on `insert / update / delete` on `reviews`:

```sql
create or replace function recompute_dentist_rating(p_dentist_id uuid) returns void
language plpgsql security definer as $$
declare
  v_count int;
  v_sum int;
  v_smoothed numeric(3,2);
  v_prior_weight constant int := 5;
  v_prior_mean constant numeric := 4.0;
begin
  select count(*), coalesce(sum(r.rating), 0)
    into v_count, v_sum
  from reviews r
  join appointments a on a.id = r.appointment_id
  join clinic_dentists cd on cd.id = a.clinic_dentist_id
  where cd.dentist_id = p_dentist_id and r.is_published = true;

  v_smoothed := (v_prior_weight * v_prior_mean + v_sum) / (v_prior_weight + v_count);

  update dentists
     set rating_smoothed = v_smoothed,
         rating_count = v_count
   where id = p_dentist_id;
end $$;
```

A separate trigger function looks up the affected `dentist_id` via the `appointment → clinic_dentist` chain and calls `recompute_dentist_rating`.

**Soonest-slot recompute** — runs in two situations:

1. **On appointment change** — trigger on `insert / update / delete` on `appointments` recomputes `next_available_slot` for the affected dentist.
2. **Periodic catch-up** — a cron job (Supabase pg_cron or Vercel cron hitting an internal endpoint) every 15 minutes recomputes for dentists whose `next_available_slot` has passed (no booking change triggered a recompute, but the clock moved forward).

The recompute walks the dentist's `clinic_dentists.working_hours` JSONB for the next 14 days, subtracts existing `pending`/`confirmed` appointments, and stores the earliest open slot. If none in 14 days, sets `next_available_slot = null` (filtered as "no availability" in UI).

### `services` — new reference table

Catalog of dental services. Bilingual, public-read. Seeded once; new entries added via migration only.

```sql
create table services (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  display_order int not null default 100,
  created_at timestamptz not null default now()
);

alter table services enable row level security;
create policy "services public read" on services for select using (true);
```

**Initial seed** (slug · Arabic · English, in the order patients tend to ask about them):

```sql
insert into services (slug, name_ar, name_en, display_order) values
  ('consultation',     'كشف',                 'Consultation',         10),
  ('scaling',          'تنظيف وتلميع',        'Scaling & polishing',  20),
  ('filling-composite','حشو ضوئي',           'Composite filling',    30),
  ('extraction',       'خلع',                 'Tooth extraction',     40),
  ('root-canal',       'علاج جذور',           'Root canal',           50),
  ('crown',            'تركيب طربوش',         'Crown',                60),
  ('bridge',           'كوبري أسنان',         'Bridge',               70),
  ('implant',          'زراعة أسنان',         'Dental implant',       80),
  ('whitening',        'تبييض الأسنان',       'Teeth whitening',      90),
  ('orthodontics-fixed','تقويم ثابت',         'Fixed braces',        100),
  ('orthodontics-aligners','تقويم شفاف',     'Clear aligners',      110),
  ('pediatric-checkup','كشف أطفال',           'Pediatric checkup',   120)
on conflict (slug) do nothing;
```

### `clinic_services` — new join table

```sql
create table clinic_services (
  clinic_id uuid not null references clinics(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  fee_egp int not null check (fee_egp >= 0),
  fee_egp_max int check (fee_egp_max is null or fee_egp_max >= fee_egp),
  notes_ar text,
  notes_en text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, service_id)
);
create index clinic_services_service_price_idx on clinic_services (service_id, fee_egp) where is_published = true;

alter table clinic_services enable row level security;
create policy "clinic_services public read" on clinic_services for select using (is_published = true);

create trigger clinic_services_updated_at
  before update on clinic_services
  for each row execute function set_updated_at();
```

`fee_egp` is required (the lower bound or flat price). `fee_egp_max` is optional — set it when the service has a range (e.g., implants vary by brand: `fee_egp = 4000`, `fee_egp_max = 8000`). Display rule: if `fee_egp_max is null`, show `"4000 EGP"`; otherwise show `"4000 – 8000 EGP"`.

`notes_ar` / `notes_en` are optional short qualifiers ("per arch", "incl. X-ray", "per quadrant") — kept text rather than structured because the variation is open-ended.

---

## 5. Patient UX flow

### 5.1 Homepage hero

Visually unchanged. Three changes to behavior:

- **Specialty field becomes universal autocomplete.** Label changes from "Specialty" to "Specialty, doctor or clinic" (or Arabic equivalent). Dropdown shows three sections as the user types: matching specialties (with icons), matching dentists (with photos, primary clinic area), matching clinics (with logos, area).
- **Smart submit.** If the user picks a specific dentist or clinic from autocomplete, submit deep-links to that entity's profile page. Otherwise (free-text or specialty selected), submit goes to `/search` with the appropriate query parameters as today.
- **No new fields added to the hero.** Area + When stay as today.

### 5.2 Homepage — new sections

- **"Featured Dentists" rail** between the hero and the Specialties grid. Curated, ordered by `featured_rank`. Each card: photo, name, lead specialty, rating, "From X EGP", link to profile.
- **"Recently viewed" rail** at the bottom of the homepage, only rendered if the cookie has at least one entry. Compact card style — photo, name, "Continue browsing".

### 5.3 `/search` page

Layout unchanged — sidebar filters on left, results on right. Three categories of additions:

**Sort dropdown** above results (new):
- Best match (default)
- Highest rated
- Cheapest
- Soonest available
- Nearest (only enabled if GPS granted)

**Filter sidebar additions:**
- **Insurance** — multi-select chips, OR within field, AND with other filters.
- **4★+ rating** — toggle filter.
- **Available today** / **Available this week** — pair of toggle chips (mutually exclusive).
- **Distance slider** — only appears if user grants browser geolocation. When the slider is active, the area filter is hidden (mutually exclusive — avoids contradiction).
- **Service** — single-select dropdown of services from the `services` catalog. When a specific service is selected, a paired **"Up to X EGP"** number input appears underneath. Selecting a service narrows results to dentists whose clinics offer that service; the price cap further restricts to clinics whose `clinic_services.fee_egp ≤ X`.

**Result cards (one per doctor):**
- Photo, name, title, top 2 specialties.
- Rating chip — Bayesian smoothed value + count, OR "New on Dental Map" pill if `rating_count < 3`.
- **Price label** — by default "Consultation from X EGP" (minimum `clinic_dentists.fee_egp` across the doctor's clinics). When a service filter is active, this becomes "[Service name] from X EGP" using the cheapest matching `clinic_services` row across the doctor's clinics.
- Soonest-slot badge — "Today 4 PM" / "Tomorrow 11 AM" / "This Friday".
- Trusted-clinic pill — shown if ANY clinic the doctor practices at is trusted.
- Distance label — "1.2 km away" if GPS granted, hidden otherwise.
- Save heart — toggles the `favorites` row (auth-gated; redirects to login if anonymous).
- Expand-to-see-clinics interaction — the card has an expandable section (or a "View all N clinics" link to the profile) listing each clinic the doctor practices at, each row showing that clinic's specific fee, soonest slot, area, and trusted badge.

### 5.4 Doctor profile page

Adds:

- Save heart in the header.
- Visit-tracker — on mount, prepend this dentist's slug to the `dental_map_recent_dentists` cookie (deduplicate, cap at 10).
- Each clinic listed on the profile shows the trusted badge if applicable.
- **"Services & prices" section** — under the doctor's clinic list. For each service offered at any of the doctor's clinics, shows the *lowest* price across those clinics with a small "from [Clinic name]" attribution. Format follows the display rule from section 4: `"4000 EGP"` flat, or `"4000 – 8000 EGP"` if a range. If multiple clinics offer the same service, only the cheapest row is shown by default with a "see all" link revealing the others.

### 5.5 Clinic profile page

Adds:

- Trusted-clinic badge on the header (when `is_trusted = true`).
- **"Price list" section** — full table of all services this clinic offers (joined `services` × `clinic_services` for this clinic, ordered by `services.display_order`). Two-column layout: service name + price. Rows with `notes_ar` / `notes_en` show the note as a small grey line beneath the service name.

### 5.6 New page — `/account/favorites`

Lists the patient's saved dentists. Card style consistent with `/search`. Empty state encourages browsing.

---

## 6. Ranking & filtering logic

### 6.1 Bayesian rating

```
rating_smoothed = (C * m + sum_of_review_ratings) / (C + n)
```

- `C = 5` (prior weight)
- `m = 4.0` (prior mean)
- `n = rating_count`

With 0 reviews → exactly 4.0. With 50 5★ reviews → ~4.91. With 1 fake 5★ review → ~4.17 (gaming-resistant).

**Display rule:** if `rating_count < 3`, hide stars on cards and show a "New on Dental Map" pill instead. Sort-by-rating still uses the smoothed value, so "New" dentists land mid-pack at 4.0 rather than at the bottom.

### 6.2 Sort orders

| Sort | ORDER BY |
|---|---|
| Best match | rating_smoothed DESC, distance_km ASC NULLS LAST, rating_count DESC |
| Highest rated | rating_smoothed DESC, rating_count DESC |
| Cheapest | min_fee_egp ASC |
| Soonest available | next_available_slot ASC NULLS LAST |
| Nearest (GPS only) | distance_km ASC |

**Note on featured:** `is_featured` is **not** a search-ranking lever — search results are organic. Featuring affects only the homepage rail (section 5.2). This protects long-term trust in the rest of the rankings and matches the "no search boost" decision in section 3.

### 6.3 Filter behavior

Filters AND with each other. Multi-select fields (insurance, specialty) OR within the field. Distance slider replaces area filter when active.

| Filter | Mechanism |
|---|---|
| Specialty | EXISTS via `dentist_specialties` |
| Area | clinics.area_id (any of dentist's clinic rows in that area) |
| Distance slider | Haversine on `clinics.lat/lng` against user GPS, ANY clinic within radius |
| Fee max | min(clinic_dentists.fee_egp) ≤ feeMax |
| Insurance | EXISTS via `clinic_insurance` for ANY clinic the dentist practices at |
| 4★+ | dentists.rating_smoothed ≥ 4.0 |
| Available today | next_available_slot < tomorrow_start |
| Available this week | next_available_slot < next_monday |
| Service | EXISTS via `clinic_services` for ANY clinic the dentist practices at, where `service_id = ?` and `is_published = true` |
| Service price cap | Combined with Service: also `clinic_services.fee_egp ≤ priceCap` (lower bound — generous match for ranged services) |

**Note on service price cap matching:** when a clinic prices a service as a range (e.g., implants 4000–8000 EGP), the filter matches against the lower bound. This is intentionally optimistic: patients see the dentist as a candidate; the profile shows the full range so they can decide whether to pursue.

### 6.4 Aggregation query (one card per doctor)

`listDentists` returns one row per dentist with aggregated clinic data:

```ts
type DentistResult = {
  dentist: { id, slug, name_ar, name_en, photo_url, title, rating_smoothed, rating_count, is_featured };
  specialties: { slug, name_ar, name_en }[];
  min_fee_egp: number;
  next_available_slot: timestamptz | null;
  any_trusted_clinic: boolean;
  distance_km?: number; // only if GPS provided
  clinics: {
    clinic: { id, slug, name_ar, name_en, area, lat, lng, is_trusted };
    fee_egp: number;
    next_slot: timestamptz | null;
    distance_km?: number;
  }[];
};
```

Implemented as a single SQL query: GROUP BY `dentists.id`, JSON aggregate `clinic_dentists` joined with `clinics`. One round trip; both the collapsed and expanded card states render from this shape.

**When the service filter is active**, the query additionally LEFT JOINs `clinic_services` filtered to the selected service, and `min_fee_egp` is computed from the matching `clinic_services.fee_egp` instead of `clinic_dentists.fee_egp`. The result type gains an optional `active_service: { slug, name_ar, name_en }` field so the card knows what label to render.

---

## 7. Ops / admin surface

For pilot scale (20–50 clinics), full admin tooling is overkill. Two minimal surfaces:

### 7.1 Seed / migration SQL

The first cohort of `is_trusted` and `is_featured` flags is set directly by SQL. Documented in the implementation plan with the target rows.

### 7.2 Tiny ops page — `/dentist/admin/featured`

Single password-gated table of dentists with checkboxes for `is_featured` and a number input for `featured_rank`. Lets non-engineers curate the rail without DB access. Roughly 50 lines of code, ships in Ship 2.

### 7.3 Trusted-clinic criteria (documented, manually applied)

These criteria are written into the spec so the badge has meaning. They are not enforced by code in pilot — ops applies the flag manually after each clinic clears the bar. Later, some can become automated checks.

1. Verified physical premises (someone visited; photos taken).
2. Verified medical syndicate license number on file.
3. Responded to first 3 bookings within 30 minutes during a one-week test period.
4. No unresolved patient complaints in the past 30 days.

---

## 8. Ship-by-ship breakdown

### Ship 1 — Ratings & sort (~3 days)

**Migrations:** `rating_smoothed`, `rating_count` columns on `dentists`; `recompute_dentist_rating` function; trigger on `reviews`.
**Backfill:** one-time SQL pass to populate existing rows.
**Server:** `listDentists` accepts `minRating` and `sortBy=rating` parameters.
**UI:** rating chip on result cards, "New on Dental Map" pill, sort dropdown above results, 4★+ filter chip in sidebar.

### Ship 2 — Trust & Featured (~3 days)

**Migrations:** `is_trusted`, `trusted_at` on `clinics`; `is_featured`, `featured_rank` on `dentists`.
**Seed:** first cohort of trusted clinics and featured dentists.
**Server:** `getFeaturedDentists()` query; `listDentists` returns `any_trusted_clinic`; clinic profile / clinic card components read `is_trusted`.
**UI:** trusted pill on clinic cards, clinic profile, and dentist result cards. Homepage "Featured Dentists" rail above the specialties grid.
**Ops:** `/dentist/admin/featured` curation page.

### Ship 3 — Discovery overhaul (~7–10 days)

**Migrations:** `next_available_slot` column + recompute function + trigger + cron; `favorites` table + RLS.
**Server:**
- New `/api/search/autocomplete?q=` API returning specialties + dentists + clinics.
- `listDentists` rewritten to GROUP BY dentist with aggregated clinic rows and the new filter / sort surface.
- `favorites` CRUD endpoints (server actions or RPC).
**UI:**
- Homepage Specialty field → autocomplete dropdown + smart submit.
- Result card data-shape rewrite: expandable clinics list, soonest-slot badge, "Consultation from X EGP" price label (becomes service-aware in Ship 4), save heart, distance label. Visual style unchanged.
- Filter sidebar: insurance multi-select, available-today / available-this-week chips, distance slider (GPS-gated, hides area filter when active).
- `/account/favorites` page.
- Cookie-based recently-viewed; rail at the bottom of the homepage.
- Save heart on doctor profile + cookie write on profile mount.

### Ship 4 — Per-service pricing (~3–4 days)

**Migrations:** `services` reference table + initial seed (12 rows); `clinic_services` join table + RLS.
**Seed:** populate `clinic_services` for the pilot clinic cohort (manual SQL or a one-off CSV import — clinics provide their price lists during onboarding).
**Server:**
- `listDentists` extended to accept `serviceSlug` and `servicePriceMax` parameters; aggregation switches `min_fee_egp` to the service-specific price when active (per section 6.4).
- New helper `getClinicPriceList(clinicId)` and `getDentistPriceList(dentistId)` (the latter returns cheapest price per service across the dentist's clinics).
**UI:**
- Service filter (dropdown + price-cap input) added to `/search` filter sidebar.
- Result card price label switches to "[Service] from X EGP" when service filter is active.
- "Price list" section on clinic profile.
- "Services & prices" section on doctor profile (cheapest-per-service across their clinics, with "from [clinic]" attribution).

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `next_available_slot` recompute is heavy if working_hours are complex | Pilot scale is small (20–50 clinics × maybe 5–10 dentists each ≈ 200–500 dentists). Recompute only on appointment changes + 15-min cron catch-up. Profile and add caching only if pilot data shows pressure. |
| Bayesian smoothing makes ratings feel "compressed" | Display `4.4 ★ (12 reviews)` rather than the raw smoothed number alone; the count gives users context. |
| GPS denial degrades nearest-sort and distance-slider into dead UI | Hide the slider entirely when permission is denied; "Nearest" sort is disabled (greyed out with a "Allow location" hint). Area filter remains the safe primary cut. |
| Featured pill perceived as paid promotion | Pilot is free for clinics, so featuring is editorial. The pill text is "Featured" not "Sponsored"; the homepage rail is curated by the team, not auctioned. Revisit the labeling if monetization changes featured behavior post-pilot. |
| One-card-per-doctor changes existing search UX assumptions | The expanded card preserves the "I want a specific clinic" use case. Area filter narrows the implicit clinic preference. No regression in the use case the current shape serves. |
| Per-service prices go stale and clinics dispute them at booking | Show `updated_at` for each `clinic_services` row on the clinic profile in small text ("Updated 2 weeks ago"). Add a clinic admin obligation in the pilot agreement: prices must be kept current. Long-term: admin UI for the clinic dashboard so clinics maintain their own price list (out of pilot scope; manual SQL is fine for the first cohort). |
| Service catalog is too narrow / too broad | Catalog ships with 12 seeded services covering the most-asked Egyptian dental procedures. Adding more is a one-line migration; clinics can leave services blank. Revisit after first month of pilot data — if a service is requested but missing, add it. |

---

## 10. Open questions

None blocking. The following will be confirmed during implementation planning:

- Exact text for the "Trusted by Dental Map" pill in Arabic.
- Exact text for the "New on Dental Map" pill in Arabic.
- The featured-rail's max card count (likely 6–8).
- Whether `/dentist/admin/featured` ships in Ship 2 or is deferred — decision depends on whether ops wants to update the rail mid-pilot vs. set it once.
- Confirmation of the 12-service seed list for `services`. Current proposal in section 4 covers the most-asked Egyptian dental procedures; clinics may request edits during onboarding.
- Whether the clinic admin gets a self-service price-list editor in Ship 4 or it's deferred to Phase 2 (current decision: deferred — pilot uses manual SQL / CSV import).
