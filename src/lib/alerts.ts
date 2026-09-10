import "server-only";
import { prisma } from "./prisma";
import { dayKey, localInputToDate } from "./time-zone";
import { minutesToHHMM, dateFromKey } from "./shift";

/** Puffer nach geplantem Schichtende, bevor gewarnt wird (Minuten). */
const GRACE_MINUTES = 15;
/** Ohne geplante Schicht: ab wie vielen Stunden Dauer wird gewarnt. */
const NO_SHIFT_HOURS = 10;

export type OverrunAlert = {
  userId: string;
  name: string;
  openSinceISO: string;
  runningMinutes: number;
  plannedEndLabel: string | null;
  overrunMinutes: number | null;
  kind: "over_shift" | "no_shift" | "since_earlier";
};

function nextDayKey(key: string): string {
  const d = dateFromKey(key);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Eingestempelte Mitarbeiter, deren geplante Zeit überschritten ist. */
export async function getOverrunAlerts(): Promise<OverrunAlert[]> {
  const open = await prisma.timeEntry.findMany({
    where: { end: null },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { start: "asc" },
  });
  if (open.length === 0) return [];

  const now = Date.now();
  const todayKey = dayKey(new Date());
  const alerts: OverrunAlert[] = [];

  for (const e of open) {
    const startKey = dayKey(e.start);
    const runningMinutes = Math.max(0, Math.floor((now - e.start.getTime()) / 60000));
    const base = {
      userId: e.userId,
      name: e.user.name,
      openSinceISO: e.start.toISOString(),
      runningMinutes,
    };

    if (startKey < todayKey) {
      alerts.push({ ...base, kind: "since_earlier", plannedEndLabel: null, overrunMinutes: null });
      continue;
    }

    const shifts = await prisma.shift.findMany({
      where: { userId: e.userId, date: dateFromKey(startKey) },
    });

    if (shifts.length === 0) {
      if (runningMinutes >= NO_SHIFT_HOURS * 60) {
        alerts.push({ ...base, kind: "no_shift", plannedEndLabel: null, overrunMinutes: null });
      }
      continue;
    }

    let latestEndMs = -Infinity;
    let latestEndMinutes = 0;
    for (const s of shifts) {
      const overnight = s.endMinutes <= s.startMinutes;
      const key = overnight ? nextDayKey(startKey) : startKey;
      const end = localInputToDate(`${key}T${minutesToHHMM(s.endMinutes)}`);
      if (end && end.getTime() > latestEndMs) {
        latestEndMs = end.getTime();
        latestEndMinutes = s.endMinutes;
      }
    }

    if (now > latestEndMs + GRACE_MINUTES * 60000) {
      alerts.push({
        ...base,
        kind: "over_shift",
        plannedEndLabel: minutesToHHMM(latestEndMinutes),
        overrunMinutes: Math.floor((now - latestEndMs) / 60000),
      });
    }
  }

  return alerts;
}

export function alertText(a: OverrunAlert): string {
  if (a.kind === "since_earlier") {
    return "seit einem früheren Tag noch eingestempelt – Ausstempeln vergessen?";
  }
  if (a.kind === "no_shift") {
    const h = Math.floor(a.runningMinutes / 60);
    return `läuft seit ${h} h ohne geplante Schicht – Überstunden oder Ausstempeln vergessen?`;
  }
  const m = a.overrunMinutes ?? 0;
  const dur = m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} Min` : `${m} Min`;
  return `${dur} über der geplanten Zeit (Ende ${a.plannedEndLabel}) – Überstunden oder Ausstempeln vergessen?`;
}
