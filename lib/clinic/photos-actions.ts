"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnedPendingUrl } from "@/lib/clinic/upload-action";

export type PhotosResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_admin"
        | "invalid_url"
        | "not_found"
        | "server_error";
    };

// Validate a photo URL: must be a fresh upload owned by this user (minted by
// requestUploadTicketAction), OR an empty value (remove the photo), OR a URL
// that already lives in this clinic/dentist's row (no-op replay).
function validateOrPassthrough(
  next: string | null,
  current: string | null,
  userId: string
): { ok: true; value: string | null } | { ok: false } {
  if (next === null || next === "") return { ok: true, value: null };
  if (next === current) return { ok: true, value: next };
  if (isOwnedPendingUrl(next, userId)) return { ok: true, value: next };
  return { ok: false };
}

// Update the current clinic admin's clinic logo and/or hero image. Either
// field can be omitted to leave it untouched, or set to null to clear it.
export async function updateMyClinicPhotosAction(input: {
  logoUrl?: string | null;
  heroImageUrl?: string | null;
}): Promise<PhotosResult> {
  const supa = await createClient();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  // Find the clinic this user admins. MVP assumption: one clinic per admin —
  // matches the dashboard page which also reads .clinics[0].
  const { data: link } = await admin
    .from("clinic_admins")
    .select("clinic_id")
    .eq("profile_id", auth.user.id)
    .returns<{ clinic_id: string }[]>()
    .maybeSingle();
  if (!link) return { ok: false, error: "not_admin" };

  const { data: current } = await admin
    .from("clinics")
    .select("id, slug, logo_url, hero_image_url")
    .eq("id", link.clinic_id)
    .returns<{
      id: string;
      slug: string;
      logo_url: string | null;
      hero_image_url: string | null;
    }[]>()
    .single();
  if (!current) return { ok: false, error: "not_found" };

  const patch: Record<string, string | null> = {};

  if (input.logoUrl !== undefined) {
    const v = validateOrPassthrough(input.logoUrl, current.logo_url, auth.user.id);
    if (!v.ok) return { ok: false, error: "invalid_url" };
    patch.logo_url = v.value;
  }
  if (input.heroImageUrl !== undefined) {
    const v = validateOrPassthrough(
      input.heroImageUrl,
      current.hero_image_url,
      auth.user.id
    );
    if (!v.ok) return { ok: false, error: "invalid_url" };
    patch.hero_image_url = v.value;
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await admin
    .from("clinics")
    .update(patch as never)
    .eq("id", current.id);
  if (error) {
    console.error("[photos] clinic update failed:", error);
    return { ok: false, error: "server_error" };
  }

  // Public surfaces that render these URLs
  revalidatePath(`/clinic/${current.slug}`);
  revalidatePath("/search");
  return { ok: true };
}

// Update the photo for one dentist that belongs to the caller's clinic.
export async function updateMyDentistPhotoAction(input: {
  dentistId: string;
  photoUrl: string | null;
}): Promise<PhotosResult> {
  const supa = await createClient();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  const { data: link } = await admin
    .from("clinic_admins")
    .select("clinic_id")
    .eq("profile_id", auth.user.id)
    .returns<{ clinic_id: string }[]>()
    .maybeSingle();
  if (!link) return { ok: false, error: "not_admin" };

  // Verify the dentist is linked to this admin's clinic before letting them
  // touch the row.
  const { data: cd } = await admin
    .from("clinic_dentists")
    .select("dentist_id")
    .eq("clinic_id", link.clinic_id)
    .eq("dentist_id", input.dentistId)
    .returns<{ dentist_id: string }[]>()
    .maybeSingle();
  if (!cd) return { ok: false, error: "not_admin" };

  const { data: dentist } = await admin
    .from("dentists")
    .select("id, slug, photo_url")
    .eq("id", input.dentistId)
    .returns<{ id: string; slug: string; photo_url: string | null }[]>()
    .single();
  if (!dentist) return { ok: false, error: "not_found" };

  const v = validateOrPassthrough(
    input.photoUrl,
    dentist.photo_url,
    auth.user.id
  );
  if (!v.ok) return { ok: false, error: "invalid_url" };

  const { error } = await admin
    .from("dentists")
    .update({ photo_url: v.value } as never)
    .eq("id", dentist.id);
  if (error) {
    console.error("[photos] dentist update failed:", error);
    return { ok: false, error: "server_error" };
  }

  revalidatePath(`/dentist/${dentist.slug}`);

  // Each dentist may be listed on multiple clinic pages — revalidate the one
  // we just edited from. (Other clinic listings will pick up the new URL on
  // their next render.)
  const { data: clinic } = await admin
    .from("clinics")
    .select("slug")
    .eq("id", link.clinic_id)
    .returns<{ slug: string }[]>()
    .single();
  if (clinic) revalidatePath(`/clinic/${clinic.slug}`);
  revalidatePath("/search");
  return { ok: true };
}
