import { addDays, startOfWeek, format } from "date-fns";
import { de } from "date-fns/locale";

/* --------------------------------------------------------------- Uhrzeiten */

/** 390 -> "06:30" */
export function minutesToHHMM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "06:30" -> 390, ungültig -> null */
export function hhmmToMinutes(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Dauer einer Schicht in Minuten – berücksichtigt Schichten über Mitternacht. */
export function shiftDurationMinutes(
  startMinutes: number,
  endMinutes: number,
  breakMinutes?: number | null,
): number {
  const span =
    endMinutes > startMinutes
      ? endMinutes - startMinutes
      : endMinutes + 1440 - startMinutes;
  return Math.max(0, span - (breakMinutes ?? 0));
}

/** "06:00–14:00" bzw. "22:00–06:00 (+1)" bei Schicht über Mitternacht */
export function formatShiftRange(startMinutes: number, endMinutes: number): string {
  const over = endMinutes <= startMinutes;
  return `${minutesToHHMM(startMinutes)}–${minutesToHHMM(endMinutes)}${over ? " (+1)" : ""}`;
}

/* ------------------------------------------------------------------ Wochen */

/** Reiner Kalendertag-String einer @db.Date (immer UTC-Basis). */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-09-08" -> Date um UTC-Mitternacht (für @db.Date-Speicherung). */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export type WeekInfo = {
  key: string; // Montag als "2026-09-08"
  days: { key: string; date: Date; label: string; weekday: string; isToday: boolean }[];
  prev: string;
  next: string;
  current: string;
  label: string; // "08.09. – 14.09.2026"
};

/** Woche (Mo–So) zu einem "yyyy-MM-dd"-Parameter oder der aktuellen Woche. */
export function weekInfo(weekParam?: string): WeekInfo {
  const base =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? dateFromKey(weekParam)
      : new Date();
  const monday = startOfWeek(base, { weekStartsOn: 1 });
  const mondayKey = format(monday, "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const key = format(d, "yyyy-MM-dd");
    return {
      key,
      date: dateFromKey(key),
      label: format(d, "dd.MM."),
      weekday: format(d, "EEEEEE", { locale: de }),
      isToday: key === todayKey,
    };
  });

  return {
    key: mondayKey,
    days,
    prev: format(addDays(monday, -7), "yyyy-MM-dd"),
    next: format(addDays(monday, 7), "yyyy-MM-dd"),
    current: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    label: `${days[0].label} – ${format(addDays(monday, 6), "dd.MM.yyyy")}`,
  };
}

/** Deutscher Wochentag + Datum, z. B. "Dienstag, 09.09.2026" */
export function formatFullDay(key: string): string {
  return format(dateFromKey(key), "EEEE, dd.MM.yyyy", { locale: de });
}
