// Shared constants, types, and pure helpers for the upload pipeline.
// Lives outside the "use server" file so the client bundle can import
// the constants and types without dragging server-only modules in.

export const STORAGE_BUCKET = "clinic-media";

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const EXT_FOR_MIME: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadKind = "clinic_logo" | "clinic_hero" | "dentist_photo";

export type UploadTicket =
  | {
      ok: true;
      path: string;
      token: string;
      publicUrl: string;
      bucket: typeof STORAGE_BUCKET;
    }
  | { ok: false; error: "not_authenticated" | "invalid_mime" | "server_error" };

// Pure URL check — used by other server actions to reject URLs that don't
// look like something we minted for a given user.
export function isOwnedPendingUrl(url: string, userId: string): boolean {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const prefix = `${supaUrl}/storage/v1/object/public/${STORAGE_BUCKET}/pending/${userId}/`;
  return url.startsWith(prefix);
}
