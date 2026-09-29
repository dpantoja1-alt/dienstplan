import "server-only";
import { prisma } from "./prisma";
import type { AbsenceKind } from "./absence-types";
import { monthRange, dayKey } from "./time-zone";
import { groupByDay } from "./time-entry-view";
import {
  monthAccount,
  periodAccount,
  monthRangeKeys,
  vacationEntitlement,
  absenceWorkdays,
  type AbsenceSpan,
  type MonthAccount,
} from "./soll";

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type AbsenceRow = {
  type: AbsenceKind;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
};

function toSpans(rows: AbsenceRow[]): AbsenceSpan[] {
  return rows.map((a) => ({
    type: a.type,
    startKey: toKey(a.startDate),
    endKey: toKey(a.endDate),
    halfDay: a.halfDay,
  }));
}

/** Stundenkonto eines Mitarbeiters für einen Monat. */
export async function getMonthAccount(
  userId: string,
  year: number,
  month1: number,
): Promise<MonthAccount> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { weeklyHours: true, workDaysPerWeek: true, minBreakMinutes: true },
  });

  const { start, end } = monthRangeKeys(year, month1);
  const tzMonth = monthRange(`${year}-${String(month1).padStart(2, "0")}`);

  const [absences, entries, adjustments] = await Promise.all([
    prisma.absence.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: new Date(`${end}T00:00:00.000Z`) },
        endDate: { gte: new Date(`${start}T00:00:00.000Z`) },
      },
      select: { type: true, startDate: true, endDate: true, halfDay: true },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId,
        status: "CONFIRMED",
        end: { not: null },
        start: { gte: tzMonth.start, lte: tzMonth.end },
      },
    }),
    prisma.balanceAdjustment.findMany({
      where: {
        userId,
        date: {
          gte: new Date(`${start}T00:00:00.000Z`),
          lte: new Date(`${end}T00:00:00.000Z`),
        },
      },
      select: { minutes: true },
    }),
  ]);

  const { totalNet } = groupByDay(entries, user.minBreakMinutes);
  const adjustmentMinutes = adjustments.reduce((s, a) => s + a.minutes, 0);

  return monthAccount({
    year,
    month1,
    weeklyHours: user.weeklyHours,
    workDaysPerWeek: user.workDaysPerWeek,
    absences: toSpans(absences),
    workedMinutes: totalNet,
    adjustmentMinutes,
  });
}

/** Laufender Saldo von `fromMonth1` bis einschließlich `toYear`/`toMonth1`. */
export async function getCumulativeBalance(
  userId: string,
  fromYear: number,
  fromMonth1: number,
  toYear: number,
  toMonth1: number,
): Promise<number> {
  let sum = 0;
  let y = fromYear;
  let m = fromMonth1;
  while (y < toYear || (y === toYear && m <= toMonth1)) {
    const acc = await getMonthAccount(userId, y, m);
    sum += acc.balanceWithAdjustmentsMinutes;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return sum;
}

export type VacationSummary = {
  entitlement: number;
  taken: number; // genehmigt
  pending: number; // beantragt, noch offen
  remaining: number;
};

export async function getVacationSummary(
  userId: string,
  year: number,
): Promise<VacationSummary> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { vacationDaysPerYear: true, employmentStart: true },
  });

  const yStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yEnd = new Date(`${year}-12-31T00:00:00.000Z`);

  const absences = await prisma.absence.findMany({
    where: {
      userId,
      type: "VACATION",
      status: { in: ["APPROVED", "PENDING"] },
      startDate: { lte: yEnd },
      endDate: { gte: yStart },
    },
    select: { status: true, startDate: true, endDate: true, halfDay: true, type: true },
  });

  const spanOf = (a: (typeof absences)[number]): AbsenceSpan => ({
    type: "VACATION",
    startKey: toKey(a.startDate),
    endKey: toKey(a.endDate),
    halfDay: a.halfDay,
  });

  const taken = absenceWorkdays(
    absences.filter((a) => a.status === "APPROVED").map(spanOf),
    `${year}-01-01`,
    `${year}-12-31`,
  );
  const pending = absenceWorkdays(
    absences.filter((a) => a.status === "PENDING").map(spanOf),
    `${year}-01-01`,
    `${year}-12-31`,
  );

  const entitlement = vacationEntitlement(
    user.vacationDaysPerYear,
    user.employmentStart,
    year,
  );

  return {
    entitlement,
    taken,
    pending,
    remaining: entitlement - taken,
  };
}

