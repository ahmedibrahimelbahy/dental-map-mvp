"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import {
  Building2,
  Stethoscope,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Check,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Crown,
  TrendingUp,
  Clock,
  Phone,
  Mail,
} from "lucide-react";
import { onboardClinicAction } from "@/lib/clinic/onboard-action";
import {
  getTierPricing,
  type Package,
  type Tier,
  type ValidityMonths,
} from "@/lib/clinic/pricing";
import {
  LocationPicker,
  type LocationValue,
  type LocationPickerLabels,
} from "@/components/clinic/location-picker";
import {
  ImageUpload,
  type ImageUploadLabels,
} from "@/components/clinic/image-upload";

type Area = { slug: string; nameAr: string; nameEn: string; tier: Tier };
type Specialty = { slug: string; nameAr: string; nameEn: string };
type Insurance = { slug: string; nameAr: string; nameEn: string };

const TITLES = ["professor", "consultant", "specialist", "resident"] as const;
type Title = (typeof TITLES)[number];

type Dentist = {
  nameEn: string;
  nameAr: string;
  title: Title;
  yearsExp: string;
  feeEgp: string;
  specialties: string[];
  photoUrl: string | null;
};

const blankDentist = (): Dentist => ({
  nameEn: "",
  nameAr: "",
  title: "specialist",
  yearsExp: "",
  feeEgp: "",
  specialties: [],
  photoUrl: null,
});

export type OnboardFormProps = {
  areas: Area[];
  specialties: Specialty[];
  insuranceProviders: Insurance[];
  locale: string;
  labels: {
    location: LocationPickerLabels;
    insuranceTitle: string;
    insuranceBody: string;
    locationRequired: string;
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
    dentistN: string;
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
    successPendingBadge: string;
    successTimeframe: string;
    successCallNote: string;
    successEmailNote: string;
    errorPrefix: string;
    workingHoursNote: string;
    publishNote: string;
    stepLabel: string; // "Step {n} of 2"
    stepClinicTitle: string;
    stepPricingTitle: string;
    back: string;
    next: string;
    pricingHeader: string;
    pricingSubheader: string;
    pricingAreaPrefix: string;
    pricingMonthSuffix: string;
    packageStandard: string;
    packageGrowth: string;
    packagePremium: string;
    packageMostPopular: string;
    packageBest: string;
    featuresStandard: string[];
    featuresGrowth: string[];
    featuresPremium: string[];
    successFeeLabel: string;
    successFeeBody: string;
    validityTitle: string;
    validityBody: string;
    validity1: string;
    validity3: string;
    validity6: string;
    pricingSelectFirst: string;
    clinicLogoLabel: string;
    clinicLogoHint: string;
    clinicHeroLabel: string;
    clinicHeroHint: string;
    dentistPhotoLabel: string;
    dentistPhotoHint: string;
    imageUpload: ImageUploadLabels;
  };
};

