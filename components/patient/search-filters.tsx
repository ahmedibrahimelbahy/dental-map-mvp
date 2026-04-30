"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Filter, X } from "lucide-react";

type Option = { slug: string; name_ar: string; name_en: string };

type Props = {
  specialties: Option[];
  areas: Option[];
  current: { specialty?: string; area?: string; feeMax?: string };
  locale: string;
  labels: {
    title: string;
    anySpecialty: string;
    anyArea: string;
    feeMax: string;
    apply: string;
    reset: string;
    showFilters: string;
  };
};

export function SearchFilters(props: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    props.current.specialty,
    props.current.area,
    props.current.feeMax,
  ].filter(Boolean).length;

  return (
    <>
      {/* Mobile bar — visible < lg */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-ink-100 shadow-card hover:border-teal-300 transition-colors"
        >
          <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-800">
            <Filter className="w-4 h-4 text-teal-600" aria-hidden />
            {props.labels.showFilters}
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full bg-teal-600 text-white text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer (bottom sheet) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            aria-label="Close"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-ink-100 shrink-0">
              <h2 className="font-display text-[18px] font-bold text-ink-900">
                {props.labels.title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-ink-50"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <FilterForm {...props} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — hidden < lg */}
      <aside className="hidden lg:block lg:sticky lg:top-24 self-start">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="font-display text-[15px] font-bold text-ink-900 mb-4">
            {props.labels.title}
          </h2>
          <FilterForm {...props} />
        </div>
      </aside>
    </>
  );
}

function FilterForm({ specialties, areas, current, locale, labels }: Props) {
  const isAr = locale === "ar";
  return (
    <form action={`/${locale}/search`} method="get" className="space-y-5">
      <div>
        <label className="field-label" htmlFor="specialty">
          {labels.anySpecialty}
        </label>
        <select
          id="specialty"
          name="specialty"
          defaultValue={current.specialty ?? ""}
          className="field-input !py-2.5 !text-[14px]"
        >
          <option value="">{labels.anySpecialty}</option>
          {specialties.map((s) => (
            <option key={s.slug} value={s.slug}>
              {isAr ? s.name_ar : s.name_en}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="area">
          {labels.anyArea}
        </label>
        <select
          id="area"
          name="area"
          defaultValue={current.area ?? ""}
          className="field-input !py-2.5 !text-[14px]"
        >
          <option value="">{labels.anyArea}</option>
          {areas.map((a) => (
            <option key={a.slug} value={a.slug}>
              {isAr ? a.name_ar : a.name_en}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="feeMax">
          {labels.feeMax}
        </label>
        <input
          id="feeMax"
          name="feeMax"
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          defaultValue={current.feeMax ?? ""}
          placeholder="—"
          className="field-input !py-2.5 !text-[14px]"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary !py-2.5 !px-4 !text-[13px] flex-1">
          {labels.apply}
        </button>
        <Link href="/search" className="btn-secondary !py-2.5 !px-4 !text-[13px]">
          {labels.reset}
        </Link>
      </div>
    </form>
  );
}
