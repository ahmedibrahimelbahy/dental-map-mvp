-- Migration 010 — finalize the canonical specialty list (14 specialties).
-- Renames two slugs (endodontics → root-canal, oral-surgery → surgery),
-- relabels existing rows to match the agreed bilingual labels, and inserts
-- the seven new specialties. Idempotent — safe to re-run.

begin;

-- 1) Rename slugs first. specialty_id FKs reference id (not slug), so this
--    won't break dentist_specialties.
update specialties set slug = 'root-canal' where slug = 'endodontics';
update specialties set slug = 'surgery'    where slug = 'oral-surgery';

-- 2) Relabel existing rows to the canonical bilingual labels.
update specialties set name_ar = 'كبار',  name_en = 'Adult dentistry'     where slug = 'adult';
update specialties set name_ar = 'أطفال', name_en = 'Pediatric'           where slug = 'pediatric';
update specialties set name_ar = 'تقويم', name_en = 'Orthodontics'        where slug = 'orthodontics';
update specialties set name_ar = 'تجميل', name_en = 'Cosmetic'            where slug = 'cosmetic';
update specialties set name_ar = 'حشو عصب', name_en = 'Root canal'        where slug = 'root-canal';
update specialties set name_ar = 'زراعة', name_en = 'Implants'            where slug = 'implants';
update specialties set name_ar = 'جراحة', name_en = 'Surgery'             where slug = 'surgery';

-- 3) Insert the seven new specialties.
insert into specialties (slug, name_ar, name_en) values
  ('fillings',           'حشو',                       'Fillings'),
  ('periodontics',       'علاج لثة',                   'Periodontics'),
  ('scaling',            'تنظيف',                      'Scaling'),
  ('crowns-dentures',    'تركيبات ثابتة ومتحركة',     'Crowns & dentures'),
  ('veneer',             'فينير',                      'Veneers'),
  ('general-anesthesia', 'بنج عام',                    'General anesthesia'),
  ('emergency',          'طوارئ',                      'Emergency')
on conflict (slug) do nothing;

commit;