export function OnboardForm({
  areas,
  specialties,
  insuranceProviders,
  locale,
  labels,
}: OnboardFormProps) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string } | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const [clinic, setClinic] = useState({
    nameEn: "",
    nameAr: "",
    addressEn: "",
    addressAr: "",
    areaSlug: "",
    phone: "",
    whatsapp: "",
    logoUrl: null as string | null,
    heroImageUrl: null as string | null,
  });
  const [dentists, setDentists] = useState<Dentist[]>([blankDentist()]);

  const [location, setLocation] = useState<LocationValue>({ lat: null, lng: null, googleMapsUrl: null });
  const [acceptedInsurance, setAcceptedInsurance] = useState<string[]>([]);

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [validity, setValidity] = useState<ValidityMonths>(3);

  const pickedArea = useMemo(
    () => areas.find((a) => a.slug === clinic.areaSlug),
    [areas, clinic.areaSlug]
  );

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

  function pricingStepValid(): boolean {
    if (!clinic.areaSlug) return false;
    if (!selectedPackage) return false;
    return true;
  }

  function clinicStepValid(): boolean {
    if (!clinic.nameEn.trim() || !clinic.nameAr.trim()) return false;
    if (!clinic.phone.trim()) return false;
    if (location.lat == null || location.lng == null) return false;
    for (const d of dentists) {
      if (!d.nameEn.trim() || !d.nameAr.trim()) return false;
      const fee = parseInt(d.feeEgp, 10);
      if (!Number.isFinite(fee) || fee <= 0) return false;
    }
    return true;
  }

  function goToStep(s: 1 | 2) {
    setStep(s);
    // Scroll the page back to the top so the user actually sees the new
    // step's header (otherwise they end up staring at whatever was at the
    // bottom of the previous step and think nothing changed).
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleNext() {
    setError(null);
    if (!pricingStepValid()) {
      setError(labels.pricingSelectFirst);
      return;
    }
    goToStep(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pickedArea || !selectedPackage) {
      setError(labels.pricingSelectFirst);
      return;
    }
    if (location.lat == null || location.lng == null) {
      setError(labels.locationRequired);
      return;
    }
    if (!clinicStepValid()) {
      setError(labels.errorPrefix);
      return;
    }
    startTransition(async () => {
      const r = await onboardClinicAction({
        clinic: {
          ...clinic,
          lat: location.lat as number,
          lng: location.lng as number,
          googleMapsUrl: location.googleMapsUrl ?? undefined,
          logoUrl: clinic.logoUrl ?? undefined,
          heroImageUrl: clinic.heroImageUrl ?? undefined,
        },
        dentists: dentists.map((d) => ({
          nameEn: d.nameEn,
          nameAr: d.nameAr,
          title: d.title,
          yearsExp: d.yearsExp ? parseInt(d.yearsExp, 10) : null,
          feeEgp: d.feeEgp ? parseInt(d.feeEgp, 10) : 0,
          specialties: d.specialties,
          photoUrl: d.photoUrl ?? undefined,
        })),
        subscription: {
          tier: pickedArea.tier,
          package: selectedPackage,
          consultationValidityMonths: validity,
        },
        acceptedInsurance,
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
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-white to-white border-2 border-amber-200 p-7 md:p-10 shadow-glow text-center max-w-[640px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-amber-500 text-white items-center justify-center mb-5 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)]">
          <Clock className="w-7 h-7" aria-hidden />
        </span>
        <div className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-3 py-1 mb-4">
          {labels.successPendingBadge}
        </div>
        <h2 className="display-h2 text-[24px] md:text-[28px] text-ink-900 mb-3">
          {labels.successTitle}
        </h2>
        <p className="text-[14.5px] leading-[1.65] text-ink-600 mb-5 max-w-[46ch] mx-auto">
          {labels.successBody}
        </p>
        <div className="rounded-xl bg-white border border-ink-100 p-4 md:p-5 mb-6 text-start max-w-[460px] mx-auto space-y-2.5">
          <div className="flex items-start gap-2.5 text-[13px] text-ink-700">
            <Clock className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" aria-hidden />
            <span>{labels.successTimeframe}</span>
          </div>
          <div className="flex items-start gap-2.5 text-[13px] text-ink-700">
            <Phone className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" aria-hidden />
            <span>{labels.successCallNote}</span>
          </div>
          <div className="flex items-start gap-2.5 text-[13px] text-ink-700">
            <Mail className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" aria-hidden />
            <span>{labels.successEmailNote}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="btn-primary inline-flex items-center gap-2"
        >
          {labels.successCta}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <StepHeader step={step} labels={labels} />

      {step === 1 ? (
        <PricingStep
          areas={areas}
          areaSlug={clinic.areaSlug}
          setAreaSlug={(slug) => setClinic({ ...clinic, areaSlug: slug })}
          pickedArea={pickedArea ?? null}
          isAr={isAr}
          selectedPackage={selectedPackage}
          setSelectedPackage={setSelectedPackage}
          validity={validity}
          setValidity={setValidity}
          labels={labels}
          error={error}
          onNext={handleNext}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <ClinicSection
            clinic={clinic}
            setClinic={setClinic}
            pickedArea={pickedArea ?? null}
            isAr={isAr}
            labels={labels}
          />
          <LocationPicker
            value={location}
            onChange={setLocation}
            labels={labels.location}
          />
          <InsuranceSection
            providers={insuranceProviders}
            accepted={acceptedInsurance}
            onToggle={(slug) =>
              setAcceptedInsurance((prev) =>
                prev.includes(slug)
                  ? prev.filter((s) => s !== slug)
                  : [...prev, slug]
              )
            }
            isAr={isAr}
            labels={labels}
          />
          <DentistsSection
            dentists={dentists}
            updateDentist={updateDentist}
            addDentist={addDentist}
            removeDentist={removeDentist}
            toggleSpecialty={toggleSpecialty}
            specialties={specialties}
            isAr={isAr}
            labels={labels}
          />

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[13px] text-rose-800">
              {error}
            </div>
          )}

          <section className="rounded-2xl bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200 p-5 md:p-7 flex items-center justify-between gap-4 flex-wrap shadow-glow">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[16px] md:text-[18px] font-bold text-ink-900 mb-1">
                {labels.sectionSubmit}
              </h3>
              <p className="text-[12.5px] md:text-[13px] leading-[1.6] text-ink-600 max-w-[52ch]">
                {labels.publishNote}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  goToStep(1);
                }}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-ink-200 text-ink-700 font-bold text-[14px] hover:bg-ink-50 transition-colors disabled:opacity-60"
              >
                {isAr ? (
                  <ArrowRight className="w-4 h-4" aria-hidden />
                ) : (
                  <ArrowLeft className="w-4 h-4" aria-hidden />
                )}
                {labels.back}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary inline-flex items-center gap-2 !py-3.5 !px-6 !text-[15px] shrink-0 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    {labels.submitting}
                  </>
                ) : (
                  <>{labels.submit}</>
                )}
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}

