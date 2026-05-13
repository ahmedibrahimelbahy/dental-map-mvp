import { setRequestLocale } from "next-intl/server";
import { requireOps } from "@/lib/auth/session";
import { getOpsSnapshot } from "@/lib/ops/data";
import { ClinicRowActions } from "@/components/ops/clinic-row-actions";
import {
  Shield,
  Building2,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  Stethoscope,
  Star,
  Wallet,
  Repeat,
  CalendarCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOps(locale);

  const data = await getOpsSnapshot();
  const isAr = locale === "ar";

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Shield className="w-5 h-5" aria-hidden />
          </span>
          <h1 className="display-h2 text-[28px] md:text-[36px] text-ink-900 leading-tight">
            {isAr ? "لوحة الإدارة" : "Ops Admin"}
          </h1>
        </div>
        <p className="text-[13.5px] text-ink-500">
          {isAr
            ? "نظرة شاملة على العيادات، المرضى، والحجوزات. أدوات سريعة للمراجعة والموافقة."
            : "Platform-wide overview of clinics, patients, and bookings. Approve / deny / publish."}
        </p>
      </header>

      {/* Headline counts */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountTile
          label={isAr ? "إجمالي العيادات" : "Total clinics"}
          value={data.counts.totalClinics}
          icon={<Building2 className="w-4 h-4" />}
        />
        <CountTile
          label={isAr ? "تحت المراجعة" : "Pending review"}
          value={data.counts.pendingClinics}
          icon={<Clock className="w-4 h-4" />}
          accent={data.counts.pendingClinics > 0 ? "amber" : "neutral"}
        />
        <CountTile
          label={isAr ? "منشورة" : "Published"}
          value={data.counts.publishedClinics}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="teal"
        />
        <CountTile
          label={isAr ? "إجمالي الدكاترة" : "Dentists"}
          value={data.counts.totalDentists}
          icon={<Stethoscope className="w-4 h-4" />}
        />
        <CountTile
          label={isAr ? "إجمالي المرضى" : "Patients"}
          value={data.counts.totalPatients}
          icon={<Users className="w-4 h-4" />}
        />
        <CountTile
          label={isAr ? "حجوزات (30 يوم)" : "Bookings (30d)"}
          value={data.counts.bookingsLast30}
          icon={<Calendar className="w-4 h-4" />}
        />
        <CountTile
          label={isAr ? "تقييمات" : "Reviews"}
          value={data.counts.totalReviews}
          icon={<Star className="w-4 h-4" />}
        />
        <CountTile
          label={isAr ? "اشتراك شهري" : "MRR"}
          value={data.counts.monthlyRecurringEgp}
          icon={<Repeat className="w-4 h-4" />}
          format="currency"
          accent="teal"
        />
      </section>

      {/* Revenue strip */}
      <section className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 text-white p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 grid place-items-center">
            <Wallet className="w-5 h-5" aria-hidden />
          </span>
          <div>
            <div className="text-[12px] text-white/60 uppercase tracking-wider font-bold">
              {isAr ? "حجم العمليات (30 يوم)" : "Marketplace GMV · last 30 days"}
            </div>
            <div className="font-display text-[26px] md:text-[32px] font-bold tabular-nums">
              {data.counts.revenueLast30Egp.toLocaleString()} <span className="text-[14px] text-white/60 font-medium">EGP</span>
            </div>
          </div>
        </div>
        <div className="text-[12px] text-white/60 max-w-[40ch] leading-snug">
          {isAr
            ? "إجمالي رسوم الكشف من الزيارات المكتملة. الدفع بيتم في العيادة — Dental Map مش بتقبض."
            : "Sum of consultation fees on completed visits. Patients pay the clinic — Dental Map does not collect."}
        </div>
      </section>

      {/* Pending review queue */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] md:text-[24px] font-bold text-ink-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" aria-hidden />
            {isAr ? "تحت المراجعة" : "Pending review"}
            <span className="text-[14px] font-medium text-ink-500">
              ({data.pending.length})
            </span>
          </h2>
        </header>
        {data.pending.length === 0 ? (
          <div className="rounded-xl border border-ink-100 bg-white p-6 text-center text-[13px] text-ink-500">
            {isAr ? "لا يوجد عيادات تحت المراجعة." : "Nothing waiting for review."}
          </div>
        ) : (
          <div className="space-y-3">
            {data.pending.map((c) => (
              <ClinicCard key={c.id} c={c} isAr={isAr} highlight />
            ))}
          </div>
        )}
      </section>

      {/* All other clinics */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] md:text-[24px] font-bold text-ink-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" aria-hidden />
            {isAr ? "كل العيادات" : "All clinics"}
            <span className="text-[14px] font-medium text-ink-500">
              ({data.others.length})
            </span>
          </h2>
        </header>
        <div className="space-y-3">
          {data.others.map((c) => (
            <ClinicCard key={c.id} c={c} isAr={isAr} />
          ))}
        </div>
      </section>

      {/* Recent bookings feed */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] md:text-[24px] font-bold text-ink-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" aria-hidden />
            {isAr ? "أحدث الحجوزات" : "Recent bookings"}
            <span className="text-[14px] font-medium text-ink-500">
              ({data.recentBookings.length})
            </span>
          </h2>
        </header>
        {data.recentBookings.length === 0 ? (
          <div className="rounded-xl border border-ink-100 bg-white p-6 text-center text-[13px] text-ink-500">
            {isAr ? "لا توجد حجوزات بعد." : "No bookings yet."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
            <table className="w-full text-[13px] text-ink-800">
              <thead className="bg-ink-50/60 text-[11.5px] font-bold uppercase text-ink-500 tracking-wider">
                <tr>
                  <th className="text-start px-3 py-2.5">{isAr ? "الميعاد" : "When"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "العيادة" : "Clinic"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "الدكتور" : "Dentist"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "المريض" : "Patient"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "السعر" : "Fee"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((b) => (
                  <tr key={b.id} className="border-t border-ink-100">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {new Date(b.slotStart).toLocaleString(locale, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Cairo",
                      })}
                    </td>
                    <td className="px-3 py-2.5">{b.clinicNameEn}</td>
                    <td className="px-3 py-2.5">{b.dentistNameEn}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{b.patientName}</div>
                      <a
                        href={`tel:${b.patientPhone}`}
                        className="text-[11.5px] text-teal-700 hover:underline"
                      >
                        {b.patientPhone}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      {b.feeEgp} <span className="text-[10px] text-ink-400">EGP</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={b.status} isAr={isAr} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Patients */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] md:text-[24px] font-bold text-ink-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" aria-hidden />
            {isAr ? "المرضى" : "Patients"}
            <span className="text-[14px] font-medium text-ink-500">
              ({data.patients.length}{data.counts.totalPatients > data.patients.length ? ` ${isAr ? "من" : "of"} ${data.counts.totalPatients}` : ""})
            </span>
          </h2>
        </header>
        {data.patients.length === 0 ? (
          <div className="rounded-xl border border-ink-100 bg-white p-6 text-center text-[13px] text-ink-500">
            {isAr ? "لسه مفيش مرضى." : "No patients yet."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
            <table className="w-full text-[13px] text-ink-800">
              <thead className="bg-ink-50/60 text-[11.5px] font-bold uppercase text-ink-500 tracking-wider">
                <tr>
                  <th className="text-start px-3 py-2.5">{isAr ? "الاسم" : "Name"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "إيميل" : "Email"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "موبايل" : "Phone"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "حجوزات" : "Bookings"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "آخر زيارة" : "Last visit"}</th>
                  <th className="text-start px-3 py-2.5">{isAr ? "سجّل" : "Joined"}</th>
                </tr>
              </thead>
              <tbody>
                {data.patients.map((p) => (
                  <tr key={p.id} className="border-t border-ink-100">
                    <td className="px-3 py-2.5 font-medium">{p.fullName ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[12px] text-ink-600">{p.email ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[12px]">
                      {p.phone ? (
                        <a href={`tel:${p.phone}`} className="text-teal-700 hover:underline">
                          {p.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{p.bookingCount}</td>
                    <td className="px-3 py-2.5 text-[12px]">
                      {p.lastBookingAt
                        ? new Date(p.lastBookingAt).toLocaleDateString(locale, {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-ink-500">
                      {new Date(p.createdAt).toLocaleDateString(locale, {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent reviews */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] md:text-[24px] font-bold text-ink-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" aria-hidden />
            {isAr ? "أحدث التقييمات" : "Recent reviews"}
            <span className="text-[14px] font-medium text-ink-500">
              ({data.recentReviews.length})
            </span>
          </h2>
        </header>
        {data.recentReviews.length === 0 ? (
          <div className="rounded-xl border border-ink-100 bg-white p-6 text-center text-[13px] text-ink-500">
            {isAr ? "لسه مفيش تقييمات." : "No reviews yet."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.recentReviews.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-ink-100 bg-white p-3.5 md:p-4"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${r.rating} of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5"
                        fill={i < r.rating ? "currentColor" : "none"}
                        aria-hidden
                      />
                    ))}
                  </span>
                  <span className="text-[12.5px] font-bold text-ink-800">
                    {r.patientName}
                  </span>
                  <span className="text-[11.5px] text-ink-400">·</span>
                  <span className="text-[12px] text-ink-600">
                    {r.dentistNameEn} · {r.clinicNameEn}
                  </span>
                  <span className="text-[11.5px] text-ink-400 ms-auto">
                    {new Date(r.createdAt).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-[13px] text-ink-700 leading-[1.55]">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Calendar health */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] md:text-[24px] font-bold text-ink-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-600" aria-hidden />
            {isAr ? "حالة التقاويم" : "Calendar health"}
            <span className="text-[14px] font-medium text-ink-500">
              ({data.calendarHealth.length})
            </span>
          </h2>
        </header>
        {data.calendarHealth.length === 0 ? (
          <div className="rounded-xl border border-ink-100 bg-white p-6 text-center text-[13px] text-ink-500">
            {isAr ? "لسه مفيش دكاترة منشورين." : "No published dentists yet."}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {data.calendarHealth.map((c) => (
              <div
                key={c.dentistId}
                className="rounded-xl border border-ink-100 bg-white p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[13px] text-ink-900 truncate">
                    {c.dentistName}
                  </div>
                  <div className="text-[11.5px] text-ink-500 truncate">
                    {c.clinicName}
                  </div>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                    c.mode === "google"
                      ? "bg-teal-100 text-teal-800"
                      : "bg-ink-100 text-ink-700"
                  }`}
                >
                  {c.mode === "google"
                    ? isAr ? "Google Calendar" : "Google"
                    : isAr ? "يدوي" : "Manual"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CountTile({
  label,
  value,
  icon,
  accent = "neutral",
  format = "number",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "neutral" | "teal" | "amber";
  format?: "number" | "currency";
}) {
  const accentBg =
    accent === "teal"
      ? "bg-teal-50 text-teal-700 border-teal-200"
      : accent === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-white text-ink-700 border-ink-100";
  return (
    <div className={`rounded-xl border ${accentBg} p-3.5 shadow-card`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-70">
        {icon}
        {label}
      </div>
      <div className="font-display text-[24px] font-bold mt-1 tabular-nums">
        {value.toLocaleString()}
        {format === "currency" && (
          <span className="text-[12px] font-medium ms-1 opacity-60">EGP</span>
        )}
      </div>
    </div>
  );
}

function ClinicCard({
  c,
  isAr,
  highlight = false,
}: {
  c: import("@/lib/ops/data").OpsClinicRow;
  isAr: boolean;
  highlight?: boolean;
}) {
  const tierLabel =
    c.subscriptionTier && c.subscriptionPackage
      ? `T${c.subscriptionTier} · ${c.subscriptionPackage}`
      : "—";
  const monthly = c.subscriptionMonthlyEgp
    ? `${c.subscriptionMonthlyEgp.toLocaleString()} EGP/mo`
    : "—";

  return (
    <div
      className={`rounded-xl border-2 p-4 md:p-5 ${
        highlight
          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white"
          : "border-ink-100 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-[16px] md:text-[17px] font-bold text-ink-900">
              {isAr ? c.nameAr : c.nameEn}
            </h3>
            <StatusBadge status={c.verificationStatus} isAr={isAr} />
            {c.isPublished && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                {isAr ? "ظاهرة" : "Published"}
              </span>
            )}
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 font-mono">
              {tierLabel}
            </span>
          </div>
          <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] text-ink-600">
            {c.areaNameEn && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ink-400" aria-hidden />
                {c.areaNameEn}
              </div>
            )}
            {c.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-ink-400" aria-hidden />
                <a href={`tel:${c.phone}`} className="hover:underline">
                  {c.phone}
                </a>
              </div>
            )}
            {c.whatsapp && (
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-ink-400" aria-hidden />
                <a
                  href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {c.whatsapp}
                </a>
              </div>
            )}
            {c.googleMapsUrl && (
              <div className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-ink-400" aria-hidden />
                <a
                  href={c.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 hover:underline truncate"
                >
                  {isAr ? "افتح في الخريطة" : "Open in Google Maps"}
                </a>
              </div>
            )}
            <div className="text-ink-500">
              {c.ownerName ?? "—"}{" "}
              {c.ownerEmail && <span className="text-ink-400">· {c.ownerEmail}</span>}
            </div>
            <div className="text-ink-500">
              {c.dentistCount} {isAr ? "دكتور" : "dentists"} · {c.bookingCount}{" "}
              {isAr ? "حجز" : "bookings"} · {monthly}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <ClinicRowActions
            clinicId={c.id}
            verificationStatus={c.verificationStatus}
            isPublished={c.isPublished}
            isAr={isAr}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  isAr,
}: {
  status: "pending" | "approved" | "denied";
  isAr: boolean;
}) {
  const map = {
    pending: {
      bg: "bg-amber-100 text-amber-800",
      label: isAr ? "تحت المراجعة" : "Pending",
    },
    approved: {
      bg: "bg-teal-100 text-teal-800",
      label: isAr ? "موافق" : "Approved",
    },
    denied: {
      bg: "bg-rose-100 text-rose-800",
      label: isAr ? "مرفوض" : "Denied",
    },
  } as const;
  const m = map[status];
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${m.bg}`}>
      {m.label}
    </span>
  );
}

function StatusPill({
  status,
  isAr,
}: {
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  isAr: boolean;
}) {
  const map = {
    pending: { bg: "bg-amber-100 text-amber-800", label: isAr ? "مستني" : "Pending" },
    confirmed: { bg: "bg-teal-100 text-teal-800", label: isAr ? "مؤكد" : "Confirmed" },
    completed: { bg: "bg-emerald-100 text-emerald-800", label: isAr ? "تم" : "Completed" },
    cancelled: { bg: "bg-ink-100 text-ink-600", label: isAr ? "ملغي" : "Cancelled" },
    no_show: { bg: "bg-rose-100 text-rose-800", label: isAr ? "مجاش" : "No-show" },
  } as const;
  const m = map[status];
  return (
    <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold ${m.bg}`}>
      {m.label}
    </span>
  );
}
