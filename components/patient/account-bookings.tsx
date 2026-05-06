"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import {
  Calendar,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Trash2,
  Loader2,
  Star,
  PenSquare,
} from "lucide-react";
import { cancelBookingAction } from "@/lib/booking/cancel-action";
import type { PatientBooking } from "@/lib/patient/bookings";
import { ReviewForm } from "@/components/patient/review-form";

export type ReviewsLabels = {
  leaveReviewCta: string;
  youRated: (n: number) => string;
};

const TZ = "Africa/Cairo";

function formatWhen(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

const STATUS_META: Record<
  PatientBooking["status"],
  { dot: string; pill: string; iconColor: string; Icon: typeof Calendar }
> = {
  pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    iconColor: "text-amber-600",
    Icon: Clock,
  },
  confirmed: {
    dot: "bg-teal-500",
    pill: "bg-teal-50 text-teal-700 border-teal-200",
    iconColor: "text-teal-600",
    Icon: CheckCircle2,
  },
  completed: {
    dot: "bg-ink-400",
    pill: "bg-ink-50 text-ink-600 border-ink-200",
    iconColor: "text-ink-500",
    Icon: CheckCircle2,
  },
  cancelled: {
    dot: "bg-rose-400",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    iconColor: "text-rose-600",
    Icon: XCircle,
  },
  no_show: {
    dot: "bg-rose-400",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    iconColor: "text-rose-600",
    Icon: AlertCircle,
  },
};

