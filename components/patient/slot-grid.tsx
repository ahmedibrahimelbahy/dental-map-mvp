"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { CalendarDays } from "lucide-react";

type Slot = { start: string; end: string };

const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_AR = ["الأحد", "الإث", "الثل", "الأرب", "الخم", "الجم", "السبت"];

export function SlotGrid({
  clinicDentistId,
  locale,
  t,
}: {
  clinicDentistId: string;
  locale: string;
  t: { title: string; subtitle: string; noSlots: string; loading: string; book: string };
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const from = new Date(Date.now() + 60 * 60_000).toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
    fetch(
      `/api/clinic-dentists/${clinicDentistId}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=Africa/Cairo`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [clinicDentistId]);

  const grouped = useMemo(() => {
    if (!slots) return [];
    const byDay = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = new Date(s.start).toLocaleDateString("en-CA", {
        timeZone: "Africa/Cairo",
      });
      const arr = byDay.get(key) ?? [];
      arr.push(s);
      byDay.set(key, arr);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(0, 7);
  }, [slots]);

  const onPick = (slot: Slot) => {
    const url = `/book/${clinicDentistId}?start=${encodeURIComponent(slot.start)}`;
    router.push(url);
  };

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-card">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-[20px] md:text-[22px] font-bold text-ink-900 mb-1">
            {t.title}
          </h2>
          <p className="text-[13.5px] text-ink-500">{t.subtitle}</p>
        </div>
      </div>

      {loading && <div className="text-[13.5px] text-ink-500">{t.loading}</div>}

      {!loading && grouped.length === 0 && (
        <div className="rounded-xl border border-ink-100 bg-surface px-5 py-6 text-[14px] text-ink-600">
          {t.noSlots}
        </div>
      )}

      {!loading && grouped.length > 0 && (
        <div className="space-y-5">
          {grouped.map(([dayKey, daySlots]) => {
            const date = new Date(`${dayKey}T12:00:00Z`);
            const dow = date.getUTCDay();
            const dayLabel = isAr ? DAY_LABELS_AR[dow] : DAY_LABELS_EN[dow];
            const dateLabel = date.toLocaleDateString(locale, {
              day: "numeric",
              month: "short",
            });
            return (
              <div key={dayKey}>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="font-display text-[14px] font-bold text-ink-900">
                    {dayLabel}
                  </span>
                  <span className="text-[12.5px] text-ink-500">{dateLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => onPick(s)}
                      className="px-3 py-3 rounded-lg border border-ink-100 text-[13px] font-semibold text-ink-700 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50 transition-colors min-h-[44px]"
                    >
                      {new Date(s.start).toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Cairo",
                      })}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
