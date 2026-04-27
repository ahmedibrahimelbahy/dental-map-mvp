import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkingHoursEditor } from "@/components/dashboard/working-hours-editor";
import { GcalConnectionCard } from "@/components/dashboard/gcal-connection-card";
import { CalendarModePicker } from "@/components/dashboard/calendar-mode-picker";
import type { CalendarMode, WorkingHoursDay } from "@/lib/supabase/types";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ gcal?: string }>;
}) {
  const { locale } = await params;
  const { gcal } = await searchParams;
  setRequestLocale(locale);
  const user = await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  const admin = createAdminClient();

  type CD = {
    id: string;
    clinic_id: string;
    dentist_id: string;
    slot_minutes: number;
    working_hours: WorkingHoursDay[];
    calendar_mode: CalendarMode;
  };

  const { data: clinicAdmins } = await admin
    .from("clinic_admins")
    .select("clinic_id")
    .eq("profile_id", user.id)
    .returns<{ clinic_id: string }[]>();
  const clinicIds = clinicAdmins?.map((c) => c.clinic_id) ?? [];

  const { data: clinicDentists } = clinicIds.length
    ? await admin
        .from("clinic_dentists")
        .select("id, clinic_id, dentist_id, slot_minutes, working_hours, calendar_mode")
        .in("clinic_id", clinicIds)
        .returns<CD[]>()
    : { data: [] as CD[] };

  const primary = clinicDentists?.[0];
  const mode: CalendarMode = primary?.calendar_mode ?? "google";

  const { data: calendar } =
    primary && mode === "google"
      ? await admin
          .from("dentist_calendars")
          .select("google_calendar_id, last_synced_at")
          .eq("dentist_id", primary.dentist_id)
          .returns<{
            google_calendar_id: string;
            last_synced_at: string | null;
          }[]>()
          .maybeSingle()
      : { data: null };

  const statusMap: Record<string, { tone: "ok" | "warn" | "error"; key: string }> =
    {
      connected: { tone: "ok", key: "gcalStatus_connected" },
      denied: { tone: "error", key: "gcalStatus_denied" },
      bad_state: { tone: "error", key: "gcalStatus_bad_state" },
      state_mismatch: { tone: "error", key: "gcalStatus_state_mismatch" },
      no_refresh: { tone: "error", key: "gcalStatus_no_refresh" },
    };
  const flash = gcal && statusMap[gcal] ? statusMap[gcal] : null;

  return (
    <div className="space-y-10">
      {flash && (
        <div
          className={`rounded-xl px-4 py-3 text-[13.5px] border ${
            flash.tone === "ok"
              ? "border-teal-200 bg-teal-50 text-teal-800"
              : "border-coral-500/40 bg-coral-100/60 text-ink-900"
          }`}
        >
          {t(flash.key as "gcalStatus_connected")}
        </div>
      )}

      {primary && (
        <CalendarModePicker
          clinicDentistId={primary.id}
          current={mode}
          t={{
            title: t("modePickerTitle"),
            subtitle: t("modePickerSubtitle"),
            googleTitle: t("modeGoogleTitle"),
            googleBody: t("modeGoogleBody"),
            manualTitle: t("modeManualTitle"),
            manualBody: t("modeManualBody"),
            recommended: t("modeRecommended"),
            selected: t("modeSelected"),
            switchTo: t("modeSwitchTo"),
          }}
        />
      )}

      {primary && mode === "google" && (
        <GcalConnectionCard
          dentistId={primary.dentist_id}
          connected={!!calendar}
          googleCalendarId={calendar?.google_calendar_id ?? null}
          lastSyncedAt={calendar?.last_synced_at ?? null}
          locale={locale}
          t={{
            explainTitle: t("gcalExplainTitle"),
            explainBody: t("gcalExplainBody"),
            connected: t("gcalConnected"),
            notConnected: t("gcalNotConnected"),
            connect: t("gcalConnect"),
            disconnect: t("gcalDisconnect"),
          }}
        />
      )}

      {primary && mode === "manual" && (
        <div className="rounded-xl border border-ink-100 bg-surface px-5 py-4 text-[13.5px] text-ink-600">
          {t("modeManualExplain")}
        </div>
      )}

      {primary && (
        <WorkingHoursEditor
          clinicDentistId={primary.id}
          initialWorkingHours={
            (primary.working_hours as unknown as WorkingHoursDay[]) ?? []
          }
          initialSlotMinutes={primary.slot_minutes ?? 30}
          t={{
            title: t("workingHoursTitle"),
            subtitle: t("workingHoursSubtitle"),
            save: t("workingHoursSave"),
            saved: t("workingHoursSaved"),
            open: t("open"),
            closed: t("closed"),
            start: t("dayStart"),
            end: t("dayEnd"),
            slotLength: t("slotLength"),
            minutes: t("minutes"),
            days: [0, 1, 2, 3, 4, 5, 6].map((i) => t(`day${i}` as "day0")),
          }}
        />
      )}

      {!primary && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7">
          <p className="text-[14.5px] leading-[1.6] text-ink-600 max-w-[60ch]">
            {t("clinicPlaceholder")}
          </p>
        </div>
      )}
    </div>
  );
}
