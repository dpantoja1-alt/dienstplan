import type { TimeEntry } from "@prisma/client";
import {
  effectiveBreakMinutes,
  grossMinutes,
  netWorkedMinutes,
} from "./worktime";
import {
  dateToLocalInput,
  dayKey,
  formatDay,
  formatTime,
} from "./time-zone";

export type ViewEntry = {
  id: string;
  userId: string;
  startISO: string;
  endISO: string | null;
  startTime: string;
  endTime: string | null;
  startInput: string;
  endInput: string | null;
  breakOverride: number | null;
  effectiveBreak: number | null;
  grossMinutes: number | null;
  netMinutes: number | null;
  note: string | null;
  source: "CLOCK" | "MANUAL";
  status: "PENDING" | "CONFIRMED";
  correctionNote: string | null;
  running: boolean;
};

export function toViewEntry(
  entry: TimeEntry,
  minBreakMinutes: number,
): ViewEntry {
  const running = entry.end === null;
  const gross = entry.end ? grossMinutes(entry.start, entry.end) : null;
  const effBreak =
    entry.end != null
      ? effectiveBreakMinutes(gross ?? 0, minBreakMinutes, entry.breakMinutes)
      : null;
  const net =
    entry.end != null
      ? netWorkedMinutes(
          entry.start,
          entry.end,
          minBreakMinutes,
          entry.breakMinutes,
        )
      : null;

  return {
    id: entry.id,
    userId: entry.userId,
    startISO: entry.start.toISOString(),
    endISO: entry.end?.toISOString() ?? null,
    startTime: formatTime(entry.start),
    endTime: entry.end ? formatTime(entry.end) : null,
    startInput: dateToLocalInput(entry.start),
    endInput: entry.end ? dateToLocalInput(entry.end) : null,
    breakOverride: entry.breakMinutes,
    effectiveBreak: effBreak,
    grossMinutes: gross,
    netMinutes: net,
    note: entry.note,
    source: entry.source,
    status: entry.status,
    correctionNote: entry.correctionNote,
    running,
  };
}

export type DayGroup = {
  key: string;
  label: string;
  entries: ViewEntry[];
  netMinutes: number;
};

/** Gruppiert Einträge nach Tag (Berliner Zeit), absteigend. */
export function groupByDay(
  entries: TimeEntry[],
  minBreakMinutes: number,
): { days: DayGroup[]; totalNet: number } {
  const map = new Map<string, DayGroup>();

  for (const entry of entries) {
    const key = dayKey(entry.start);
    let group = map.get(key);
    if (!group) {
      group = { key, label: formatDay(entry.start), entries: [], netMinutes: 0 };
      map.set(key, group);
    }
    const view = toViewEntry(entry, minBreakMinutes);
    group.entries.push(view);
    group.netMinutes += view.netMinutes ?? 0;
  }

  const days = [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  for (const d of days) d.entries.sort((a, b) => (a.startISO < b.startISO ? -1 : 1));
  const totalNet = days.reduce((s, d) => s + d.netMinutes, 0);
  return { days, totalNet };
}
