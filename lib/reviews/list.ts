import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewItem = {
  id: string;
  rating: number;
  commentAr: string | null;
  commentEn: string | null;
  publishedAtIso: string;
  patientFirstName: string;
};

/**
 * List published reviews for a dentist, most recent first.
 *
 * The reviews table doesn't store dentist_id directly, so we resolve it via
 * appointments → clinic_dentists. We use the admin client to keep the JOIN
 * shape simple and consistent with the rest of the codebase (RLS would also
 * permit anonymous reads of `is_published = true` rows).
 *
 * `patientFirstName` is derived from `profiles.full_name` (first whitespace
 * token only) for privacy — we never expose a patient's full name on a public
 * profile.
 */
export async function listReviewsForDentist(
  dentistId: string,
  limit = 50
): Promise<ReviewItem[]> {
  const admin = createAdminClient();

  type Row = {
    id: string;
    rating: number;
    comment_ar: string | null;
    comment_en: string | null;
    is_published: boolean;
    created_at: string;
    appointment: {
      patient: { full_name: string | null } | null;
      clinic_dentist: { dentist_id: string } | null;
    } | null;
  };

  const { data, error } = await admin
    .from("reviews")
    .select(
      `id, rating, comment_ar, comment_en, is_published, created_at,
       appointment:appointments!inner(
         patient:profiles(full_name),
         clinic_dentist:clinic_dentists!inner(dentist_id)
       )`
    )
    .eq("is_published", true)
    .eq("appointment.clinic_dentist.dentist_id", dentistId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((r) => r.appointment?.clinic_dentist?.dentist_id === dentistId)
    .map<ReviewItem>((r) => {
      const fullName = r.appointment?.patient?.full_name ?? "";
      const firstWord = fullName.trim().split(/\s+/)[0] ?? "";
      return {
        id: r.id,
        rating: r.rating,
        commentAr: r.comment_ar,
        commentEn: r.comment_en,
        publishedAtIso: r.created_at,
        patientFirstName: firstWord || "—",
      };
    });
}

/**
 * Aggregate stats for a dentist — average rating + total count.
 * Returns { avg: 0, count: 0 } when no reviews exist.
 */
export async function getReviewStats(
  dentistId: string
): Promise<{ avg: number; count: number }> {
  const admin = createAdminClient();

  type Row = {
    rating: number;
    appointment: {
      clinic_dentist: { dentist_id: string } | null;
    } | null;
  };

  const { data, error } = await admin
    .from("reviews")
    .select(
      `rating,
       appointment:appointments!inner(
         clinic_dentist:clinic_dentists!inner(dentist_id)
       )`
    )
    .eq("is_published", true)
    .eq("appointment.clinic_dentist.dentist_id", dentistId)
    .returns<Row[]>();

  if (error) throw error;

  const rows = (data ?? []).filter(
    (r) => r.appointment?.clinic_dentist?.dentist_id === dentistId
  );

  if (rows.length === 0) return { avg: 0, count: 0 };

  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round((sum / rows.length) * 10) / 10; // one decimal
  return { avg, count: rows.length };
}

/**
 * Map of `appointment_id → { rating }` for every review the given patient has
 * already submitted. Used by the account page to decide whether to show the
 * "Leave a review" CTA or the "You rated N stars" badge.
 */
export async function getPatientReviewMap(
  patientId: string
): Promise<Record<string, { rating: number }>> {
  const admin = createAdminClient();

  type Row = {
    appointment_id: string;
    rating: number;
    appointment: { patient_id: string } | null;
  };

  const { data, error } = await admin
    .from("reviews")
    .select(
      `appointment_id, rating,
       appointment:appointments!inner(patient_id)`
    )
    .eq("appointment.patient_id", patientId)
    .returns<Row[]>();

  if (error) throw error;

  const map: Record<string, { rating: number }> = {};
  for (const r of data ?? []) {
    if (r.appointment?.patient_id !== patientId) continue;
    map[r.appointment_id] = { rating: r.rating };
  }
  return map;
}
