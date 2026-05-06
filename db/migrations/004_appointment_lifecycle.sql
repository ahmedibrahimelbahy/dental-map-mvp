-- Appointment lifecycle: reminders + review requests
--
-- Adds two timestamp columns used by the cron jobs to ensure
-- "send once" semantics for transactional emails:
--   • reminder_sent_at        — set when the 24h pre-appointment reminder went out
--   • review_request_sent_at  — set when the post-visit review ask went out
--
-- Partial indexes keep the cron sweeps fast: each pass scans only
-- appointments that haven't yet had the email sent and are in the
-- right status.

alter table appointments
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists review_request_sent_at timestamptz;

create index if not exists appointments_reminder_pending_idx
  on appointments (slot_start)
  where reminder_sent_at is null and status = 'confirmed';

create index if not exists appointments_review_request_pending_idx
  on appointments (slot_end)
  where review_request_sent_at is null and status = 'completed';
