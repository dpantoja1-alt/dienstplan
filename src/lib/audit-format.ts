import { ABSENCE_TYPES, type AbsenceKind } from "./absence-types";
import { dayKey, formatTime } from "./time-zone";

/** "2026-03-10" → "10.03.2026" */
export function fmtKey(key: string): string {
  return `${key.slice(8, 10)}.${key.slice(5, 7)}.${key.slice(0, 4)}`;
}

function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Datumsfeld (@db.Date) → "yyyy-MM-dd" */
export const dateKeyOf = key;

export type AbsenceSnapshot = {
  type: AbsenceKind;
  start: string;
  end: string;
  halfDay: boolean;
  status: string;
  note: string | null;
};

export function absenceSnapshot(a: {
  type: AbsenceKind;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  status: string;
  note: string | null;
}): AbsenceSnapshot {
  return {
    type: a.type,
    start: key(a.startDate),
    end: key(a.endDate),
    halfDay: a.halfDay,
    status: a.status,
    note: a.note,
  };
}

/** "Urlaub 10.03.2026–12.03.2026" bzw. "Krank 10.03.2026 (½ Tag)" */
export function absenceText(a: { type: AbsenceKind; start: string; end: string; halfDay: boolean }): string {
  const label = ABSENCE_TYPES[a.type].label;
  const range = a.start === a.end ? fmtKey(a.start) : `${fmtKey(a.start)}–${fmtKey(a.end)}`;
  return `${label} ${range}${a.halfDay ? " (½ Tag)" : ""}`;
}

export type TimeEntrySnapshot = {
  start: string; // ISO
  end: string | null;
  breakMinutes: number | null;
  note: string | null;
  status: string;
};

export function timeEntrySnapshot(e: {
  start: Date;
  end: Date | null;
  breakMinutes: number | null;
  note: string | null;
  status: string;
}): TimeEntrySnapshot {
  return {
    start: e.start.toISOString(),
    end: e.end?.toISOString() ?? null,
    breakMinutes: e.breakMinutes,
    note: e.note,
    status: e.status,
  };
}

/** "10.03.2026 08:00–16:30" (Berliner Zeit) */
export function timeEntryText(e: { start: string; end: string | null }): string {
  const s = new Date(e.start);
  const day = fmtKey(dayKey(s));
  return `${day} ${formatTime(s)}–${e.end ? formatTime(new Date(e.end)) : "läuft"}`;
}
