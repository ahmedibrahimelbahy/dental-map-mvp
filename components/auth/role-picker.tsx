"use client";

import { Search, Building2, ArrowRight } from "lucide-react";

export type SignUpRole = "patient" | "clinic_admin";

export function RolePicker({
  onChoose,
  labels,
}: {
  onChoose: (role: SignUpRole) => void;
  labels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    patientTitle: string;
    patientBody: string;
    clinicTitle: string;
    clinicBody: string;
    pickCta: string;
  };
}) {
  return (
    <div>
      <div className="small-caps text-[11px] text-teal-600 mb-4">
        {labels.eyebrow}
      </div>
      <h1 className="display-h2 text-[36px] sm:text-[42px] md:text-[52px] text-ink-900 mb-3 leading-tight">
        {labels.title}
      </h1>
      <p className="text-[15.5px] leading-[1.6] text-ink-500 mb-8 max-w-[42ch]">
        {labels.subtitle}
      </p>

      <div className="space-y-3">
        <RoleCard
          onClick={() => onChoose("patient")}
          icon={<Search className="w-6 h-6" aria-hidden />}
          title={labels.patientTitle}
          body={labels.patientBody}
          cta={labels.pickCta}
        />
        <RoleCard
          onClick={() => onChoose("clinic_admin")}
          icon={<Building2 className="w-6 h-6" aria-hidden />}
          title={labels.clinicTitle}
          body={labels.clinicBody}
          cta={labels.pickCta}
        />
      </div>
    </div>
  );
}

function RoleCard({
  onClick,
  icon,
  title,
  body,
  cta,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-start flex items-start gap-4 p-5 md:p-6 rounded-2xl border border-ink-100 bg-white shadow-card hover:border-teal-300 hover:shadow-tile transition-all"
    >
      <span className="shrink-0 inline-flex w-12 h-12 rounded-xl bg-teal-50 text-teal-600 items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[16px] md:text-[17px] font-bold text-ink-900 mb-1 leading-tight">
          {title}
        </div>
        <p className="text-[13.5px] leading-[1.6] text-ink-500 mb-3">{body}</p>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-teal-700 group-hover:text-teal-800">
          {cta}
          <ArrowRight
            className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </button>
  );
}
