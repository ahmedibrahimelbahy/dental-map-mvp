-- Migration 011 — rename the catch-all specialty from "adult" to "general"
-- dentistry. dentist_specialties.specialty_id rides on id, so this is safe.
-- Idempotent — safe to re-run.

begin;

update specialties set slug = 'general' where slug = 'adult';
update specialties
  set name_ar = 'كشف عام',
      name_en = 'General dentistry'
where slug = 'general';

commit;
