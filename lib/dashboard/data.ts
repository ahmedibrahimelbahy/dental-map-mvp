import { createAdminClient } from "@/lib/supabase/admin";

/* ── public types ──────────────────────────────────────────────────────── */

export type AppointmentLite = {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  slotStartIso: string;
  slotEndIso: string;
  feeEgp: number;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  dentistId: string;
  dentistNameAr: string;
  dentistNameEn: string;
};

export type DentistLite = {
  id: string;
  nameAr: string;
  nameEn: string;
  initials: string;
};

export type Kpi = { value: number; deltaPct: number | null };

export type LeaderboardRow = {
  dentistId: string;
  nameAr: string;
  nameEn: string;
  initials: string;
  bookingsThisWeek: number;
  revenueThisWeek: number;
  filledPct: number;
};

export type ActionItem =
  | { kind: "unconfirmed"; appointmentId: string; patientName: string; patientPhone: string; slotStartIso: string }
  | { kind: "no_show"; appointmentId: string; patientName: string; slotStartIso: string };

export type CalendarHealthRow = {
  dentistId: string;
  nameAr: string;
  nameEn: string;
  mode: "google" | "manual";
  lastSyncedAt: string | null;
};

export type DashboardData = {
  clinicCount: number;
  dentists: DentistLite[];
  todayAppointments: AppointmentLite[];
  kpis: {
    weekBookings: Kpi;
    weekRevenue: Kpi;
    filledPct: Kpi;
    weekNoShows: Kpi;
  };
  leaderboard: LeaderboardRow[];
  actionQueue: ActionItem[];
  calendarHealth: CalendarHealthRow[];
};

/* ── helpers ───────────────────────────────────────────────────────────── */

const CAIRO_TZ = "Africa/Cairo";

function startOfDayCairo(d: Date): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const ymd = fmt.format(d); // "YYYY-MM-DD"
  return new Date(`${ymd}T00:00:00+02:00`);
}

function startOfWeekCairo(d: Date): Date {
  // Week starts Sunday (day 0) — Egyptian convention
  const local = startOfDayCairo(d);
  const dayOfWeek = local.getUTCDay(); // we anchored at midnight Cairo, so UTC day reflects local day reasonably
  const result = new Date(local);
  result.setUTCDate(local.getUTCDate() - dayOfWeek);
  return result;
}

function makeInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

/* ── working_hours helper (compute weekly open hours from JSONB) ──────── */
type WorkingHoursDay = {
  day: number;
  start: string;
  end: string;
  breaks?: { start: string; end: string }[];
};

function totalWeeklyHours(workingHours: WorkingHoursDay[]): number {
  let total = 0;
  for (const wh of workingHours) {
    total += diffHours(wh.start, wh.end);
    for (const b of wh.breaks ?? []) total -= diffHours(b.start, b.end);
  }
  return total;
}

function diffHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

/* ── main fetcher ──────────────────────────────────────────────────────── */

