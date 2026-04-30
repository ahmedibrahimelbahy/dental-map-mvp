import type { AppointmentLite, DentistLite } from "@/lib/dashboard/data";
import { Calendar } from "lucide-react";

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const TZ = "Africa/Cairo";

function hourCairo(iso: string): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
  return parseInt(fmt.format(new Date(iso)), 10);
}

function statusClass(status: AppointmentLite["status"]): string {
  switch (status) {
    case "confirmed":
      return "bg-gradient-to-b from-teal-600 to-teal-800";
    case "pending":
      return "[background:repeating-linear-gradient(45deg,#F59E0B,#F59E0B_4px,#FBBF24_4px,#FBBF24_8px)]";
    case "completed":
      return "bg-ink-300";
    case "no_show":
    case "cancelled":
      return "bg-rose-200 [background:repeating-linear-gradient(45deg,#FCA5A5,#FCA5A5_3px,#FECACA_3px,#FECACA_6px)]";
    default:
      return "bg-ink-100";
  }
}

export function TodayScheduleTile({
  dentists,
  appointments,
  locale,
  todayLabel,
  emptyLabel,
}: {
  dentists: DentistLite[];
  appointments: AppointmentLite[];
  locale: string;
  todayLabel: string;
  emptyLabel: string;
}) {
  const isAr = locale === "ar";

  // Group by dentist
  const byDentist = new Map<string, AppointmentLite[]>();
  for (const a of appointments) {
    const arr = byDentist.get(a.dentistId) ?? [];
    arr.push(a);
    byDentist.set(a.dentistId, arr);
  }

  // Only render dentists who have appointments today OR all dentists if no appointments at all
  const dentistsToShow =
    appointments.length > 0
      ? dentists.filter((d) => byDentist.has(d.id))
      : dentists;

  return (
    <div className="rounded-2xl bg-white border border-ink-100 shadow-tile p-5 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="small-caps">{todayLabel}</div>
          <div className="font-display text-[20px] font-bold text-ink-900 mt-1">
            {new Date().toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: TZ,
            })}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold">
          <Calendar className="w-3 h-3" aria-hidden />
          {appointments.length} {isAr ? "حجز" : "bookings"}
        </span>
      </div>

      {dentistsToShow.length === 0 ? (
        <div className="py-8 text-center text-[13.5px] text-ink-500">
          {emptyLabel}
        </div>
      ) : (
        <>
          {/* hour headers */}
          <div
            className="grid gap-1 text-[10px] text-ink-400 font-semibold mb-1.5"
            style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}
          >
            <div></div>
            {HOURS.map((h) => (
              <div key={h} className="text-center">
                {h}
              </div>
            ))}
          </div>

          {/* dentist rows */}
          <div className="space-y-1.5">
            {dentistsToShow.map((d) => {
              const appts = byDentist.get(d.id) ?? [];
              return (
                <div
                  key={d.id}
                  className="grid gap-1 items-center"
                  style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}
                >
                  <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-700 truncate">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 grid place-items-center text-[9px] font-bold shrink-0">
                      {d.initials || "·"}
                    </span>
                    <span className="truncate">{(isAr ? d.nameAr : d.nameEn).split(" ").slice(-1)[0]}</span>
                  </div>
                  {HOURS.map((h) => {
                    const appt = appts.find((a) => hourCairo(a.slotStartIso) === h);
                    if (!appt) return <div key={h} className="h-6 rounded bg-ink-100" />;
                    return (
                      <div
                        key={h}
                        className={`h-6 rounded ${statusClass(appt.status)} cursor-pointer hover:opacity-80 transition-opacity`}
                        title={`${appt.patientName} · ${appt.status}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-ink-100 text-[11px] text-ink-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-gradient-to-b from-teal-600 to-teal-800"></div>
              {isAr ? "مؤكد" : "Confirmed"}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded [background:repeating-linear-gradient(45deg,#F59E0B,#F59E0B_2px,#FBBF24_2px,#FBBF24_4px)]"></div>
              {isAr ? "معلّق" : "Pending"}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-ink-100"></div>
              {isAr ? "متاح" : "Open"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
