"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createBookingAction } from "@/lib/booking/actions";

export function BookingForm({
  clinicDentistId,
  slotStartIso,
  initialName,
  initialPhone,
}: {
  clinicDentistId: string;
  slotStartIso: string;
  initialName: string;
  initialPhone: string;
}) {
  const t = useTranslations("Booking");
  const locale = useLocale();
  const router = useRouter();

  const [phone, setPhone] = useState(initialPhone);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createBookingAction({
        clinicDentistId,
        slotStartIso,
        patientPhone: phone,
        patientNote: note || undefined,
        locale,
      });
      if (res.ok) {
        router.push(`/book/${clinicDentistId}/success?id=${res.appointmentId}`);
      } else if (res.error === "slot_taken") {
        setError(t("alreadyTaken"));
      } else if (res.error === "not_authenticated") {
        router.push(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      } else {
        setError(t("errorGeneric"));
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900">
          {error}
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="name">
          {t("patientName")}
        </label>
        <input
          id="name"
          type="text"
          value={initialName}
          readOnly
          className="field-input opacity-70"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="phone">
          {t("patientPhone")}
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          required
          onChange={(e) => setPhone(e.target.value)}
          className="field-input"
        />
        <p className="mt-2 text-[12.5px] text-ink-500">
          {t("patientPhoneHint")}
        </p>
      </div>

      <div>
        <label className="field-label" htmlFor="note">
          {t("patientNote")}
        </label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="field-input resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "…" : t("submit")}
      </button>
    </form>
  );
}
