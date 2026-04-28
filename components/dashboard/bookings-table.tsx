"use client";

import { useState } from "react";
import { Copy, Check, Phone, Mail, MessageSquare, Calendar } from "lucide-react";
import type { AppointmentRow } from "@/lib/bookings/list";

const STATUS_COLORS: Record<AppointmentRow["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-ink-50 text-ink-700 border-ink-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  no_show: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatWhen(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
}

function buildCopyBlock(a: AppointmentRow, locale: string): string {
  const isAr = locale === "ar";
  const dentist = isAr ? a.dentistNameAr : a.dentistNameEn;
  const clinic = isAr ? a.clinicNameAr : a.clinicNameEn;
  return [
    `Patient: ${a.patientName}`,
    `Phone:   ${a.patientPhone}`,
    a.patientEmail ? `Email:   ${a.patientEmail}` : null,
    `When:    ${formatWhen(a.slotStartIso, "en")}`,
    `Dentist: ${dentist}`,
    `Clinic:  ${clinic}`,
    `Fee:     ${a.feeEgp} EGP`,
    a.patientNote ? `Note:    ${a.patientNote}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function BookingsTable({
  appointments,
  locale,
  emptyLabel,
}: {
  appointments: AppointmentRow[];
  locale: string;
  emptyLabel: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isAr = locale === "ar";

  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-12 text-center shadow-card">
        <Calendar className="w-10 h-10 text-ink-300 mx-auto mb-3" aria-hidden />
        <p className="text-[15px] text-ink-500 max-w-[42ch] mx-auto">{emptyLabel}</p>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = appointments.filter((a) => new Date(a.slotStartIso).getTime() >= now);
  const past = appointments.filter((a) => new Date(a.slotStartIso).getTime() < now).reverse();

  function copy(a: AppointmentRow) {
    const block = buildCopyBlock(a, locale);
    navigator.clipboard.writeText(block).then(() => {
      setCopiedId(a.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    });
  }

  function Section({ title, list }: { title: string; list: AppointmentRow[] }) {
    if (list.length === 0) return null;
    return (
      <section className="mb-8 last:mb-0">
        <h2 className="small-caps text-ink-400 mb-3">{title}</h2>
        <div className="rounded-2xl border border-ink-100 bg-white shadow-card overflow-hidden">
          {list.map((a, i) => (
            <div
              key={a.id}
              className={`p-4 md:p-5 grid md:grid-cols-[1fr_auto] gap-4 items-start ${
                i !== list.length - 1 ? "border-b border-ink-100" : ""
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-[16px] font-bold text-ink-900">
                    {a.patientName}
                  </span>
                  <span
                    className={`text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS[a.status]}`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[13px] text-ink-500">
                  <Calendar className="w-3.5 h-3.5 text-teal-500" aria-hidden />
                  <span className="font-medium text-ink-700">
                    {formatWhen(a.slotStartIso, locale)}
                  </span>
                  <span className="text-ink-300">·</span>
                  <span>{isAr ? a.dentistNameAr : a.dentistNameEn}</span>
                  <span className="text-ink-300">·</span>
                  <span className="font-bold text-ink-700">{a.feeEgp} EGP</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                  <a
                    href={`tel:${a.patientPhone}`}
                    className="inline-flex items-center gap-1 text-ink-700 hover:text-teal-600"
                  >
                    <Phone className="w-3.5 h-3.5" aria-hidden />
                    {a.patientPhone}
                  </a>
                  {a.patientEmail && (
                    <a
                      href={`mailto:${a.patientEmail}`}
                      className="inline-flex items-center gap-1 text-ink-700 hover:text-teal-600"
                    >
                      <Mail className="w-3.5 h-3.5" aria-hidden />
                      {a.patientEmail}
                    </a>
                  )}
                  {a.patientNote && (
                    <span className="inline-flex items-start gap-1 text-ink-500">
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden />
                      <span className="italic">{a.patientNote}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 md:justify-end">
                <a
                  href={`https://wa.me/${a.patientPhone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.413c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.857 9.857 0 0 0 1.512 5.26L4.5 19.5l2.154-1.307z" />
                  </svg>
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => copy(a)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 bg-white text-ink-700 text-[12.5px] font-semibold hover:bg-ink-50 transition-colors"
                  title={isAr ? "نسخ التفاصيل لإدخالها يدويًا" : "Copy details to paste into Dentolize"}
                >
                  {copiedId === a.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-600" aria-hidden />
                      {isAr ? "تم النسخ" : "Copied"}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden />
                      {isAr ? "نسخ" : "Copy"}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <Section title={isAr ? "القادمة" : "Upcoming"} list={upcoming} />
      <Section title={isAr ? "السابقة" : "Past"} list={past} />
    </>
  );
}
