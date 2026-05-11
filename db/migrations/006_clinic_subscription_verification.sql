-- Migration 006 — clinic subscription tiers + manual verification gate.
--
-- For the pilot we deliberately keep this LIGHTWEIGHT. No license-number
-- form fields, no document uploads — ops verifies by phone since we know
-- every pilot clinic personally. All we need:
--
--   1. Tier metadata on areas so the onboarding wizard can show the
--      right pricing card based on where the clinic is.
--   2. Subscription fields on clinics so we remember which package
--      they picked and what consultation validity window they chose.
--   3. A single verification_status flag so pending clinics stay
--      invisible to patients until ops approves them.
--   4. Egyptian Dental Syndicate number on dentists — optional column,
--      we collect it later from the clinic dashboard once approved.
--
-- Pilot pricing reference (encoded in app layer, not the DB):
--   Tier 1 (New Cairo, Zamalek, Maadi):  Std 999 / Grw 1499 / Prm 2199
--   Tier 2 (Heliopolis, Mohandessin):    Std 899 / Grw 1399 / Prm 1999
--   Tier 3 (Nasr City):                  Std 699 / Grw 1099 / Prm 1699
--   Tier 4 (6th October, El Shorouk):    Std 599 / Grw  899 / Prm 1399
-- All tiers: 50% success fee on first consultation per new patient.

-- ── 1. Areas: tier column + new areas ────────────────────────────────
alter table areas
  add column if not exists tier int check (tier in (1, 2, 3, 4));

insert into areas (slug, name_ar, name_en) values
  ('new-cairo',  'القاهرة الجديدة', 'New Cairo'),
  ('el-shorouk', 'الشروق',         'El Shorouk')
on conflict (slug) do nothing;

update areas set tier = 1 where slug in ('new-cairo', 'zamalek', 'maadi');
update areas set tier = 2 where slug in ('heliopolis', 'mohandessin');
update areas set tier = 3 where slug in ('nasr-city');
update areas set tier = 4 where slug in ('6-october', 'el-shorouk');
update areas set tier = 4 where tier is null;

-- ── 2. Clinic subscription + verification status ─────────────────────
alter table clinics
  add column if not exists subscription_tier int
    check (subscription_tier in (1, 2, 3, 4)),
  add column if not exists subscription_package text
    check (subscription_package in ('standard', 'growth', 'premium')),
  add column if not exists subscription_monthly_egp int
    check (subscription_monthly_egp >= 0),
  add column if not exists consultation_validity_months int
    check (consultation_validity_months in (1, 3, 6)),
  add column if not exists verification_status text
    not null default 'pending'
    check (verification_status in ('pending', 'approved', 'denied')),
  add column if not exists verification_submitted_at timestamptz;

create index if not exists clinics_verification_status_idx
  on clinics (verification_status);

-- ── 3. Dentists: optional syndicate number ────────────────────────────
-- Collected from the clinic dashboard after approval, not at signup time.
alter table dentists
  add column if not exists syndicate_number text;
