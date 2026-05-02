"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import {
  Building2,
  Stethoscope,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";
import { onboardClinicAction } from "@/lib/clinic/onboard-action";

type Area = { slug: string; nameAr: string; nameEn: string };
type Specialty = { slug: string; nameAr: string; nameEn: string };

const TITLES = ["professor", "consultant", "specialist", "resident"] as const;
type Title = (typeof TITLES)[number];

type Dentist = {
  nameEn: string;
  nameAr: string;
  title: Title;
  yearsExp: string;
  feeEgp: string;
  specialties: string[];
};

const blankDentist = (): Dentist => ({
  nameEn: "",
  nameAr: "",
  title: "specialist",
  yearsExp: "",
  feeEgp: "",
  specialties: [],
});

export type OnboardFormProps = {
  areas: Area[];
  specialties: Specialty[];
  locale: string;
  labels: {
    sectionClinic: string;
    sectionDentists: string;
    sectionSubmit: string;
    clinicNameEn: string;
    clinicNameAr: string;
    addressEn: string;
    addressAr: string;
    area: string;
    areaPlaceholder: string;
    phone: string;
    whatsapp: string;
    whatsappHint: string;
    dentistN: string; // "Dentist {n}"
    addDentist: string;
    removeDentist: string;
    dentistNameEn: string;
    dentistNameAr: string;
    title: string;
    titles: Record<Title, string>;
    yearsExp: string;
    feeEgp: string;
    specialties: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    successCta: string;
    errorPrefix: string;
    workingHoursNote: string;
    publishNote: string;
  };
};

