import { TZDate } from "@date-fns/tz";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  format,
  startOfDay,
} from "date-fns";
import { de } from "date-fns/locale";

/** Zeitzone des Betriebs – alle Anzeigen und Tageszuordnungen laufen hierüber. */
export const TZ = "Europe/Berlin";

/**
 * Wandelt die Eingabe eines <input type="datetime-local"> (lokale Wandzeit
 * ohne Zeitzone, z. B. "2026-09-09T08:00") in einen echten UTC-Zeitpunkt um,
 * interpretiert als Berliner Zeit (DST-korrekt).
 */
export function localInputToDate(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const tz = new TZDate(y, mo - 1, d, h, mi, 0, 0, TZ);
  const date = new Date(tz.getTime());
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date -> "2026-09-09T08:00" in Berliner Zeit (für datetime-local defaultValue). */
export function dateToLocalInput(date: Date): string {
  return format(new TZDate(date, TZ), "yyyy-MM-dd'T'HH:mm");
}

/** "Mo., 09.09.2026" */
export function formatDay(date: Date): string {
  return format(new TZDate(date, TZ), "EEE, dd.MM.yyyy", { locale: de });
}

/** "08:00" */
export function formatTime(date: Date): string {
  return format(new TZDate(date, TZ), "HH:mm");
}

/** "September 2026" */
export function formatMonth(date: Date): string {
  return format(new TZDate(date, TZ), "LLLL yyyy", { locale: de });
}

/** Tagesschlüssel in Berliner Zeit, z. B. "2026-09-09" – zum Gruppieren. */
export function dayKey(date: Date): string {
  return format(new TZDate(date, TZ), "yyyy-MM-dd");
}

/**
 * UTC-Grenzen eines Monats (Berliner Zeit). `monthParam` ist "yyyy-MM" oder leer
 * für den aktuellen Monat.
 */
export function monthRange(monthParam?: string): {
  start: Date;
  end: Date;
  key: string;
  prev: string;
  next: string;
  ref: Date;
} {
  const base =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? new TZDate(
          Number(monthParam.slice(0, 4)),
          Number(monthParam.slice(5, 7)) - 1,
          1,
          TZ,
        )
      : new TZDate(new Date(), TZ);

  const start = new Date(startOfMonth(base).getTime());
  const end = new Date(endOfMonth(base).getTime());
  return {
    start,
    end,
    ref: new Date(base.getTime()),
    key: format(base, "yyyy-MM"),
    prev: format(addMonths(base, -1), "yyyy-MM"),
    next: format(addMonths(base, 1), "yyyy-MM"),
  };
}

export { startOfDay };