/**
 * Beginn des kumulierten Saldos: Eintrittsmonat (frühestens 01/2026),
 * ohne Eintrittsdatum Januar des Bezugsjahres.
 */
export function balanceStartMonth(
  employmentStart: Date | null,
  year: number,
): { year: number; month1: number } {
  if (!employmentStart) return { year, month1: 1 };
  const ey = employmentStart.getUTCFullYear();
  if (ey < 2026) return { year: 2026, month1: 1 };
  return { year: ey, month1: employmentStart.getUTCMonth() + 1 };
}

/** tracked = im Zeitraum wurden Zeiten erfasst (sonst ist der Saldo nicht aussagekräftig). */
export type BalanceUntil = { minutes: number; fromKey: string; tracked: boolean };

/**
 * Kumulierter Saldo („Stundenstand“) mehrerer Mitarbeiter bis einschließlich
 * `untilKey` (yyyy-MM-dd). Volle Monate wie im Stundenkonto, der letzte Monat
 * nur bis zum Stichtag – so verzerrt das Soll des laufenden Monats nicht.
 */
export async function getBalancesUntil(
  userIds: string[],
  untilKey: string,
): Promise<Map<string, BalanceUntil>> {
  const result = new Map<string, BalanceUntil>();
  if (userIds.length === 0) return result;
  const untilYear = Number(untilKey.slice(0, 4));

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      weeklyHours: true,
      workDaysPerWeek: true,
      minBreakMinutes: true,
      employmentStart: true,
    },
  });
  const startOf = new Map(
    users.map((u) => {
      const s = balanceStartMonth(u.employmentStart, untilYear);
      return [u.id, `${s.year}-${String(s.month1).padStart(2, "0")}-01`];
    }),
  );
  const earliest = [...startOf.values()].sort()[0];
  const earliestDate = new Date(`${earliest}T00:00:00.000Z`);
  const untilDate = new Date(`${untilKey}T00:00:00.000Z`);

  const [absences, entries, adjustments] = await Promise.all([
    prisma.absence.findMany({
      where: { userId: { in: userIds }, status: "APPROVED", startDate: { lte: untilDate }, endDate: { gte: earliestDate } },
      select: { userId: true, type: true, startDate: true, endDate: true, halfDay: true },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: { in: userIds },
        status: "CONFIRMED",
        end: { not: null },
        // großzügig laden, genau gefiltert wird über den Berliner Tagesschlüssel
        start: { gte: new Date(earliestDate.getTime() - 86400000), lte: new Date(untilDate.getTime() + 2 * 86400000) },
      },
    }),
    prisma.balanceAdjustment.findMany({
      where: { userId: { in: userIds }, date: { gte: earliestDate, lte: untilDate } },
      select: { userId: true, date: true, minutes: true },
    }),
  ]);

  for (const u of users) {
    const fromKey = startOf.get(u.id)!;
    if (fromKey > untilKey) {
      result.set(u.id, { minutes: 0, fromKey, tracked: false });
      continue;
    }
    const spans = toSpans(absences.filter((a) => a.userId === u.id));
    const own = entries.filter((e) => {
      if (e.userId !== u.id) return false;
      const k = dayKey(e.start);
      return k >= fromKey && k <= untilKey;
    });
    const ownAdj = adjustments.filter((a) => a.userId === u.id);

    let sum = 0;
    let y = Number(fromKey.slice(0, 4));
    let m = Number(fromKey.slice(5, 7));
    for (;;) {
      const { start, end } = monthRangeKeys(y, m);
      const last = end < untilKey ? end : untilKey;
      const monthKey = start.slice(0, 7);
      const { totalNet } = groupByDay(
        own.filter((e) => dayKey(e.start).startsWith(monthKey)),
        u.minBreakMinutes,
      );
      const adjustmentMinutes = ownAdj
        .filter((a) => toKey(a.date).startsWith(monthKey))
        .reduce((s, a) => s + a.minutes, 0);
      sum += periodAccount({
        startKey: start,
        endKey: last,
        weeklyHours: u.weeklyHours,
        workDaysPerWeek: u.workDaysPerWeek,
        absences: spans,
        workedMinutes: totalNet,
        adjustmentMinutes,
      }).balanceWithAdjustmentsMinutes;
      if (last === untilKey) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    result.set(u.id, { minutes: sum, fromKey, tracked: own.length > 0 });
  }
  return result;
}