export function OnboardForm({ areas, specialties, locale, labels }: OnboardFormProps) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string } | null>(null);

  const [clinic, setClinic] = useState({
    nameEn: "",
    nameAr: "",
    addressEn: "",
    addressAr: "",
    areaSlug: "",
    phone: "",
    whatsapp: "",
  });
  const [dentists, setDentists] = useState<Dentist[]>([blankDentist()]);

  function updateDentist(idx: number, patch: Partial<Dentist>) {
    setDentists((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d))
    );
  }
  function addDentist() {
    if (dentists.length >= 5) return;
    setDentists((prev) => [...prev, blankDentist()]);
  }
  function removeDentist(idx: number) {
    setDentists((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleSpecialty(idx: number, slug: string) {
    setDentists((prev) =>
      prev.map((d, i) =>
        i === idx
          ? {
              ...d,
              specialties: d.specialties.includes(slug)
                ? d.specialties.filter((s) => s !== slug)
                : [...d.specialties, slug],
            }
          : d
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await onboardClinicAction({
        clinic,
        dentists: dentists.map((d) => ({
          nameEn: d.nameEn,
          nameAr: d.nameAr,
          title: d.title,
          yearsExp: d.yearsExp ? parseInt(d.yearsExp, 10) : null,
          feeEgp: d.feeEgp ? parseInt(d.feeEgp, 10) : 0,
          specialties: d.specialties,
        })),
      });
      if (!r.ok) {
        if (r.error === "not_authenticated") {
          router.push("/signin");
          return;
        }
        setError(r.message ?? `${labels.errorPrefix}: ${r.error}`);
        return;
      }
      setSuccess({ slug: r.clinicSlug });
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-white border border-teal-200 p-7 md:p-10 shadow-glow text-center max-w-[640px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-teal-500 text-white items-center justify-center mb-5 shadow-glow">
          <Check className="w-7 h-7" aria-hidden />
        </span>
        <h2 className="display-h2 text-[24px] md:text-[28px] text-ink-900 mb-3">
          {labels.successTitle}
        </h2>
        <p className="text-[14.5px] leading-[1.65] text-ink-600 mb-6 max-w-[44ch] mx-auto">
          {labels.successBody}
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn-primary inline-flex items-center gap-2"
        >
          {labels.successCta}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
      {/* ── Clinic ── */}
      <section className="rounded-2xl bg-white border border-ink-100 p-5 md:p-7 shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 grid place-items-center">
            <Building2 className="w-5 h-5" aria-hidden />
          </span>
          <h2 className="font-display text-[18px] md:text-[20px] font-bold text-ink-900">
            {labels.sectionClinic}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={labels.clinicNameEn} required>
            <input
              type="text"
              value={clinic.nameEn}
              onChange={(e) => setClinic({ ...clinic, nameEn: e.target.value })}
              required
              placeholder="Smile Plus Zamalek"
              className="field-input"
            />
          </Field>
          <Field label={labels.clinicNameAr} required>
            <input
              type="text"
              value={clinic.nameAr}
              onChange={(e) => setClinic({ ...clinic, nameAr: e.target.value })}
              required
              dir="rtl"
              placeholder="سمايل بلس الزمالك"
              className="field-input"
            />
          </Field>
          <Field label={labels.area} required>
            <select
              value={clinic.areaSlug}
              onChange={(e) => setClinic({ ...clinic, areaSlug: e.target.value })}
              required
              className="field-input"
            >
              <option value="">{labels.areaPlaceholder}</option>
              {areas.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {isAr ? a.nameAr : a.nameEn}
                </option>
              ))}
            </select>
          </Field>
          <Field label={labels.phone} required>
            <input
              type="tel"
              value={clinic.phone}
              onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
              required
              placeholder="+20 10 1234 5678"
              className="field-input"
              dir="ltr"
            />
          </Field>
          <Field label={labels.addressEn}>
            <input
              type="text"
              value={clinic.addressEn}
              onChange={(e) => setClinic({ ...clinic, addressEn: e.target.value })}
              placeholder="12 Hassan Sabri St, Zamalek"
              className="field-input"
            />
          </Field>
          <Field label={labels.addressAr}>
            <input
              type="text"
              value={clinic.addressAr}
              onChange={(e) => setClinic({ ...clinic, addressAr: e.target.value })}
              dir="rtl"
              placeholder="12 شارع حسن صبري، الزمالك"
              className="field-input"
            />
          </Field>
          <Field label={labels.whatsapp} hint={labels.whatsappHint}>
            <input
              type="tel"
              value={clinic.whatsapp}
              onChange={(e) => setClinic({ ...clinic, whatsapp: e.target.value })}
              placeholder="+20 10 1234 5678"
              className="field-input"
              dir="ltr"
            />
          </Field>
        </div>
      </section>

      {/* ── Dentists ── */}
      <section className="rounded-2xl bg-white border border-ink-100 p-5 md:p-7 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 grid place-items-center">
              <Stethoscope className="w-5 h-5" aria-hidden />
            </span>
            <h2 className="font-display text-[18px] md:text-[20px] font-bold text-ink-900">
              {labels.sectionDentists}
            </h2>
          </div>
          {dentists.length < 5 && (
            <button
              type="button"
              onClick={addDentist}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 text-[13px] font-bold hover:bg-teal-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              {labels.addDentist}
            </button>
          )}
        </div>

        <div className="space-y-5">
          {dentists.map((d, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-ink-50 border border-ink-100 p-4 md:p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-[13px] font-bold text-ink-700 uppercase tracking-wider">
                  {labels.dentistN.replace("{n}", String(idx + 1))}
                </div>
                {dentists.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDentist(idx)}
                    className="inline-flex items-center gap-1 text-[12px] text-rose-700 hover:text-rose-800 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    {labels.removeDentist}
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={labels.dentistNameEn} required>
                  <input
                    type="text"
                    value={d.nameEn}
                    onChange={(e) => updateDentist(idx, { nameEn: e.target.value })}
                    required
                    placeholder="Dr. Yara Magdy"
                    className="field-input"
                  />
                </Field>
                <Field label={labels.dentistNameAr} required>
                  <input
                    type="text"
                    value={d.nameAr}
                    onChange={(e) => updateDentist(idx, { nameAr: e.target.value })}
                    required
                    dir="rtl"
                    placeholder="د. يارا مجدي"
                    className="field-input"
                  />
                </Field>
                <Field label={labels.title}>
                  <select
                    value={d.title}
                    onChange={(e) => updateDentist(idx, { title: e.target.value as Title })}
                    className="field-input"
                  >
                    {TITLES.map((tt) => (
                      <option key={tt} value={tt}>
                        {labels.titles[tt]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={labels.yearsExp}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={70}
                    value={d.yearsExp}
                    onChange={(e) => updateDentist(idx, { yearsExp: e.target.value })}
                    placeholder="8"
                    className="field-input"
                  />
                </Field>
                <Field label={labels.feeEgp} required>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={50}
                    value={d.feeEgp}
                    onChange={(e) => updateDentist(idx, { feeEgp: e.target.value })}
                    required
                    placeholder="600"
                    className="field-input"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <div className="text-[12px] font-bold text-ink-500 uppercase tracking-wider mb-2">
                  {labels.specialties}
                </div>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => {
                    const checked = d.specialties.includes(s.slug);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => toggleSpecialty(idx, s.slug)}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${
                          checked
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-ink-700 border-ink-200 hover:border-teal-300"
                        }`}
                      >
                        {isAr ? s.nameAr : s.nameEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-teal-50/60 border border-teal-100 p-4 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-[12.5px] leading-[1.65] text-teal-900">
            {labels.workingHoursNote}
          </p>
        </div>
      </section>

      {/* ── Submit ── */}
      <section className="rounded-2xl bg-gradient-to-br from-teal-50 to-white border border-teal-200 p-5 md:p-7">
        <h3 className="font-display text-[16px] md:text-[18px] font-bold text-ink-900 mb-2">
          {labels.sectionSubmit}
        </h3>
        <p className="text-[13.5px] leading-[1.65] text-ink-600 mb-5">
          {labels.publishNote}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[13px] text-rose-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary inline-flex items-center gap-2 !py-3.5 !px-6 !text-[15px] disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              {labels.submitting}
            </>
          ) : (
            <>
              {labels.submit}
            </>
          )}
        </button>
      </section>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label flex items-center gap-1">
        {label}
        {required && <span className="text-rose-600">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11.5px] text-ink-400 mt-1">{hint}</span>}
    </label>
  );
}
