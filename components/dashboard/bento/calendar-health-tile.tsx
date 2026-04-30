import type { CalendarHealthRow } from "@/lib/dashboard/data";
import { Link } from "@/i18n/routing";
import { CalendarCheck, ArrowRight } from "lucide-react";

function relTime(iso: string | null, locale: string): string {
  if (!iso) return locale === "ar" ? "لم تُزامَن" : "never";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return locale === "ar" ? "الآن" : "now";
  if (min < 60) return locale === "ar" ? `منذ ${min}د` : `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return locale === "ar" ? `منذ ${hr}س` : `${hr}h ago`;
  const days = Math.round(hr / 24);
  return locale === "ar" ? `منذ ${days}ي` : `${days}d ago`;
}

export function CalendarHealthTile({
  rows,
  locale,
  title,
  manualLabel,
  manageLabel,
}: {
  rows: CalendarHealthRow[];
  locale: string;
  title: string;
  manualLabel: string;
  manageLabel: string;
}) {
  const isAr = locale === "ar";

  return (
    <div className="rounded-2xl bg-white border border-ink-100 shadow-tile p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <CalendarCheck className="w-4 h-4 text-teal-600" aria-hidden />
        <span className="small-caps">{title}</span>
      </div>

      <div className="space-y-2.5 flex-1">
        {rows.length === 0 && (
          <div className="text-[13px] text-ink-400 italic">
            {isAr ? "لا توجد بيانات" : "No data"}
          </div>
        )}
        {rows.map((r) => {
          const dotColor =
            r.mode === "google"
              ? r.lastSyncedAt
                ? "bg-emerald-500"
                : "bg-amber-400"
              : "bg-amber-400";
          const lastShortName = (isAr ? r.nameAr : r.nameEn).split(" ").slice(-1)[0];

          return (
            <div key={r.dentistId} className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <span className="font-bold text-ink-800 truncate">{lastShortName}</span>
              </div>
              <span className="text-[11.5px] text-ink-500 font-medium">
                {r.mode === "manual" ? manualLabel : relTime(r.lastSyncedAt, locale)}
              </span>
            </div>
          );
        })}
      </div>

      <Link
        href="/dashboard/calendar"
        className="mt-4 group inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-ink-200 hover:border-teal-300 hover:bg-teal-50 text-[12px] font-bold text-ink-700 hover:text-teal-700 transition-colors"
      >
        {manageLabel}
        <ArrowRight className="w-3 h-3 rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
