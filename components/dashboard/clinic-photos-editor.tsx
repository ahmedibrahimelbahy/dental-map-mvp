"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { ImageUpload, type ImageUploadLabels } from "@/components/clinic/image-upload";
import {
  updateMyClinicPhotosAction,
  updateMyDentistPhotoAction,
} from "@/lib/clinic/photos-actions";

export type ClinicPhotosEditorLabels = {
  sectionTitle: string;
  sectionBody: string;
  logoLabel: string;
  logoHint: string;
  heroLabel: string;
  heroHint: string;
  dentistsTitle: string;
  saved: string;
  saveFailed: string;
  imageUpload: ImageUploadLabels;
};

type Dentist = { id: string; name: string; photoUrl: string | null };

type Status = "idle" | "saving" | "saved" | "error";

// Tiny inline status pill — fades to idle after a short delay so the green
// check doesn't linger forever after each upload.
function StatusBadge({ status, labels }: { status: Status; labels: ClinicPhotosEditorLabels }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-teal-700 font-semibold">
        <Check className="w-3.5 h-3.5" aria-hidden />
        {labels.saved}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-rose-700 font-semibold">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        {labels.saveFailed}
      </span>
    );
  }
  return null;
}

export function ClinicPhotosEditor({
  initialLogoUrl,
  initialHeroUrl,
  dentists: initialDentists,
  labels,
}: {
  initialLogoUrl: string | null;
  initialHeroUrl: string | null;
  dentists: Dentist[];
  labels: ClinicPhotosEditorLabels;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [heroUrl, setHeroUrl] = useState<string | null>(initialHeroUrl);
  const [dentists, setDentists] = useState<Dentist[]>(initialDentists);

  const [logoStatus, setLogoStatus] = useState<Status>("idle");
  const [heroStatus, setHeroStatus] = useState<Status>("idle");
  const [dentistStatus, setDentistStatus] = useState<Record<string, Status>>({});

  const [, startTransition] = useTransition();

  function flashSaved(setStatus: (s: Status) => void) {
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1800);
  }

  async function saveLogo(next: string | null) {
    setLogoUrl(next);
    setLogoStatus("saving");
    startTransition(async () => {
      const res = await updateMyClinicPhotosAction({ logoUrl: next });
      if (res.ok) flashSaved(setLogoStatus);
      else setLogoStatus("error");
    });
  }

  async function saveHero(next: string | null) {
    setHeroUrl(next);
    setHeroStatus("saving");
    startTransition(async () => {
      const res = await updateMyClinicPhotosAction({ heroImageUrl: next });
      if (res.ok) flashSaved(setHeroStatus);
      else setHeroStatus("error");
    });
  }

  async function saveDentist(dentistId: string, next: string | null) {
    setDentists((rows) =>
      rows.map((d) => (d.id === dentistId ? { ...d, photoUrl: next } : d))
    );
    setDentistStatus((s) => ({ ...s, [dentistId]: "saving" }));
    startTransition(async () => {
      const res = await updateMyDentistPhotoAction({ dentistId, photoUrl: next });
      if (res.ok) {
        setDentistStatus((s) => ({ ...s, [dentistId]: "saved" }));
        setTimeout(
          () => setDentistStatus((s) => ({ ...s, [dentistId]: "idle" })),
          1800
        );
      } else {
        setDentistStatus((s) => ({ ...s, [dentistId]: "error" }));
      }
    });
  }

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-card space-y-6">
      <div>
        <h2 className="font-display text-[18px] md:text-[20px] font-bold text-ink-900">
          {labels.sectionTitle}
        </h2>
        <p className="mt-1 text-[13.5px] text-ink-500 max-w-[64ch]">
          {labels.sectionBody}
        </p>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-5 md:gap-7">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="field-label">{labels.logoLabel}</span>
            <StatusBadge status={logoStatus} labels={labels} />
          </div>
          <ImageUpload
            kind="clinic_logo"
            value={logoUrl}
            onChange={saveLogo}
            shape="square"
            labels={labels.imageUpload}
          />
          <p className="text-[11.5px] text-ink-500 leading-[1.5] max-w-[14ch]">
            {labels.logoHint}
          </p>
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="field-label">{labels.heroLabel}</span>
            <StatusBadge status={heroStatus} labels={labels} />
          </div>
          <ImageUpload
            kind="clinic_hero"
            value={heroUrl}
            onChange={saveHero}
            shape="wide"
            labels={labels.imageUpload}
          />
          <p className="text-[11.5px] text-ink-500 leading-[1.5]">
            {labels.heroHint}
          </p>
        </div>
      </div>

      {dentists.length > 0 && (
        <div className="border-t border-ink-100 pt-6">
          <h3 className="font-display text-[15.5px] font-bold text-ink-900 mb-4">
            {labels.dentistsTitle}
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dentists.map((d) => (
              <li
                key={d.id}
                className="grid grid-cols-[auto_1fr] gap-3 items-start"
              >
                <ImageUpload
                  kind="dentist_photo"
                  value={d.photoUrl}
                  onChange={(url) => saveDentist(d.id, url)}
                  shape="square"
                  labels={labels.imageUpload}
                />
                <div className="min-w-0 self-center">
                  <div className="text-[13.5px] font-semibold text-ink-900 truncate">
                    {d.name}
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={dentistStatus[d.id] ?? "idle"} labels={labels} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