export type YearOverviewRow = {
  month1: number;
  toDate: boolean; // laufender Monat, nur bis gestern gerechnet
  soll: number;
  worked: number;
  credited: number;
  adjustment: number;
  balance: number; // Saldo Monat inkl. Korrekturen
  cumulative: number; // laufender Saldo seit Beginn
};

/**
 * Jahresübersicht des Stundenkontos: je Monat Soll, Ist, Gutschrift, Korrektur und
 * laufender Saldo. Monate vor Beginn und in der Zukunft entfallen, der laufende
 * Monat zählt bis gestern. `carry` = Saldo aus Vorjahren.
 */
export async function getYearOverview(
  userId: string,
  year: number,
  todayKey: string,
): Promise<{ carry: number; fromKey: string; rows: YearOverviewRow[] }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { weeklyHours: true, workDaysPerWeek: true, minBreakMinutes: true, employmentStart: true },
  });
  const s = balanceStartMonth(user.employmentStart, year);
  const fromKey = `${s.year}-${String(s.month1).padStart(2, "0")}-01`;
  const yesterdayKey = new Date(new Date(`${todayKey}T00:00:00.000Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  const yStart = `${year}-01-01`;
  const lastKey = [`${year}-12-31`, yesterdayKey].sort()[0];
  const firstKey = [yStart, fromKey].sort()[1];

  // Übertrag aus den Vorjahren
  const carry =
    fromKey < yStart
      ? ((await getBalancesUntil([userId], `${year - 1}-12-31`)).get(userId)?.minutes ?? 0)
      : 0;

  const rows: YearOverviewRow[] = [];
  if (firstKey > lastKey) return { carry, fromKey, rows };

  const firstDate = new Date(`${firstKey}T00:00:00.000Z`);
  const lastDate = new Date(`${lastKey}T00:00:00.000Z`);
  const [absences, entries, adjustments] = await Promise.all([
    prisma.absence.findMany({
      where: { userId, status: "APPROVED", startDate: { lte: lastDate }, endDate: { gte: firstDate } },
      select: { type: true, startDate: true, endDate: true, halfDay: true },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId,
        status: "CONFIRMED",
        end: { not: null },
        start: { gte: new Date(firstDate.getTime() - 86400000), lte: new Date(lastDate.getTime() + 2 * 86400000) },
      },
    }),
    prisma.balanceAdjustment.findMany({
      where: { userId, date: { gte: firstDate, lte: lastDate } },
      select: { date: true, minutes: true },
    }),
  ]);
  const spans = toSpans(absences);

  let cumulative = carry;
  for (let m = Number(firstKey.slice(5, 7)); m <= 12; m++) {
    const { start, end } = monthRangeKeys(year, m);
    if (start > lastKey) break;
    const from = start < firstKey ? firstKey : start;
    const to = end < lastKey ? end : lastKey;
    const monthKey = start.slice(0, 7);
    const { totalNet } = groupByDay(
      entries.filter((e) => {
        const k = dayKey(e.start);
        return k >= from && k <= to;
      }),
      user.minBreakMinutes,
    );
    const adjustmentMinutes = adjustments
      .filter((a) => toKey(a.date).startsWith(monthKey))
      .reduce((sum, a) => sum + a.minutes, 0);
    const acc = periodAccount({
      startKey: from,
      endKey: to,
      weeklyHours: user.weeklyHours,
      workDaysPerWeek: user.workDaysPerWeek,
      absences: spans,
      workedMinutes: totalNet,
      adjustmentMinutes,
    });
    cumulative += acc.balanceWithAdjustmentsMinutes;
    rows.push({
      month1: m,
      toDate: to < end,
      soll: acc.sollMinutes,
      worked: acc.workedMinutes,
      credited: acc.creditedMinutes,
      adjustment: acc.adjustmentMinutes,
      balance: acc.balanceWithAdjustmentsMinutes,
      cumulative,
    });
  }
  return { carry, fromKey, rows };
}
