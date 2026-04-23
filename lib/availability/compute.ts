import type {
  BusyInterval,
  ComputeSlotsInput,
  OpenSlot,
  WorkingHours,
} from "./types";

/**
 * Compute open booking slots for a dentist.
 *
 *   working_hours(day-of-week, local time)
 *   minus busy(UTC intervals from Google Calendar)
 *   = open_slots(UTC intervals)
 *
 * Pure function. No I/O. Heavily unit-testable.
 */
export function computeSlots(input: ComputeSlotsInput): OpenSlot[] {
  const {
    workingHours,
    busy,
    slotMinutes,
    from,
    to,
    timeZone,
    leadTimeMinutes = 60,
  } = input;

  if (slotMinutes <= 0) throw new Error("slotMinutes must be > 0");

  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    throw new Error("from/to must be valid ISO timestamps");
  }
  if (toMs <= fromMs) return [];

  const leadCutoffMs = Date.now() + leadTimeMinutes * 60_000;

  // Build a lookup day-of-week → hour block(s)
  const byDow = new Map<number, WorkingHours[]>();
  for (const wh of workingHours) {
    const list = byDow.get(wh.day) ?? [];
    list.push(wh);
    byDow.set(wh.day, list);
  }

  // Merge busy intervals so we can do a linear sweep
  const merged = mergeBusy(busy);

  const slots: OpenSlot[] = [];
  const slotMs = slotMinutes * 60_000;

  // Iterate day by day in the clinic's timezone
  for (
    let cursor = startOfDayInTz(fromMs, timeZone);
    cursor < toMs;
    cursor = addDays(cursor, 1, timeZone)
  ) {
    const dow = getDayOfWeekInTz(cursor, timeZone);
    const blocks = byDow.get(dow);
    if (!blocks) continue;

    for (const block of blocks) {
      const blockStart = combineDateAndTime(cursor, block.start, timeZone);
      const blockEnd = combineDateAndTime(cursor, block.end, timeZone);

      // Apply breaks as internal busy intervals (translated to UTC ms)
      const internalBreaks =
        block.breaks?.map<BusyInterval>((b) => ({
          start: new Date(
            combineDateAndTime(cursor, b.start, timeZone)
          ).toISOString(),
          end: new Date(
            combineDateAndTime(cursor, b.end, timeZone)
          ).toISOString(),
        })) ?? [];
      const allBusy = mergeBusy([...merged, ...internalBreaks]);

      for (
        let slotStart = blockStart;
        slotStart + slotMs <= blockEnd;
        slotStart += slotMs
      ) {
        const slotEnd = slotStart + slotMs;

        // Keep inside the requested window
        if (slotEnd <= fromMs) continue;
        if (slotStart >= toMs) break;

        // Respect minimum lead time
        if (slotStart < leadCutoffMs) continue;

        // Skip if any busy interval overlaps
        if (overlapsAny(slotStart, slotEnd, allBusy)) continue;

        slots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }
    }
  }

  return slots;
}

// ─── helpers ────────────────────────────────────────────────────────────

function mergeBusy(busy: BusyInterval[]): BusyInterval[] {
  if (busy.length === 0) return [];
  const parsed = busy
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const out: { start: number; end: number }[] = [];
  for (const b of parsed) {
    const last = out[out.length - 1];
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      out.push({ ...b });
    }
  }
  return out.map((b) => ({
    start: new Date(b.start).toISOString(),
    end: new Date(b.end).toISOString(),
  }));
}

function overlapsAny(
  slotStart: number,
  slotEnd: number,
  busy: BusyInterval[]
): boolean {
  for (const b of busy) {
    const bStart = Date.parse(b.start);
    const bEnd = Date.parse(b.end);
    if (slotStart < bEnd && slotEnd > bStart) return true;
  }
  return false;
}

/**
 * Returns a UTC timestamp representing 00:00 on the same calendar date as `ms`
 * interpreted in `timeZone`.
 */
function startOfDayInTz(ms: number, timeZone: string): number {
  const parts = getDateParts(ms, timeZone);
  // Re-assemble as UTC then correct by the TZ offset at that wall-clock time
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  const offset = getTzOffsetMinutes(utcGuess, timeZone);
  return utcGuess - offset * 60_000;
}

function addDays(ms: number, days: number, timeZone: string): number {
  const parts = getDateParts(ms, timeZone);
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day + days,
    0,
    0,
    0,
    0
  );
  const offset = getTzOffsetMinutes(utcGuess, timeZone);
  return utcGuess - offset * 60_000;
}

function getDayOfWeekInTz(ms: number, timeZone: string): number {
  const parts = getDateParts(ms, timeZone);
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day)
  ).getUTCDay();
}

function combineDateAndTime(
  dayStartMs: number,
  hhmm: string,
  timeZone: string
): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const parts = getDateParts(dayStartMs, timeZone);
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, h, m, 0, 0);
  const offset = getTzOffsetMinutes(utcGuess, timeZone);
  return utcGuess - offset * 60_000;
}

function getDateParts(
  ms: number,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  return {
    year: parseInt(parts.year!, 10),
    month: parseInt(parts.month!, 10),
    day: parseInt(parts.day!, 10),
    hour: parseInt(parts.hour!, 10) % 24,
    minute: parseInt(parts.minute!, 10),
  };
}

function getTzOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = getDateParts(utcMs, timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0
  );
  return Math.round((asIfUtc - utcMs) / 60_000);
}