export async function getDashboardData(profileId: string): Promise<DashboardData> {
  const admin = createAdminClient();

  // 1. Clinics this admin manages
  const { data: clinicAdminRows } = await admin
    .from("clinic_admins")
    .select("clinic_id")
    .eq("profile_id", profileId)
    .returns<{ clinic_id: string }[]>();
  const clinicIds = (clinicAdminRows ?? []).map((r) => r.clinic_id);

  if (clinicIds.length === 0) {
    return emptyDashboard();
  }

  // 2. clinic_dentists for those clinics (dentist link, fee, working hours)
  type CD = {
    id: string;
    dentist_id: string;
    fee_egp: number;
    working_hours: WorkingHoursDay[];
    dentist: { id: string; name_ar: string; name_en: string } | null;
  };
  const { data: cdRows } = await admin
    .from("clinic_dentists")
    .select(
      `id, dentist_id, fee_egp, working_hours,
       dentist:dentists!inner(id, name_ar, name_en)`
    )
    .in("clinic_id", clinicIds)
    .eq("is_active", true)
    .returns<CD[]>();

  const clinicDentists = (cdRows ?? []).filter((r) => r.dentist);
  const clinicDentistIds = clinicDentists.map((cd) => cd.id);

  // Build dentist lookup
  const dentistMap = new Map<string, DentistLite>();
  const weeklyOpenHoursPerDentist = new Map<string, number>();
  for (const cd of clinicDentists) {
    const d = cd.dentist!;
    dentistMap.set(d.id, {
      id: d.id,
      nameAr: d.name_ar,
      nameEn: d.name_en,
      initials: makeInitials(d.name_en),
    });
    weeklyOpenHoursPerDentist.set(
      d.id,
      (weeklyOpenHoursPerDentist.get(d.id) ?? 0) + totalWeeklyHours(cd.working_hours ?? [])
    );
  }
  const dentists = Array.from(dentistMap.values());

  if (clinicDentistIds.length === 0) {
    return { ...emptyDashboard(), clinicCount: clinicIds.length };
  }

  // 3. Time bounds — week, prev week, today
  const now = new Date();
  const weekStart = startOfWeekCairo(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const todayStart = startOfDayCairo(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayStart.getUTCDate() + 1);
  const tomorrowStart = todayEnd;
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setUTCDate(tomorrowStart.getUTCDate() + 1);

  // 4. Pull this week's + last week's appointments in one shot
  type ApptRow = {
    id: string;
    status: AppointmentLite["status"];
    slot_start: string;
    slot_end: string;
    fee_at_booking_egp: number;
    patient_phone: string;
    patient_id: string;
    clinic_dentist_id: string;
    clinic_dentist: {
      dentist_id: string;
      dentist: { id: string; name_ar: string; name_en: string } | null;
    } | null;
  };
  const { data: apptRows } = await admin
    .from("appointments")
    .select(
      `id, status, slot_start, slot_end, fee_at_booking_egp, patient_phone, patient_id, clinic_dentist_id,
       clinic_dentist:clinic_dentists!inner(
         dentist_id,
         dentist:dentists(id, name_ar, name_en)
       )`
    )
    .in("clinic_dentist_id", clinicDentistIds)
    .gte("slot_start", prevWeekStart.toISOString())
    .lt("slot_start", tomorrowEnd.toISOString())
    .order("slot_start", { ascending: true })
    .returns<ApptRow[]>();

  const allAppointments = apptRows ?? [];

  // Resolve patient names
  const patientIds = Array.from(new Set(allAppointments.map((a) => a.patient_id)));
  const { data: profiles } = patientIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", patientIds)
        .returns<{ id: string; full_name: string | null }[]>()
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? "—"])
  );

  // Map row → AppointmentLite
  const toLite = (a: ApptRow): AppointmentLite => ({
    id: a.id,
    status: a.status,
    slotStartIso: a.slot_start,
    slotEndIso: a.slot_end,
    feeEgp: a.fee_at_booking_egp,
    patientName: nameById.get(a.patient_id) ?? "—",
    patientPhone: a.patient_phone,
    patientEmail: null,
    dentistId: a.clinic_dentist?.dentist_id ?? "",
    dentistNameAr: a.clinic_dentist?.dentist?.name_ar ?? "—",
    dentistNameEn: a.clinic_dentist?.dentist?.name_en ?? "—",
  });

  const allLite = allAppointments.map(toLite);

  // 5. Slice into today / this week / last week
  const inRange = (a: AppointmentLite, from: Date, to: Date) => {
    const t = new Date(a.slotStartIso).getTime();
    return t >= from.getTime() && t < to.getTime();
  };
  const todayAppointments = allLite.filter((a) => inRange(a, todayStart, todayEnd));
  const thisWeek = allLite.filter((a) => inRange(a, weekStart, weekEnd));
  const lastWeek = allLite.filter((a) => inRange(a, prevWeekStart, weekStart));
  const tomorrow = allLite.filter((a) => inRange(a, tomorrowStart, tomorrowEnd));

  // 6. KPIs
  const isCounted = (a: AppointmentLite) =>
    a.status === "confirmed" || a.status === "completed" || a.status === "pending";

  const weekBookingCount = thisWeek.filter(isCounted).length;
  const lastBookingCount = lastWeek.filter(isCounted).length;
  const weekRevenue = thisWeek.filter(isCounted).reduce((s, a) => s + a.feeEgp, 0);
  const lastRevenue = lastWeek.filter(isCounted).reduce((s, a) => s + a.feeEgp, 0);

  const weekFilledHours = thisWeek
    .filter(isCounted)
    .reduce(
      (s, a) =>
        s + (new Date(a.slotEndIso).getTime() - new Date(a.slotStartIso).getTime()) / 3_600_000,
      0
    );
  const totalOpenHoursWeek = Array.from(weeklyOpenHoursPerDentist.values()).reduce((s, n) => s + n, 0);
  const filledPct = totalOpenHoursWeek > 0 ? Math.round((weekFilledHours / totalOpenHoursWeek) * 100) : 0;

  const lastFilledHours = lastWeek
    .filter(isCounted)
    .reduce(
      (s, a) =>
        s + (new Date(a.slotEndIso).getTime() - new Date(a.slotStartIso).getTime()) / 3_600_000,
      0
    );
  const lastFilledPct = totalOpenHoursWeek > 0 ? Math.round((lastFilledHours / totalOpenHoursWeek) * 100) : 0;

  const weekNoShows = thisWeek.filter((a) => a.status === "no_show").length;
  const lastNoShows = lastWeek.filter((a) => a.status === "no_show").length;

  // 7. Leaderboard (per-dentist this week)
  const leaderboard: LeaderboardRow[] = dentists
    .map<LeaderboardRow>((d) => {
      const dWeek = thisWeek.filter((a) => a.dentistId === d.id && isCounted(a));
      const filled =
        dWeek.reduce(
          (s, a) =>
            s + (new Date(a.slotEndIso).getTime() - new Date(a.slotStartIso).getTime()) / 3_600_000,
          0
        );
      const open = weeklyOpenHoursPerDentist.get(d.id) ?? 0;
      return {
        dentistId: d.id,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        initials: d.initials,
        bookingsThisWeek: dWeek.length,
        revenueThisWeek: dWeek.reduce((s, a) => s + a.feeEgp, 0),
        filledPct: open > 0 ? Math.round((filled / open) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenueThisWeek - a.revenueThisWeek);

  // 8. Action queue
  const actionQueue: ActionItem[] = [];
  for (const a of tomorrow) {
    if (a.status === "pending") {
      actionQueue.push({
        kind: "unconfirmed",
        appointmentId: a.id,
        patientName: a.patientName,
        patientPhone: a.patientPhone,
        slotStartIso: a.slotStartIso,
      });
    }
  }
  for (const a of todayAppointments) {
    const past = new Date(a.slotEndIso).getTime() < now.getTime();
    if (past && a.status === "confirmed") {
      actionQueue.push({
        kind: "no_show",
        appointmentId: a.id,
        patientName: a.patientName,
        slotStartIso: a.slotStartIso,
      });
    }
  }

  // 9. Calendar health
  type Cal = { dentist_id: string; last_synced_at: string | null };
  const dIds = dentists.map((d) => d.id);
  const { data: cals } = dIds.length
    ? await admin
        .from("dentist_calendars")
        .select("dentist_id, last_synced_at")
        .in("dentist_id", dIds)
        .returns<Cal[]>()
    : { data: [] as Cal[] };
  const calMap = new Map<string, Cal>((cals ?? []).map((c) => [c.dentist_id, c]));

  // dentist mode (google vs manual) lives on clinic_dentists.calendar_mode — pick max
  type CDmode = { dentist_id: string; calendar_mode: "google" | "manual" };
  const { data: cdModes } = await admin
    .from("clinic_dentists")
    .select("dentist_id, calendar_mode")
    .in("clinic_id", clinicIds)
    .eq("is_active", true)
    .returns<CDmode[]>();
  const modeMap = new Map<string, "google" | "manual">();
  for (const m of cdModes ?? []) {
    if (m.calendar_mode === "google") modeMap.set(m.dentist_id, "google");
    else if (!modeMap.has(m.dentist_id)) modeMap.set(m.dentist_id, "manual");
  }

  const calendarHealth: CalendarHealthRow[] = dentists.map((d) => ({
    dentistId: d.id,
    nameAr: d.nameAr,
    nameEn: d.nameEn,
    mode: modeMap.get(d.id) ?? "manual",
    lastSyncedAt: calMap.get(d.id)?.last_synced_at ?? null,
  }));

  return {
    clinicCount: clinicIds.length,
    dentists,
    todayAppointments,
    kpis: {
      weekBookings: { value: weekBookingCount, deltaPct: deltaPct(weekBookingCount, lastBookingCount) },
      weekRevenue: { value: weekRevenue, deltaPct: deltaPct(weekRevenue, lastRevenue) },
      filledPct: { value: filledPct, deltaPct: deltaPct(filledPct, lastFilledPct) },
      weekNoShows: { value: weekNoShows, deltaPct: deltaPct(weekNoShows, lastNoShows) },
    },
    leaderboard,
    actionQueue,
    calendarHealth,
  };
}

function emptyDashboard(): DashboardData {
  return {
    clinicCount: 0,
    dentists: [],
    todayAppointments: [],
    kpis: {
      weekBookings: { value: 0, deltaPct: null },
      weekRevenue: { value: 0, deltaPct: null },
      filledPct: { value: 0, deltaPct: null },
      weekNoShows: { value: 0, deltaPct: null },
    },
    leaderboard: [],
    actionQueue: [],
    calendarHealth: [],
  };
}