function StepHeader({
  step,
  labels,
}: {
  step: 1 | 2;
  labels: OnboardFormProps["labels"];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-[12.5px] font-bold ${
            step === 1
              ? "bg-teal-600 text-white shadow-glow"
              : "bg-teal-100 text-teal-700"
          }`}
        >
          1
        </span>
        <span className="text-[12.5px] font-bold text-ink-700 uppercase tracking-wider">
          {labels.stepPricingTitle}
        </span>
      </div>
      <div className="h-px flex-1 bg-ink-100" />
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-[12.5px] font-bold ${
            step === 2
              ? "bg-teal-600 text-white shadow-glow"
              : "bg-ink-100 text-ink-500"
          }`}
        >
          2
        </span>
        <span className="text-[12.5px] font-bold text-ink-700 uppercase tracking-wider">
          {labels.stepClinicTitle}
        </span>
      </div>
    </div>
  );
}

function ClinicSection({
  clinic,
  setClinic,
  pickedArea,
  isAr,
  labels,
}: {
  clinic: {
    nameEn: string;
    nameAr: string;
    addressEn: string;
    addressAr: string;
    areaSlug: string;
    phone: string;
    whatsapp: string;
    logoUrl: string | null;
    heroImageUrl: string | null;
  };
  setClinic: React.Dispatch<React.SetStateAction<typeof clinic>>;
  pickedArea: Area | null;
  isAr: boolean;
  labels: OnboardFormProps["labels"];
}) {
  return (
    <section className="rounded-2xl bg-white border border-ink-100 p-5 md:p-7 shadow-card">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 grid place-items-center">
            <Building2 className="w-5 h-5" aria-hidden />
          </span>
          <h2 className="font-display text-[18px] md:text-[20px] font-bold text-ink-900">
            {labels.sectionClinic}
          </h2>
        </div>
        {pickedArea && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[12.5px] font-bold">
            <MapPin className="w-3.5 h-3.5" aria-hidden />
            {isAr ? pickedArea.nameAr : pickedArea.nameEn}
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-5 md:gap-7 mb-6">
        <div className="space-y-1.5">
          <div className="field-label">{labels.clinicLogoLabel}</div>
          <ImageUpload
            kind="clinic_logo"
            value={clinic.logoUrl}
            onChange={(url) => setClinic({ ...clinic, logoUrl: url })}
            shape="square"
            labels={labels.imageUpload}
          />
          <p className="text-[11.5px] text-ink-500 leading-[1.5] max-w-[14ch]">
            {labels.clinicLogoHint}
          </p>
        </div>
        <div className="space-y-1.5 min-w-0">
          <div className="field-label">{labels.clinicHeroLabel}</div>
          <ImageUpload
            kind="clinic_hero"
            value={clinic.heroImageUrl}
            onChange={(url) => setClinic({ ...clinic, heroImageUrl: url })}
            shape="wide"
            labels={labels.imageUpload}
          />
          <p className="text-[11.5px] text-ink-500 leading-[1.5]">
            {labels.clinicHeroHint}
          </p>
        </div>
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
  );
}

function DentistsSection({
  dentists,
  updateDentist,
  addDentist,
  removeDentist,
  toggleSpecialty,
  specialties,
  isAr,
  labels,
}: {
  dentists: Dentist[];
  updateDentist: (idx: number, patch: Partial<Dentist>) => void;
  addDentist: () => void;
  removeDentist: (idx: number) => void;
  toggleSpecialty: (idx: number, slug: string) => void;
  specialties: Specialty[];
  isAr: boolean;
  labels: OnboardFormProps["labels"];
}) {
  return (
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

            <div className="grid grid-cols-[auto_1fr] gap-4 mb-4">
              <ImageUpload
                kind="dentist_photo"
                value={d.photoUrl}
                onChange={(url) => updateDentist(idx, { photoUrl: url })}
                shape="square"
                labels={labels.imageUpload}
              />
              <div className="min-w-0 self-center">
                <div className="text-[13px] font-bold text-ink-700">
                  {labels.dentistPhotoLabel}
                </div>
                <p className="text-[12px] text-ink-500 leading-[1.5] mt-1">
                  {labels.dentistPhotoHint}
                </p>
              </div>
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
  );
}

function PricingStep({
  areas,
  areaSlug,
  setAreaSlug,
  pickedArea,
  isAr,
  selectedPackage,
  setSelectedPackage,
  validity,
  setValidity,
  labels,
  error,
  onNext,
}: {
  areas: Area[];
  areaSlug: string;
  setAreaSlug: (slug: string) => void;
  pickedArea: Area | null;
  isAr: boolean;
  selectedPackage: Package | null;
  setSelectedPackage: (p: Package) => void;
  validity: ValidityMonths;
  setValidity: (v: ValidityMonths) => void;
  labels: OnboardFormProps["labels"];
  error: string | null;
  onNext: () => void;
}) {
  // Until the user picks an area we can't show real prices. Default to
  // Tier 1 numbers as a preview — visually communicates the structure
  // while making it obvious the dropdown is gating the real pricing.
  const previewTier: Tier = pickedArea?.tier ?? 1;
  const prices = getTierPricing(previewTier);
  const areaName = pickedArea ? (isAr ? pickedArea.nameAr : pickedArea.nameEn) : null;

  return (
    <div className="space-y-6">
      {/* Header strip — Partnership Pricing + Area */}
      <section className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 p-6 md:p-8 text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(13,148,136,0.6), transparent 60%)",
          }}
        />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display text-[22px] md:text-[28px] font-bold leading-tight">
              {labels.pricingHeader}
            </h2>
            <p className="text-[13.5px] md:text-[14.5px] text-white/70 mt-1.5 max-w-[60ch]">
              {labels.pricingSubheader}
            </p>
          </div>
          {areaName && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-teal-500 text-white px-4 py-2.5 font-bold text-[14px] md:text-[15px] shadow-glow">
              <MapPin className="w-4 h-4" aria-hidden />
              {labels.pricingAreaPrefix} {areaName}
            </div>
          )}
        </div>
      </section>

      {/* Area picker — gates the rest */}
      <section className="rounded-2xl bg-white border border-ink-100 p-5 md:p-7 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 grid place-items-center">
            <MapPin className="w-5 h-5" aria-hidden />
          </span>
          <h3 className="font-display text-[16px] md:text-[18px] font-bold text-ink-900">
            {labels.area}
          </h3>
        </div>
        <select
          value={areaSlug}
          onChange={(e) => setAreaSlug(e.target.value)}
          className="field-input w-full max-w-[420px]"
        >
          <option value="">{labels.areaPlaceholder}</option>
          {areas.map((a) => (
            <option key={a.slug} value={a.slug}>
              {isAr ? a.nameAr : a.nameEn}
            </option>
          ))}
        </select>
      </section>

      {/* Pricing cards — dimmed and non-interactive until an area is picked */}
      <div
        className={`grid md:grid-cols-3 gap-4 md:gap-5 ${
          pickedArea ? "" : "opacity-50 pointer-events-none select-none"
        }`}
        aria-disabled={!pickedArea}
      >
        <PackageCard
          name={labels.packageStandard}
          priceEgp={prices.standard}
          monthSuffix={labels.pricingMonthSuffix}
          features={labels.featuresStandard}
          selected={selectedPackage === "standard"}
          onSelect={() => setSelectedPackage("standard")}
          accent="neutral"
        />
        <PackageCard
          name={labels.packageGrowth}
          priceEgp={prices.growth}
          monthSuffix={labels.pricingMonthSuffix}
          features={labels.featuresGrowth}
          selected={selectedPackage === "growth"}
          onSelect={() => setSelectedPackage("growth")}
          accent="teal"
          badge={labels.packageMostPopular}
          badgeIcon={<TrendingUp className="w-3 h-3" aria-hidden />}
        />
        <PackageCard
          name={labels.packagePremium}
          priceEgp={prices.premium}
          monthSuffix={labels.pricingMonthSuffix}
          features={labels.featuresPremium}
          selected={selectedPackage === "premium"}
          onSelect={() => setSelectedPackage("premium")}
          accent="dark"
          badge={labels.packageBest}
          badgeIcon={<Crown className="w-3 h-3" aria-hidden />}
        />
      </div>

      {/* Success fee strip */}
      <section className="rounded-2xl border-2 border-teal-200 bg-white p-5 md:p-6 flex items-center gap-4 md:gap-5 flex-wrap">
        <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-[15px] md:text-[16px] shrink-0">
          50% /visit
        </div>
        <div className="flex-1 min-w-[260px]">
          <div className="font-display text-[15px] md:text-[16px] font-bold text-ink-900 mb-0.5">
            {labels.successFeeLabel}
          </div>
          <p className="text-[12.5px] md:text-[13px] leading-[1.6] text-ink-600">
            {labels.successFeeBody}
          </p>
        </div>
      </section>

      {/* Validity period */}
      <section className="rounded-2xl bg-white border border-ink-100 p-5 md:p-7 shadow-card">
        <h3 className="font-display text-[16px] md:text-[18px] font-bold text-ink-900 mb-1">
          {labels.validityTitle}
        </h3>
        <p className="text-[13px] leading-[1.6] text-ink-600 mb-4">
          {labels.validityBody}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {([1, 3, 6] as ValidityMonths[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValidity(v)}
              className={`rounded-xl border-2 px-3 py-3.5 text-[13.5px] font-bold transition-colors ${
                validity === v
                  ? "border-teal-600 bg-teal-50 text-teal-900"
                  : "border-ink-150 bg-white text-ink-700 hover:border-teal-300"
              }`}
            >
              {v === 1 ? labels.validity1 : v === 3 ? labels.validity3 : labels.validity6}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[13px] text-rose-800">
          {error}
        </div>
      )}

      {/* Continue card — same prominent CTA pattern as step 2's submit */}
      <section className="rounded-2xl bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200 p-5 md:p-7 flex items-center justify-between gap-4 flex-wrap shadow-glow">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[16px] md:text-[18px] font-bold text-ink-900 mb-1">
            {labels.stepClinicTitle}
          </h3>
          <p className="text-[12.5px] md:text-[13px] leading-[1.6] text-ink-600 max-w-[52ch]">
            {labels.workingHoursNote}
          </p>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!pickedArea || !selectedPackage}
          className="btn-primary inline-flex items-center gap-2 !py-3.5 !px-6 !text-[15px] shrink-0 disabled:opacity-60"
        >
          {labels.next}
          {isAr ? (
            <ArrowLeft className="w-4 h-4" aria-hidden />
          ) : (
            <ArrowRight className="w-4 h-4" aria-hidden />
          )}
        </button>
      </section>
    </div>
  );
}

