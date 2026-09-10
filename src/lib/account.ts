import "server-only";
import { prisma } from "./prisma";
import { monthRange } from "./time-zone";
import { groupByDay } from "./time-entry-view";
import {
  monthAccount,
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
  type: "VACATION" | "SICK" | "OTHER";
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
