import type { ActionItem } from "@/lib/dashboard/data";
import { ListChecks, MessageCircle, AlertCircle, CheckCircle2 } from "lucide-react";

const TZ = "Africa/Cairo";

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function ActionQueueTile({
  items,
  locale,
  title,
  emptyLabel,
}: {
  items: ActionItem[];
  locale: string;
  title: string;
  emptyLabel: string;
}) {
  const isAr = locale === "ar";

  return (
    <div className="rounded-2xl bg-white border border-ink-100 shadow-tile p-5 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-teal-600" aria-hidden />
          <span className="small-caps">{title}</span>
        </div>
        {items.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" aria-hidden />
          <p className="text-[13px] text-ink-500">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) =>
            item.kind === "unconfirmed" ? (
              <div
                key={item.appointmentId}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-ink-900 truncate">
                      {item.patientName}
                    </div>
                    <div className="text-[11.5px] text-ink-600">
                      {isAr ? "غير مؤكد · غدًا" : "Unconfirmed · tomorrow"} ·{" "}
                      {formatTime(item.slotStartIso, locale)}
                    </div>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${item.patientPhone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                    isAr
                      ? `مرحبًا ${item.patientName}، نأكد على ميعادك غدًا في ${formatTime(item.slotStartIso, "ar")}`
                      : `Hi ${item.patientName}, confirming your booking tomorrow at ${formatTime(item.slotStartIso, "en")}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors shrink-0"
                >
                  <MessageCircle className="w-3 h-3" aria-hidden />
                  {isAr ? "واتساب" : "WhatsApp"}
                </a>
              </div>
            ) : (
              <div
                key={item.appointmentId}
                className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-ink-900 truncate">
                      {item.patientName}
                    </div>
                    <div className="text-[11.5px] text-ink-600">
                      {isAr ? "لم يحضر · اليوم" : "No-show · today"} ·{" "}
                      {formatTime(item.slotStartIso, locale)}
                    </div>
                  </div>
                </div>
                <a
                  href={`/${locale}/dashboard/bookings`}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors shrink-0"
                >
                  {isAr ? "علّم" : "Mark"}
                </a>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
