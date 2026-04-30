import type { LeaderboardRow } from "@/lib/dashboard/data";
import { Trophy } from "lucide-react";

export function LeaderboardTile({
  rows,
  locale,
  title,
  emptyLabel,
}: {
  rows: LeaderboardRow[];
  locale: string;
  title: string;
  emptyLabel: string;
}) {
  const isAr = locale === "ar";
  const maxFilled = Math.max(...rows.map((r) => r.filledPct), 1);

  return (
    <div className="rounded-2xl bg-white border border-ink-100 shadow-tile p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-teal-600" aria-hidden />
          <span className="small-caps">{title}</span>
        </div>
        <span className="text-[11px] text-ink-400 font-medium">
          {isAr ? "هذا الأسبوع" : "this week"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-500">{emptyLabel}</div>
      ) : (
        <>
          {/* header */}
          <div className="grid grid-cols-[1.6fr_60px_100px_60px_2fr] gap-3 px-1 mb-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-bold">
              {isAr ? "الطبيب" : "Dentist"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-bold">
              {isAr ? "الحجوزات" : "Bookings"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-bold">
              {isAr ? "الإيراد" : "Revenue"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-bold">
              {isAr ? "الإشغال" : "Filled"}
            </div>
            <div></div>
          </div>

          <div className="space-y-1">
            {rows.map((r, i) => (
              <div
                key={r.dentistId}
                className="grid grid-cols-[1.6fr_60px_100px_60px_2fr] gap-3 items-center px-1 py-2 rounded-lg hover:bg-ink-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${
                      i === 0
                        ? "bg-teal-600 text-white"
                        : i === 1
                          ? "bg-teal-400 text-white"
                          : "bg-teal-100 text-teal-800"
                    }`}
                  >
                    {r.initials || "·"}
                  </span>
                  <span className="text-[13px] font-bold truncate">
                    {isAr ? r.nameAr : r.nameEn}
                  </span>
                </div>
                <div className="text-[13px] font-semibold tabular-nums">
                  {r.bookingsThisWeek}
                </div>
                <div className="text-[13px] font-semibold tabular-nums">
                  EGP {r.revenueThisWeek.toLocaleString()}
                </div>
                <div className="text-[13px] font-semibold tabular-nums">{r.filledPct}%</div>
                <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      i === 0
                        ? "bg-gradient-to-r from-teal-700 to-teal-500"
                        : i === 1
                          ? "bg-teal-500"
                          : "bg-teal-300"
                    }`}
                    style={{ width: `${(r.filledPct / maxFilled) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
