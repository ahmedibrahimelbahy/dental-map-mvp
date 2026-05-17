-- Migration 008 — expand pricing model from 4 tiers (grouped) to 14 tiers
-- (one tier per area). Adds 5 new areas, drops 4 areas that are not in the
-- new pricing matrix, and re-maps existing areas to their new tier numbers.
--
-- New pricing matrix (encoded in lib/clinic/pricing.ts):
--   Tier  1 New Cairo                Std  999 / Grw 1499 / Prm 2199
--   Tier  2 Heliopolis               Std  899 / Grw 1399 / Prm 1999
--   Tier  3 Nasr City                Std  699 / Grw 1099 / Prm 1699
--   Tier  4 El Shorouk               Std  599 / Grw  899 / Prm 1399
--   Tier  5 Zamalek                  Std 1199 / Grw 1799 / Prm 2599
--   Tier  6 Sheikh Zayed             Std 1099 / Grw 1699 / Prm 2499
--   Tier  7 Maadi                    Std  999 / Grw 1499 / Prm 2199
--   Tier  8 Mohandesin               Std  899 / Grw 1399 / Prm 1999
--   Tier  9 6th of October           Std  799 / Grw 1299 / Prm 1899
--   Tier 10 10th of Ramadan          Std  499 / Grw  799 / Prm 1299
--   Tier 11 Madinaty                 Std  899 / Grw 1399 / Prm 1999
--   Tier 12 El Rehab                 Std  999 / Grw 1499 / Prm 2199
--   Tier 13 El Obour                 Std  599 / Grw  999 / Prm 1499
--   Tier 14 Administrative Capital   Std 1199 / Grw 1899 / Prm 2799
-- All tiers still charge a 50% first-consultation success fee per new patient.
--
-- Existing clinics keep their subscription_monthly_egp value unchanged —
-- we are not retroactively rebilling pilots already on the old grid.

-- ── 1. Relax the tier check constraints to 1..14 ─────────────────────
alter table areas drop constraint if exists areas_tier_check;
alter table areas
  add constraint areas_tier_check check (tier is null or (tier between 1 and 14));

alter table clinics drop constraint if exists clinics_subscription_tier_check;
alter table clinics
  add constraint clinics_subscription_tier_check
    check (subscription_tier is null or (subscription_tier between 1 and 14));

-- ── 2. Insert new areas ──────────────────────────────────────────────
insert into areas (slug, name_ar, name_en) values
  ('10-ramadan',             'العاشر من رمضان',  '10th of Ramadan'),
  ('madinaty',               'مدينتي',            'Madinaty'),
  ('el-rehab',               'الرحاب',            'El Rehab'),
  ('el-obour',               'العبور',            'El Obour'),
  ('administrative-capital', 'العاصمة الإدارية', 'Administrative Capital')
on conflict (slug) do nothing;

-- ── 3. Remove areas not in the new pricing matrix ────────────────────
-- area_id on clinics is "on delete set null" so any clinic still pointing
-- at one of these areas will be detached, not deleted.
delete from areas where slug in ('dokki', 'downtown', 'shoubra', 'ain-shams');

-- ── 4. Re-map every kept area to its new tier number ─────────────────
update areas set tier =  1 where slug = 'new-cairo';
update areas set tier =  2 where slug = 'heliopolis';
update areas set tier =  3 where slug = 'nasr-city';
update areas set tier =  4 where slug = 'el-shorouk';
update areas set tier =  5 where slug = 'zamalek';
update areas set tier =  6 where slug = 'sheikh-zayed';
update areas set tier =  7 where slug = 'maadi';
update areas set tier =  8 where slug = 'mohandessin';
update areas set tier =  9 where slug = '6-october';
update areas set tier = 10 where slug = '10-ramadan';
update areas set tier = 11 where slug = 'madinaty';
update areas set tier = 12 where slug = 'el-rehab';
update areas set tier = 13 where slug = 'el-obour';
update areas set tier = 14 where slug = 'administrative-capital';
