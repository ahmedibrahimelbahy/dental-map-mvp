"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewError =
  | "not_authenticated"
  | "invalid_rating"
  | "invalid_comment"
  | "appointment_not_found"
  | "not_completed"
  | "already_reviewed"
  | "server_error";

export type ReviewResult =
  | { ok: true; reviewId: string }
  | { ok: false; error: ReviewError };

export type SubmitReviewInput = {
  appointmentId: string;
  rating: number;
  commentAr?: string | null;
  commentEn?: string | null;
};

const MIN_COMMENT = 10;
const MAX_COMMENT = 500;

/**
 * Patient submits a verified review for one of their completed appointments.
 *
 * Verifies:
 *   1. The caller is signed in.
 *   2. Rating is an integer in [1,5].
 *   3. Optional comments meet length bounds.
 *   4. The appointment belongs to the caller and is in `completed` state.
 *   5. No prior review exists for this appointment (DB also enforces this via
 *      the UNIQUE constraint on appointment_id — we check up front for a
 *      friendly error).
 *
 * The caller's identity is established server-side via the SSR Supabase
 * client; the row is then inserted with the admin client so we don't need to
 * thread RLS context through. The RLS policy in db/schema.sql still gates
 * inserts coming from the anon/authenticated keys.
 */
export async function submitReviewAction(
  input: SubmitReviewInput
): Promise<ReviewResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const rating = Math.floor(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "invalid_rating" };
  }

  const commentAr = (input.commentAr ?? "").trim() || null;
  const commentEn = (input.commentEn ?? "").trim() || null;

  for (const c of [commentAr, commentEn]) {
    if (c != null && (c.length < MIN_COMMENT || c.length > MAX_COMMENT)) {
      return { ok: false, error: "invalid_comment" };
    }
  }

  const admin = createAdminClient();

  type ApptRow = {
    id: string;
    patient_id: string;
    status: string;
  };
  const { data: appt } = await admin
    .from("appointments")
    .select("id, patient_id, status")
    .eq("id", input.appointmentId)
    .returns<ApptRow[]>()
    .maybeSingle();

  if (!appt || appt.patient_id !== auth.user.id) {
    return { ok: false, error: "appointment_not_found" };
  }
  if (appt.status !== "completed") {
    return { ok: false, error: "not_completed" };
  }

  // Pre-check duplicate to give a friendly error (DB unique still backs us up).
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("appointment_id", input.appointmentId)
    .returns<{ id: string }[]>()
    .maybeSingle();
  if (existing) return { ok: false, error: "already_reviewed" };

  const { data: inserted, error: insertErr } = await admin
    .from("reviews")
    .insert({
      appointment_id: input.appointmentId,
      rating,
      comment_ar: commentAr,
      comment_en: commentEn,
    } as never)
    .select("id")
    .returns<{ id: string }[]>()
    .single();

  if (insertErr || !inserted) {
    // Race: unique violation
    if (insertErr?.code === "23505") {
      return { ok: false, error: "already_reviewed" };
    }
    console.error("[review] insert failed:", insertErr);
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/", "layout");
  return { ok: true, reviewId: inserted.id };
}

export type MyReview = {
  id: string;
  rating: number;
  commentAr: string | null;
  commentEn: string | null;
  createdAtIso: string;
};

/**
 * Fetch the current user's own review for a given appointment, if any.
 * Used by the account page so a patient can see what they already submitted.
 */
export async function getMyReviewForAppointment(
  appointmentId: string
): Promise<MyReview | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const admin = createAdminClient();

  type Row = {
    id: string;
    rating: number;
    comment_ar: string | null;
    comment_en: string | null;
    created_at: string;
    appointment: { patient_id: string } | null;
  };

  const { data } = await admin
    .from("reviews")
    .select(
      `id, rating, comment_ar, comment_en, created_at,
       appointment:appointments!inner(patient_id)`
    )
    .eq("appointment_id", appointmentId)
    .returns<Row[]>()
    .maybeSingle();

  if (!data || data.appointment?.patient_id !== auth.user.id) return null;

  return {
    id: data.id,
    rating: data.rating,
    commentAr: data.comment_ar,
    commentEn: data.comment_en,
    createdAtIso: data.created_at,
  };
}
