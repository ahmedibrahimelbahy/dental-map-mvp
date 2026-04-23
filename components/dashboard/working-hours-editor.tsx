"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { saveWorkingHoursAction } from "@/lib/auth/dentist-actions";
import type { WorkingHoursDay } from "@/lib/supabase/types";
import { CircleCheck } from "lucide-react";

const SLOT_OPTIONS = [15, 20, 30, 45, 60];

export function WorkingHoursEditor({
  clinicDentistId,
  initialWorkingHours,
  initialSlotMinutes,
  t,
}: {
  clinicDentistId: string;
  initialWorkingHours: WorkingHoursDay[];
  initialSlotMinutes: number;
  t: {
    title: string;
    subtitle: string;
    save: string;
    saved: string;
    open: string;
    closed: string;
    start: string;
    end: string;
    slotLength: string;
    minutes: string;
    days: string[];
  };
}) {
  // Build a dense 7-day state from sparse working hours
  const [days, setDays] = useState<
    { enabled: boolean; start: string; end: string }[]
  >(() =>
    Array.from({ length: 7 }, (_, i) => {
      const existing = initialWorkingHours.find((w) => w.day === i);
      return existing
        ? { enabled: true, start: existing.start, end: existing.end }
        : { enabled: false, start: "10:00", end: "18:00" };
    })
  );
  const [slotMinutes, setSlotMinutes] = useState(initialSlotMinutes);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const router = useRouter();

  const toggleDay = (idx: number) =>
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, enabled: !d.enabled } : d))
    );
  const setTime = (idx: number, field: "start" | "end", value: string) =>
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );

  const onSave = () => {
    const workingHours: WorkingHoursDay[] = days
      .map((d, i) =>
        d.enabled
          ? { day: i, start: d.start, end: d.end }
          : null
      )
      .filter((x): x is WorkingHoursDay => x !== null);

    startTransition(async () => {
      await saveWorkingHoursAction({
        clinicDentistId,
        workingHours,
        slotMinutes,
      });
      setSavedAt(Date.now());
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-card">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-[20px] md:text-[22px] font-bold text-ink-900 mb-1">
            {t.title}
          </h2>
          <p className="text-[14px] leading-[1.6] text-ink-500 max-w-[62ch]">
            {t.subtitle}
          </p>
        </div>
        <div className="shrink-0">
          <label className="small-caps text-ink-400 block mb-2">
            {t.slotLength}
          </label>
          <select
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(parseInt(e.target.value, 10))}
            className="field-input !py-2 !text-[14px]"
          >
            {SLOT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {t.minutes}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2.5">
        {days.map((d, i) => (
          <div
            key={i}
            className={`grid grid-cols-[90px_auto_1fr_1fr] md:grid-cols-[130px_auto_1fr_1fr] items-center gap-3 md:gap-4 rounded-xl border px-4 py-3 transition-colors ${
              d.enabled
                ? "border-teal-200 bg-teal-50/40"
                : "border-ink-100 bg-surface"
            }`}
          >
            <div className="font-display text-[14.5px] font-semibold text-ink-900">
              {t.days[i]}
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={d.enabled}
                onChange={() => toggleDay(i)}
                className="w-4 h-4 accent-teal-500"
              />
              <span className="text-[13px] font-medium text-ink-600">
                {d.enabled ? t.open : t.closed}
              </span>
            </label>
            <input
              type="time"
              value={d.start}
              disabled={!d.enabled}
              onChange={(e) => setTime(i, "start", e.target.value)}
              aria-label={t.start}
              className="field-input !py-2 !text-[14px] disabled:opacity-50"
            />
            <input
              type="time"
              value={d.end}
              disabled={!d.enabled}
              onChange={(e) => setTime(i, "end", e.target.value)}
              aria-label={t.end}
              className="field-input !py-2 !text-[14px] disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? "…" : t.save}
        </button>
        {savedAt && !pending && (
          <span className="inline-flex items-center gap-2 text-[13px] text-teal-700 font-semibold">
            <CircleCheck className="w-4 h-4" aria-hidden />
            {t.saved}
          </span>
        )}
      </div>
    </section>
  );
}
