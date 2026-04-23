import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/routing";
import { CalendarDays, CircleCheck, CircleAlert, ArrowRight } from "lucide-react";

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  // Find dentists this admin manages (via clinic_admins → clinic_dentists → dentists)
  const admin = createAdminClient();
  const { data: clinicAdmins } = await admin
    .from("clinic_admins")
    .select("clinic_id")
    .eq("profile_id", user.id)
    .returns<{ clinic_id: string }[]>();
  const clinicIds = clinicAdmins?.map((c) => c.clinic_id) ?? [];

  const { data: clinicDentists } = clinicIds.length
    ? await admin
        .from("clinic_dentists")
        .select("dentist_id")
        .in("clinic_id", clinicIds)
        .returns<{ dentist_id: string }[]>()
    : { data: [] as { dentist_id: string }[] };
  const dentistIds = clinicDentists?.map((c) => c.dentist_id) ?? [];

  const { data: calendars } = dentistIds.length
    ? await admin
        .from("dentist_calendars")
        .select("dentist_id")
        .in("dentist_id", dentistIds)
        .returns<{ dentist_id: string }[]>()
    : { data: [] as { dentist_id: string }[] };
  const connectedCount = calendars?.length ?? 0;

  return (
    <div>
      <h1 className="display-h2 text-[30px] md:text-[40px] text-ink-900 mb-8">
        {t("welcome", { name: user.profile.full_name.split(" ")[0] })}
      </h1>

      <div className="grid md:grid-cols-3 gap-4 md:gap-5 mb-10">
        <MetricCard label={t("todayBookings")} value="0" />
        <MetricCard label={t("weekBookings")} value="0" />
        <MetricCard
          label={
            connectedCount > 0 ? t("gcalConnected") : t("gcalNotConnected")
          }
          value={`${connectedCount}/${dentistIds.length || 0}`}
          tone={connectedCount > 0 ? "ok" : "warn"}
        />
      </div>

      {/* Quick action: connect GCal if needed */}
      {dentistIds.length > 0 && connectedCount < dentistIds.length && (
        <Link
          href="/dashboard/calendar"
          className="group rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 md:p-7 flex items-center justify-between gap-6 shadow-card hover:shadow-card-hover transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" aria-hidden />
            </span>
            <div>
              <div className="font-display text-[18px] font-bold text-ink-900 mb-1">
                {t("gcalExplainTitle")}
              </div>
              <p className="text-[14px] leading-[1.6] text-ink-500 max-w-[60ch]">
                {t("gcalExplainBody")}
              </p>
            </div>
          </div>
          <ArrowRight
            className="w-5 h-5 text-teal-600 shrink-0 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
            aria-hidden
          />
        </Link>
      )}

      {dentistIds.length === 0 && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7">
          <p className="text-[14.5px] leading-[1.6] text-ink-600 max-w-[60ch]">
            {t("clinicPlaceholder")}
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const Icon =
    tone === "ok" ? CircleCheck : tone === "warn" ? CircleAlert : null;
  const iconColor =
    tone === "ok"
      ? "text-teal-500"
      : tone === "warn"
        ? "text-coral-500"
        : "text-ink-400";

  return (
    <div className="rounded-2xl bg-white border border-ink-100 p-5 md:p-6 shadow-card">
      <div className="flex items-center gap-2 mb-2 small-caps text-ink-400">
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden />}
        {label}
      </div>
      <div className="font-display text-[28px] md:text-[32px] font-bold text-ink-900 tracking-tight2">
        {value}
      </div>
    </div>
  );
}
