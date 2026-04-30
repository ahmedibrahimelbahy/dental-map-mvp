import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/data";
import { TodayScheduleTile } from "@/components/dashboard/bento/today-schedule";
import { KpiTile } from "@/components/dashboard/bento/kpi-tile";
import { LeaderboardTile } from "@/components/dashboard/bento/leaderboard-tile";
import { ActionQueueTile } from "@/components/dashboard/bento/action-queue-tile";
import { CalendarHealthTile } from "@/components/dashboard/bento/calendar-health-tile";

export const dynamic = "force-dynamic";

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  const data = await getDashboardData(user.id);
  const firstName = user.profile.full_name?.split(" ")[0] ?? "";

  // Empty state — no clinic linked yet
  if (data.clinicCount === 0) {
    return (
      <div>
        <h1 className="display-h2 text-[30px] md:text-[40px] text-ink-900 mb-6">
          {t("welcome", { name: firstName })}
        </h1>
        <div className="rounded-2xl border border-ink-100 bg-white p-7">
          <p className="text-[14.5px] leading-[1.65] text-ink-600 max-w-[60ch]">
            {t("clinicPlaceholder")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 md:mb-10">
        <h1 className="display-h2 text-[28px] md:text-[36px] text-ink-900 leading-tight mb-1">
          {t("welcome", { name: firstName })}
        </h1>
        <p className="text-[13.5px] text-ink-500">
          {locale === "ar"
            ? "نظرة سريعة على عيادتك اليوم."
            : "A quick read on your clinic today."}
        </p>
      </header>

      {/* ── Bento grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* Today's schedule — 7 cols on desktop, full on mobile */}
        <div className="col-span-12 lg:col-span-7">
          <TodayScheduleTile
            dentists={data.dentists}
            appointments={data.todayAppointments}
            locale={locale}
            todayLabel={t("bentoToday")}
            emptyLabel={t("bentoTodayEmpty")}
          />
        </div>

        {/* 4 KPI tiles — 5 cols on desktop, 2x2 grid */}
        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-3 md:gap-4">
          <KpiTile
            label={t("bentoKpiWeekBookings")}
            kpi={data.kpis.weekBookings}
            tone="good-up"
          />
          <KpiTile
            label={t("bentoKpiRevenue")}
            kpi={data.kpis.weekRevenue}
            format="currency"
            tone="good-up"
          />
          <KpiTile
            label={t("bentoKpiFilled")}
            kpi={data.kpis.filledPct}
            format="percent"
            tone="good-up"
          />
          <KpiTile
            label={t("bentoKpiNoShow")}
            kpi={data.kpis.weekNoShows}
            tone="good-down"
          />
        </div>

        {/* Leaderboard — full width */}
        <div className="col-span-12">
          <LeaderboardTile
            rows={data.leaderboard}
            locale={locale}
            title={t("bentoLeaderboard")}
            emptyLabel={t("bentoLeaderboardEmpty")}
          />
        </div>

        {/* Action queue — 7 cols */}
        <div className="col-span-12 lg:col-span-7">
          <ActionQueueTile
            items={data.actionQueue}
            locale={locale}
            title={t("bentoActions")}
            emptyLabel={t("bentoActionsEmpty")}
          />
        </div>

        {/* Calendar health — 5 cols */}
        <div className="col-span-12 lg:col-span-5">
          <CalendarHealthTile
            rows={data.calendarHealth}
            locale={locale}
            title={t("bentoCalHealth")}
            manualLabel={t("bentoCalManual")}
            manageLabel={t("bentoCalManage")}
          />
        </div>
      </div>
    </div>
  );
}