export function AccountBookings({
  bookings,
  locale,
  emptyTitle,
  emptyBody,
  emptyCta,
  cancelLabel,
  cancelConfirmTitle,
  cancelConfirmBody,
  cancelConfirmYes,
  cancelConfirmNo,
  upcomingLabel,
  pastLabel,
  statusLabels,
  errorMessages,
  reviewsByAppt,
  reviewsLabels,
}: {
  bookings: PatientBooking[];
  locale: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  cancelLabel: string;
  cancelConfirmTitle: string;
  cancelConfirmBody: string;
  cancelConfirmYes: string;
  cancelConfirmNo: string;
  upcomingLabel: string;
  pastLabel: string;
  statusLabels: Record<PatientBooking["status"], string>;
  errorMessages: Record<"not_found" | "too_late" | "already_cancelled" | "server_error", string>;
  reviewsByAppt: Record<string, { rating: number }>;
  reviewsLabels: ReviewsLabels;
}) {
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpenId, setReviewOpenId] = useState<string | null>(null);
  // Optimistic merge: reviews submitted this session, before next server fetch.
  const [localReviews, setLocalReviews] = useState<
    Record<string, { rating: number }>
  >({});

  function reviewFor(apptId: string): { rating: number } | undefined {
    return localReviews[apptId] ?? reviewsByAppt[apptId];
  }

  const upcoming = bookings.filter((b) => b.isUpcoming && b.status !== "cancelled");
  const past = bookings.filter((b) => !b.isUpcoming || b.status === "cancelled");

  function handleCancel(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const r = await cancelBookingAction(id);
      if (!r.ok) {
        if (r.error === "not_authenticated") {
          window.location.href = `/${locale}/signin`;
          return;
        }
        setError(errorMessages[r.error] ?? errorMessages.server_error);
      }
      setPendingId(null);
      setConfirmId(null);
    });
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-8 md:p-12 text-center shadow-card">
        <Calendar className="w-10 h-10 md:w-12 md:h-12 text-ink-300 mx-auto mb-4" aria-hidden />
        <h3 className="font-display text-[20px] md:text-[24px] font-bold text-ink-900 mb-2">
          {emptyTitle}
        </h3>
        <p className="text-[14px] leading-[1.65] text-ink-500 max-w-[42ch] mx-auto mb-6">
          {emptyBody}
        </p>
        <Link href="/search" className="btn-primary inline-flex items-center gap-1.5">
          {emptyCta}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
    );
  }

  function Section({
    title,
    list,
  }: {
    title: string;
    list: PatientBooking[];
  }) {
    if (list.length === 0) return null;
    return (
      <section className="mb-6 md:mb-8 last:mb-0">
        <h2 className="small-caps mb-3">{title}</h2>
        <div className="space-y-3">
          {list.map((b) => {
            const meta = STATUS_META[b.status];
            const dentistName = isAr ? b.dentistNameAr : b.dentistNameEn;
            const clinicName = isAr ? b.clinicNameAr : b.clinicNameEn;
            const address = isAr ? b.clinicAddressAr : b.clinicAddressEn;
            const area = isAr ? b.areaNameAr : b.areaNameEn;
            const StatusIcon = meta.Icon;

            return (
              <div
                key={b.id}
                className="rounded-2xl border border-ink-100 bg-white shadow-card p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`shrink-0 mt-0.5 ${meta.iconColor}`}>
                      <StatusIcon className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-[16px] md:text-[18px] font-bold text-ink-900 mb-0.5 leading-tight">
                        {dentistName}
                      </div>
                      <div className="text-[13px] text-ink-500 leading-tight">
                        {clinicName}
                        {area && (
                          <>
                            <span className="mx-1.5 text-ink-300">·</span>
                            {area}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${meta.pill}`}
                  >
                    {statusLabels[b.status]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-700 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-500" aria-hidden />
                    <span className="font-medium">{formatWhen(b.slotStartIso, locale)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-ink-900">{b.feeEgp}</span>
                    <span className="text-ink-400 text-[12px]">EGP</span>
                  </div>
                  {address && (
                    <div className="flex items-start gap-1.5 text-ink-500 w-full sm:w-auto">
                      <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" aria-hidden />
                      <span className="text-[12.5px]">{address}</span>
                    </div>
                  )}
                  {b.patientPhone && (
                    <div className="flex items-center gap-1.5 text-ink-500">
                      <Phone className="w-4 h-4 text-ink-400" aria-hidden />
                      <span className="text-[12.5px]">{b.patientPhone}</span>
                    </div>
                  )}
                </div>

                {b.patientNote && (
                  <div className="text-[12.5px] text-ink-500 italic bg-ink-50 rounded-lg p-2.5 mb-3">
                    {b.patientNote}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-ink-100 flex-wrap">
                  {b.dentistSlug ? (
                    <Link
                      href={`/dentist/${b.dentistSlug}`}
                      className="text-[12.5px] font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                    >
                      {isAr ? "صفحة الطبيب" : "View dentist"}
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
                    </Link>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {b.status === "completed" &&
                      (() => {
                        const existing = reviewFor(b.id);
                        if (existing) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-bold">
                              <Star
                                className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                strokeWidth={1.5}
                                aria-hidden
                              />
                              {reviewsLabels.youRated(existing.rating)}
                            </span>
                          );
                        }
                        if (reviewOpenId === b.id) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setReviewOpenId(b.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/60 text-teal-700 text-[12.5px] font-bold hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                          >
                            <PenSquare className="w-3.5 h-3.5" aria-hidden />
                            {reviewsLabels.leaveReviewCta}
                          </button>
                        );
                      })()}
                    {b.isCancellable && confirmId !== b.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setConfirmId(b.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-[12.5px] font-bold hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                        {cancelLabel}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline review form — only for completed, unreviewed bookings */}
                {b.status === "completed" &&
                  reviewOpenId === b.id &&
                  !reviewFor(b.id) && (
                    <div className="mt-3">
                      <ReviewForm
                        appointmentId={b.id}
                        locale={locale}
                        onSuccess={(_id, rating) => {
                          setLocalReviews((prev) => ({
                            ...prev,
                            [b.id]: { rating },
                          }));
                        }}
                      />
                    </div>
                  )}

                {/* Inline cancel confirmation */}
                {confirmId === b.id && (
                  <div className="mt-3 p-3 rounded-xl border border-rose-200 bg-rose-50">
                    <div className="font-bold text-[13.5px] text-ink-900 mb-1">
                      {cancelConfirmTitle}
                    </div>
                    <p className="text-[12.5px] text-ink-700 leading-relaxed mb-3">
                      {cancelConfirmBody}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCancel(b.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-bold disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                      >
                        {isPending && pendingId === b.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                            {cancelConfirmYes}
                          </>
                        ) : (
                          cancelConfirmYes
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg border border-ink-200 text-ink-700 text-[12.5px] font-bold hover:bg-ink-50"
                      >
                        {cancelConfirmNo}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[13px] text-rose-800">
          {error}
        </div>
      )}
      <Section title={upcomingLabel} list={upcoming} />
      <Section title={pastLabel} list={past} />
    </div>
  );
}
