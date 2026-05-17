"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestUploadTicketAction } from "@/lib/clinic/upload-action";
import {
  STORAGE_BUCKET,
  ALLOWED_MIME,
  MAX_BYTES,
  type UploadKind,
  type AllowedMime,
} from "@/lib/clinic/upload-shared";

export type ImageUploadLabels = {
  add: string;
  replace: string;
  remove: string;
  uploading: string;
  tooLarge: string;       // e.g. "Image must be under 5 MB"
  wrongType: string;      // e.g. "Use JPG, PNG or WebP"
  failed: string;         // e.g. "Upload failed. Try again."
};

export function ImageUpload({
  kind,
  value,
  onChange,
  shape = "square",
  labels,
}: {
  kind: UploadKind;
  value: string | null;
  onChange: (publicUrl: string | null) => void;
  shape?: "square" | "wide";  // square = logo/avatar, wide = hero banner
  labels: ImageUploadLabels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
      setError(labels.wrongType);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(labels.tooLarge);
      return;
    }

    setBusy(true);
    try {
      const ticket = await requestUploadTicketAction({
        kind,
        mime: file.type,
      });
      if (!ticket.ok) {
        setError(labels.failed);
        return;
      }

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (upErr) {
        console.error("[upload] uploadToSignedUrl failed:", upErr);
        setError(labels.failed);
        return;
      }

      onChange(ticket.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  const isWide = shape === "wide";
  const frameClass = isWide
    ? "aspect-[16/9] w-full"
    : "w-28 h-28 md:w-32 md:h-32";

  return (
    <div className="space-y-2">
      <div
        className={`${frameClass} relative rounded-xl overflow-hidden border-2 border-dashed border-ink-200 bg-ink-50 flex items-center justify-center group`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-1.5 end-1.5 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/95 border border-ink-200 text-ink-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 shadow-sm transition-colors"
              aria-label={labels.remove}
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[12.5px] text-ink-500 hover:text-teal-700 hover:bg-teal-50/40 transition-colors disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                <span>{labels.uploading}</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-5 h-5" aria-hidden />
                <span>{labels.add}</span>
              </>
            )}
          </button>
        )}
      </div>

      {value && (
        <div className="flex gap-2 text-[12.5px]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" aria-hidden />
            )}
            {labels.replace}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
            {labels.remove}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0] ?? null);
          // Reset so picking the same file again still fires onChange
          e.target.value = "";
        }}
      />

      {error && (
        <p className="text-[12px] text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
