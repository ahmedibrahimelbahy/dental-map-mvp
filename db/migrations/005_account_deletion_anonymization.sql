-- Migration 005 — let users delete their account without destroying
-- the clinic's booking history.
--
-- Before: appointments.patient_id is not-null + on-delete-restrict, which
-- means deleting a profile blocks if the patient has any history. That
-- prevents the user-facing "Delete my account" feature from working.
--
-- After: patient_id becomes nullable, and FK cascades to NULL on profile
-- deletion. We anonymize patient-personal columns (patient_phone,
-- patient_note) at delete-time in the application layer, so the booking
-- record survives for clinic accounting while the patient becomes
-- unidentifiable.
--
-- Reviews don't have a patient_id column — they reference the appointment,
-- which itself becomes anonymous. So nothing to do there.

alter table appointments
  drop constraint if exists appointments_patient_id_fkey;

alter table appointments
  alter column patient_id drop not null,
  alter column patient_phone drop not null;

alter table appointments
  add constraint appointments_patient_id_fkey
    foreign key (patient_id) references profiles(id)
    on delete set null;
