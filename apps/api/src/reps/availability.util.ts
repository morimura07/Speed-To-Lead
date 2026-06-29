import { z } from 'zod';

/** A working window within a day, "HH:MM"–"HH:MM" (24h). */
export interface TimeWindow {
  start: string;
  end: string;
}

/** Weekly schedule keyed by weekday 0 (Sun) – 6 (Sat). Empty = always available. */
export type WeekSchedule = Record<string, TimeWindow[]>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const windowSchema = z
  .object({ start: z.string().regex(HHMM), end: z.string().regex(HHMM) })
  .refine((w) => toMinutes(w.start) < toMinutes(w.end), {
    message: 'window start must be before end',
  });

const scheduleSchema = z.record(z.string().regex(/^[0-6]$/), z.array(windowSchema));
const daysOffSchema = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

/** Validate + normalize an incoming weekly schedule (throws on bad shape). */
export function validateSchedule(value: unknown): WeekSchedule {
  return scheduleSchema.parse(value);
}

/** Validate + normalize an incoming days-off list (throws on bad shape). */
export function validateDaysOff(value: unknown): string[] {
  return daysOffSchema.parse(value);
}

/** Lenient parse of trusted DB JSON into a schedule. */
export function parseSchedule(value: unknown): WeekSchedule {
  const result = scheduleSchema.safeParse(value);
  return result.success ? result.data : {};
}

export function parseDaysOff(value: unknown): string[] {
  const result = daysOffSchema.safeParse(value);
  return result.success ? result.data : [];
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The local weekday, minutes-of-day, and date string for an instant in a tz. */
export function localParts(now: Date, timeZone: string): {
  weekday: number;
  minutes: number;
  date: string;
} {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    // Unknown timezone → fall back to UTC.
    return localParts(now, 'UTC');
  }

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = WEEKDAY_INDEX[get('weekday')] ?? 0;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return { weekday, minutes, date };
}

/**
 * Is a rep available at `now`, given their weekly schedule, days off, and
 * timezone? An empty schedule means "always available" (preserves the default
 * behavior for reps without a configured schedule).
 */
export function isAvailableAt(
  schedule: WeekSchedule,
  daysOff: string[],
  timeZone: string,
  now: Date,
): boolean {
  const { weekday, minutes, date } = localParts(now, timeZone);
  if (daysOff.includes(date)) return false;
  if (Object.keys(schedule).length === 0) return true;

  const windows = schedule[String(weekday)] ?? [];
  return windows.some((w) => minutes >= toMinutes(w.start) && minutes < toMinutes(w.end));
}
