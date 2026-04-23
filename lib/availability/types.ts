export type WorkingHours = {
  /** 0 = Sunday, 6 = Saturday (matches JS Date.getDay) */
  day: number;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  breaks?: { start: string; end: string }[];
};

export type BusyInterval = {
  /** ISO 8601 UTC */
  start: string;
  end: string;
};

export type OpenSlot = {
  /** ISO 8601 UTC */
  start: string;
  end: string;
};

export type ComputeSlotsInput = {
  /** Day-of-week working hours configured by the dentist. */
  workingHours: WorkingHours[];
  /** Existing calendar events that block slots (from Google Calendar free/busy). */
  busy: BusyInterval[];
  /** Slot length in minutes. Must evenly divide working-hours blocks. */
  slotMinutes: number;
  /** Compute slots from this instant (inclusive). ISO 8601 UTC. */
  from: string;
  /** Compute slots up to this instant (exclusive). ISO 8601 UTC. */
  to: string;
  /** IANA timezone of the clinic (e.g. "Africa/Cairo"). */
  timeZone: string;
  /** Minimum notice in minutes before a slot can be booked (default 60). */
  leadTimeMinutes?: number;
};