function PackageCard({
  name,
  priceEgp,
  monthSuffix,
  features,
  selected,
  onSelect,
  accent,
  badge,
  badgeIcon,
}: {
  name: string;
  priceEgp: number;
  monthSuffix: string;
  features: string[];
  selected: boolean;
  onSelect: () => void;
  accent: "neutral" | "teal" | "dark";
  badge?: string;
  badgeIcon?: React.ReactNode;
}) {
  const accentClasses =
    accent === "teal"
      ? selected
        ? "border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/30 shadow-glow"
        : "border-teal-200 bg-white hover:border-teal-400"
      : accent === "dark"
        ? selected
          ? "border-amber-400 bg-ink-900 text-white ring-2 ring-amber-400/40 shadow-glow"
          : "border-ink-800 bg-ink-900 text-white hover:border-amber-400"
        : selected
          ? "border-teal-500 bg-white ring-2 ring-teal-400/30"
          : "border-ink-150 bg-white hover:border-teal-300";
  const isDark = accent === "dark";
  const priceColor =
    accent === "teal"
      ? "text-teal-700"
      : accent === "dark"
        ? "text-amber-400"
        : "text-ink-400";
  const titleColor = isDark ? "text-white" : "text-ink-900";
  const featureColor = isDark ? "text-white/85" : "text-ink-700";
  const checkColor = isDark ? "text-amber-400" : "text-teal-600";
  const badgeBg =
    accent === "teal"
      ? "bg-teal-600 text-white"
      : accent === "dark"
        ? "bg-amber-400 text-ink-900"
        : "bg-ink-100 text-ink-700";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative text-start rounded-2xl border-2 p-5 md:p-6 transition-all ${accentClasses}`}
    >
      {badge && (
        <span
          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${badgeBg}`}
        >
          {badgeIcon}
          {badge}
        </span>
      )}
      <h3
        className={`font-display text-[18px] md:text-[20px] font-bold text-center mb-2 ${titleColor}`}
      >
        {name}
      </h3>
      <div className={`text-center mb-4 ${priceColor}`}>
        <span className="font-display text-[26px] md:text-[30px] font-bold">
          {priceEgp.toLocaleString("en-US")}
        </span>
        <span className="font-display text-[16px] md:text-[18px] font-bold"> EGP</span>
        <span className={`text-[12px] ${isDark ? "text-white/60" : "text-ink-400"}`}>
          {monthSuffix}
        </span>
      </div>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li
            key={f}
            className={`flex items-start gap-2 text-[12.5px] md:text-[13px] leading-[1.5] ${featureColor}`}
          >
            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${checkColor}`} aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {selected && (
        <div
          className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-bold ${
            accent === "dark"
              ? "bg-amber-400 text-ink-900"
              : "bg-teal-600 text-white"
          }`}
        >
          <Check className="w-3.5 h-3.5" aria-hidden />
          Selected
        </div>
      )}
    </button>
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

function InsuranceSection({
  providers,
  accepted,
  onToggle,
  isAr,
  labels,
}: {
  providers: Insurance[];
  accepted: string[];
  onToggle: (slug: string) => void;
  isAr: boolean;
  labels: OnboardFormProps["labels"];
}) {
  if (providers.length === 0) return null;
  return (
    <section className="rounded-2xl bg-white border border-ink-100 p-5 md:p-7 shadow-card">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 grid place-items-center shrink-0">
          <Check className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[16px] md:text-[18px] font-bold text-ink-900">
            {labels.insuranceTitle}
          </h3>
          <p className="text-[12.5px] md:text-[13px] leading-[1.55] text-ink-600 mt-1">
            {labels.insuranceBody}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const checked = accepted.includes(p.slug);
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => onToggle(p.slug)}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${
                checked
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-ink-700 border-ink-200 hover:border-teal-300"
              }`}
            >
              {isAr ? p.nameAr : p.nameEn}
            </button>
          );
        })}
      </div>
    </section>
  );
}
