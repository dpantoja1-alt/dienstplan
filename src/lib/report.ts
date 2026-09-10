import "server-only";
import { format } from "date-fns";
import { de } from "date-fns/locale";

import { prisma } from "./prisma";
import { monthRange, dayKey as tzDayKey } from "./time-zone";
import { toViewEntry } from "./time-entry-view";
import { nrwHolidayName } from "./holidays";
import {
  dailySollMinutes,
  isWorkday,
  iterateDayKeys,
  monthRangeKeys,
} from "./soll";
import { getCumulativeBalance } from "./account";
import { formatShiftRange, minutesToHHMM } from "./shift";

export type ReportDay = {
  key: string;
  weekday: string;
  isWorkday: boolean;
  holiday: string | null;
  planned: string[]; // "Früh 06:00–14:00"
  worked: { from: string; to: string; breakMinutes: number; netMinutes: number }[];
  workedMinutes: number;
  absence: { type: "VACATION" | "SICK" | "OTHER"; halfDay: boolean } | null;
  sollMinutes: number;
  creditedMinutes: number;
};

export type MonthReport = {
  user: { id: string; name: string; email: string; weeklyHours: number; workDaysPerWeek: number };
  year: number;
  month1: number;
  monthLabel: string;
  days: ReportDay[];
  totals: {
    workdays: number;
    sollMinutes: number;
    workedMinutes: number;
    creditedMinutes: number;
    absenceDays: number;
    balanceMinutes: number;
    adjustmentMinutes: number; // Auszahlungen / Korrekturen im Monat
    cumulativeMinutes: number;
    pendingEntries: number;
  };
};

const absenceTypeMap = { VACATION: "VACATION", SICK: "SICK", OTHER: "OTHER" } as const;

export async function getMonthReport(
  userId: string,
  year: number,
  month1: number,
): Promise<MonthReport> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      weeklyHours: true,
      workDaysPerWeek: true,
      minBreakMinutes: true,
      employmentStart: true,
    },
  });

  const { start: startKey, end: endKey } = monthRangeKeys(year, month1);
  const tz = monthRange(`${year}-${String(month1).padStart(2, "0")}`);
  const startDate = new Date(`${startKey}T00:00:00.000Z`);
  const endDate = new Date(`${endKey}T00:00:00.000Z`);

  const [entries, shifts, absences, pendingCount, adjustments] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId,
        status: "CONFIRMED",
        end: { not: null },
        start: { gte: tz.start, lte: tz.end },
      },
      orderBy: { start: "asc" },
    }),
    prisma.shift.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { startMinutes: "asc" },
    }),
    prisma.absence.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { type: true, startDate: true, endDate: true, halfDay: true },
    }),
    prisma.timeEntry.count({
      where: { userId, status: "PENDING", end: { not: null }, start: { gte: tz.start, lte: tz.end } },
    }),
    prisma.balanceAdjustment.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { minutes: true },
    }),
  ]);

  const adjustmentMinutes = adjustments.reduce((s, a) => s + a.minutes, 0);

  const daily = dailySollMinutes(user.weeklyHours, user.workDaysPerWeek);

  // Zeiteinträge nach Berliner Tag
  const workedByDay = new Map<string, ReportDay["worked"]>();
  for (const e of entries) {
    const v = toViewEntry(e, user.minBreakMinutes);
    const k = tzDayKey(e.start);
    const arr = workedByDay.get(k) ?? [];
    arr.push({
      from: v.startTime,
      to: v.endTime ?? "",
      breakMinutes: v.effectiveBreak ?? 0,
      netMinutes: v.netMinutes ?? 0,
    });
    workedByDay.set(k, arr);
  }

  // Schichten nach Tag
  const plannedByDay = new Map<string, string[]>();
  for (const s of shifts) {
    const k = s.date.toISOString().slice(0, 10);
    const arr = plannedByDay.get(k) ?? [];
    arr.push(`${s.label} ${formatShiftRange(s.startMinutes, s.endMinutes)}`);
    plannedByDay.set(k, arr);
  }

  // Abwesenheit nach Tag
  const absenceByDay = new Map<string, { type: "VACATION" | "SICK" | "OTHER"; halfDay: boolean }>();
  for (const a of absences) {
    const from = a.startDate.toISOString().slice(0, 10);
    const to = a.endDate.toISOString().slice(0, 10);
    const single = from === to;
    for (const k of iterateDayKeys(from < startKey ? startKey : from, to > endKey ? endKey : to)) {
      if (!isWorkday(k)) continue;
      absenceByDay.set(k, { type: absenceTypeMap[a.type], halfDay: a.halfDay && single });
    }
  }

  const days: ReportDay[] = iterateDayKeys(startKey, endKey).map((k) => {
    const workday = isWorkday(k);
    const worked = workedByDay.get(k) ?? [];
    const workedMinutes = worked.reduce((s, w) => s + w.netMinutes, 0);
    const absence = absenceByDay.get(k) ?? null;
    const soll = workday ? daily : 0;
    const creditFactor = absence ? (absence.halfDay ? 0.5 : 1) : 0;
    const credited = workday ? Math.round(creditFactor * daily) : 0;
    return {
      key: k,
      weekday: format(new Date(`${k}T00:00:00.000Z`), "EEEEEE", { locale: de }),
      isWorkday: workday,
      holiday: nrwHolidayName(k),
      planned: plannedByDay.get(k) ?? [],
      worked,
      workedMinutes,
      absence,
      sollMinutes: soll,
      creditedMinutes: credited,
    };
  });

  const workdays = days.filter((d) => d.isWorkday).length;
  const sollMinutes = days.reduce((s, d) => s + d.sollMinutes, 0);
  const workedMinutes = days.reduce((s, d) => s + d.workedMinutes, 0);
  const creditedMinutes = days.reduce((s, d) => s + d.creditedMinutes, 0);
  const absenceDays = days.reduce(
    (s, d) => s + (d.absence ? (d.absence.halfDay ? 0.5 : 1) : 0),
    0,
  );

  let fromY = year;
  let fromM = 1;
  if (user.employmentStart) {
    const ey = user.employmentStart.getUTCFullYear();
    const em = user.employmentStart.getUTCMonth() + 1;
    if (ey >= 2026) { fromY = ey; fromM = em; }
  }
  if (fromY > year || (fromY === year && fromM > month1)) { fromY = year; fromM = month1; }
  const cumulativeMinutes = await getCumulativeBalance(userId, fromY, fromM, year, month1);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      weeklyHours: user.weeklyHours,
      workDaysPerWeek: user.workDaysPerWeek,
    },
    year,
    month1,
    monthLabel: format(new Date(Date.UTC(year, month1 - 1, 1)), "LLLL yyyy", { locale: de }),
    days,
    totals: {
      workdays,
      sollMinutes,
      workedMinutes,
      creditedMinutes,
      absenceDays,
      balanceMinutes: workedMinutes + creditedMinutes - sollMinutes,
      adjustmentMinutes,
      cumulativeMinutes,
      pendingEntries: pendingCount,
    },
  };
}

