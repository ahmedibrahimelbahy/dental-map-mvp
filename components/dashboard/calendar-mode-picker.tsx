"use client";

import { useTransition, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { saveCalendarModeAction } from "@/lib/auth/dentist-actions";
import type { CalendarMode } from "@/lib/supabase/types";
import { CalendarDays, ClipboardList, CircleCheck } from "lucide-react";

type Mode = { id: CalendarMode; titleKey: "modeGoogleTitle" | "modeManualTitle" };

export function CalendarModePicker({
  clinicDentistId,
  current,
  t,
}: {
  clinicDentistId: string;
  current: CalendarMode;
  t: {
    title: string;
    subtitle: string;
    googleTitle: string;
    googleBody: string;
    manualTitle: string;
    manualBody: string;
    recommended: string;
    selected: string;
    switchTo: string;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<CalendarMode>(current);
  const router = useRouter();

  const select = (mode: CalendarMode) => {
    if (mode === optimistic) return;
    setOptimistic(mode);
    startTransition(async () => {
      try {
        await saveCalendarModeAction({ clinicDentistId, calendarMode: mode });
        router.refresh();
      } catch {
        setOptimistic(current);
      }
    });
  };

  return (
    <section>
      <div className="mb-5">
        <h2 className="font-display text-[20px] md:text-[22px] font-bold text-ink-900 mb-1">
          {t.title}
        </h2>
        <p className="text-[14px] text-ink-500 max-w-[64ch]">{t.subtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ModeCard
          active={optimistic === "google"}
          recommended
          recommendedLabel={t.recommended}
          selectedLabel={t.selected}
          switchLabel={t.switchTo}
          icon={<CalendarDays className="w-5 h-5" aria-hidden />}
          title={t.googleTitle}
          body={t.googleBody}
          onSelect={() => select("google")}
          pending={pending}
        />
        <ModeCard
          active={optimistic === "manual"}
          selectedLabel={t.selected}
          switchLabel={t.switchTo}
          icon={<ClipboardList className="w-5 h-5" aria-hidden />}
          title={t.manualTitle}
          body={t.manualBody}
          onSelect={() => select("manual")}
          pending={pending}
        />
      </div>
    </section>
  );
}

function ModeCard({
  active,
  recommended,
  recommendedLabel,
  selectedLabel,
  switchLabel,
  icon,
  title,
  body,
  onSelect,
  pending,
}: {
  active: boolean;
  recommended?: boolean;
  recommendedLabel?: string;
  selectedLabel: string;
  switchLabel: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  onSelect: () => void;
  pending: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 transition-all flex flex-col ${
        active
          ? "border-teal-500 bg-teal-50/40 shadow-card"
          : "border-ink-100 bg-white shadow-card hover:border-teal-300"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            active ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-600"
          }`}
        >
          {icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-display text-[17px] font-bold text-ink-900">
              {title}
            </h3>
            {recommended && !active && recommendedLabel && (
              <span className="text-[10.5px] font-bold tracking-wider uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {recommendedLabel}
              </span>
            )}
            {active && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold tracking-wider uppercase text-teal-700">
                <CircleCheck className="w-3.5 h-3.5" aria-hidden />
                {selectedLabel}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-[13.5px] leading-[1.6] text-ink-600 mb-5 flex-1">
        {body}
      </p>
      <button
        type="button"
        onClick={onSelect}
        disabled={active || pending}
        className={
          active
            ? "btn-secondary !py-2 !text-[13px] cursor-default opacity-60"
            : "btn-primary !py-2 !text-[13px]"
        }
      >
        {active ? selectedLabel : switchLabel}
      </button>
    </div>
  );
}
