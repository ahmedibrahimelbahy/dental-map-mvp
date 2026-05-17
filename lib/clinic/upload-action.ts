"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  STORAGE_BUCKET,
  ALLOWED_MIME,
  EXT_FOR_MIME,
  type AllowedMime,
  type UploadKind,
  type UploadTicket,
} from "@/lib/clinic/upload-shared";

// Mint a one-time signed upload URL the browser can PUT to directly. The
// bytes never travel through our Next.js function — Vercel's 4.5 MB body
// limit on server actions would choke a hero image otherwise.
export async function requestUploadTicketAction(input: {
  kind: UploadKind;
  mime: string;
}): Promise<UploadTicket> {
  const supa = await createClient();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  if (!ALLOWED_MIME.includes(input.mime as AllowedMime)) {
    return { ok: false, error: "invalid_mime" };
  }
  const ext = EXT_FOR_MIME[input.mime as AllowedMime];

  // Path scheme: pending/{user_id}/{kind}-{uuid}.{ext}
  //   The pending/ prefix lets us identify uploads that came from the
  //   onboarding wizard (vs. dashboard edits later). The user_id scoping
  //   is what onboardClinicAction enforces — a clinic admin can only
  //   attach URLs whose path begins with their own pending/<uid>/ folder.
  const path = `pending/${auth.user.id}/${input.kind}-${randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[upload] signed-url failed:", error);
    return { ok: false, error: "server_error" };
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicUrl = `${supaUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

  return {
    ok: true,
    path,
    token: data.token,
    publicUrl,
    bucket: STORAGE_BUCKET,
  };
}