/* --------------------------------------------------------------------- CSV */

export function reportToCsv(report: MonthReport): string {
  const dec = (min: number) => (min / 60).toFixed(2).replace(".", ",");
  const rows: string[][] = [
    ["Stundennachweis", report.user.name, report.monthLabel],
    [],
    ["Datum", "Tag", "Geplant", "Gearbeitet", "Pause (Min)", "Netto (h)", "Soll (h)", "Abwesenheit", "Feiertag"],
  ];

  for (const d of report.days) {
    const worked = d.worked.map((w) => `${w.from}-${w.to}`).join(" / ");
    const pause = d.worked.reduce((s, w) => s + w.breakMinutes, 0);
    const abs = d.absence
      ? d.absence.type === "VACATION"
        ? d.absence.halfDay ? "Urlaub ½" : "Urlaub"
        : d.absence.type === "SICK" ? "Krank" : "Sonstiges"
      : "";
    rows.push([
      format(new Date(`${d.key}T00:00:00.000Z`), "dd.MM.yyyy"),
      d.weekday,
      d.planned.join(" / "),
      worked,
      pause ? String(pause) : "",
      d.workedMinutes ? dec(d.workedMinutes) : "",
      d.sollMinutes ? dec(d.sollMinutes) : "",
      abs,
      d.holiday ?? "",
    ]);
  }

  const t = report.totals;
  rows.push([]);
  rows.push(["Summe Soll (h)", dec(t.sollMinutes)]);
  rows.push(["Summe Ist gearbeitet (h)", dec(t.workedMinutes)]);
  rows.push(["Urlaub/Krank gutgeschrieben (h)", dec(t.creditedMinutes)]);
  rows.push(["Saldo Monat (h)", dec(t.balanceMinutes)]);
  if (t.adjustmentMinutes !== 0) {
    rows.push(["Überstunden ausgezahlt / Korrektur (h)", dec(t.adjustmentMinutes)]);
  }
  rows.push(["Saldo gesamt (h)", dec(t.cumulativeMinutes)]);

  return rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
}

/** Team-Übersicht: eine Zeile je Mitarbeiter. */
export async function teamCsv(year: number, month1: number): Promise<string> {
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true },
  });

  const dec = (min: number) => (min / 60).toFixed(2).replace(".", ",");
  const monthLabel = format(new Date(Date.UTC(year, month1 - 1, 1)), "LLLL yyyy", { locale: de });
  const rows: string[][] = [
    ["Monatsübersicht", monthLabel],
    [],
    ["Mitarbeiter", "Soll (h)", "Ist gearbeitet (h)", "Gutschrift Urlaub/Krank (h)", "Saldo Monat (h)", "Saldo gesamt (h)", "Abwesenheitstage"],
  ];

  for (const u of users) {
    const r = await getMonthReport(u.id, year, month1);
    rows.push([
      r.user.name,
      dec(r.totals.sollMinutes),
      dec(r.totals.workedMinutes),
      dec(r.totals.creditedMinutes),
      dec(r.totals.balanceMinutes),
      dec(r.totals.cumulativeMinutes),
      String(r.totals.absenceDays),
    ]);
  }

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
}

export { minutesToHHMM };
