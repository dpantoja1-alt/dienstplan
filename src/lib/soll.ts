import { isNrwHoliday } from "./holidays";

/* --------------------------------------------------------------- Datums-Iteration */

export function iterateDayKeys(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  const d = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey}T00:00:00.000Z`);
  while (d.getTime() <= end.getTime()) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Mo–Fr (unabhängig von Feiertagen). */
export function isWeekday(dateKey: string): boolean {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

/** Ein regulärer Arbeitstag: Mo–Fr und kein NRW-Feiertag. */
export function isWorkday(dateKey: string): boolean {
  return isWeekday(dateKey) && !isNrwHoliday(dateKey);
}

export function countWorkdays(startKey: string, endKey: string): number {
  return iterateDayKeys(startKey, endKey).filter(isWorkday).length;
}

/* -------------------------------------------------------------------- Monat */

export function monthRangeKeys(year: number, month1: number): { start: string; end: string } {
  const start = `${year}-${String(month1).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const end = `${year}-${String(month1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

/* --------------------------------------------------------------- Sollzeit */

/** Sollminuten pro Arbeitstag = Wochenstunden ÷ Arbeitstage/Woche. */
export function dailySollMinutes(weeklyHours: number, workDaysPerWeek: number): number {
  if (workDaysPerWeek <= 0) return 0;
  return Math.round((weeklyHours * 60) / workDaysPerWeek);
}

export type AbsenceSpan = {
  type: "VACATION" | "SICK" | "OTHER";
  startKey: string;
  endKey: string;
  halfDay: boolean;
};

/**
 * Arbeitstage im Bereich, die von einer (genehmigten) Abwesenheit abgedeckt sind.
 * Halbe Tage zählen 0,5. Feiertage/Wochenenden zählen nicht.
 * `filterType` optional, um z. B. nur Urlaub zu zählen.
 */
export function absenceWorkdays(
  absences: AbsenceSpan[],
  rangeStartKey: string,
  rangeEndKey: string,
  filterType?: AbsenceSpan["type"],
): number {
  const covered = new Map<string, number>(); // dayKey -> 1 oder 0.5
  for (const a of absences) {
    if (filterType && a.type !== filterType) continue;
    const from = a.startKey > rangeStartKey ? a.startKey : rangeStartKey;
    const to = a.endKey < rangeEndKey ? a.endKey : rangeEndKey;
    if (from > to) continue;
    const single = a.startKey === a.endKey;
    for (const k of iterateDayKeys(from, to)) {
      if (!isWorkday(k)) continue;
      const value = a.halfDay && single ? 0.5 : 1;
      covered.set(k, Math.max(covered.get(k) ?? 0, value));
    }
  }
  let sum = 0;
  for (const v of covered.values()) sum += v;
  return sum;
}

export type MonthAccount = {
  workdays: number;
  dailySollMinutes: number;
  sollMinutes: number; // reguläres Soll (ohne Abwesenheiten)
  absenceDays: number; // Urlaub + Krank + Sonstige (Arbeitstage)
  creditedMinutes: number; // absenceDays * dailySoll
  workedMinutes: number; // Ist aus bestätigter Zeiterfassung
  adjustmentMinutes: number; // manuelle Buchungen (z. B. Überstunden-Auszahlung, meist negativ)
  balanceMinutes: number; // erarbeiteter Saldo: workedMinutes + creditedMinutes - sollMinutes
  balanceWithAdjustmentsMinutes: number; // balanceMinutes + adjustmentMinutes
};

export function monthAccount(params: {
  year: number;
  month1: number;
  weeklyHours: number;
  workDaysPerWeek: number;
  absences: AbsenceSpan[];
  workedMinutes: number;
  adjustmentMinutes?: number;
}): MonthAccount {
  const { start, end } = monthRangeKeys(params.year, params.month1);
  const workdays = countWorkdays(start, end);
  const daily = dailySollMinutes(params.weeklyHours, params.workDaysPerWeek);
  const sollMinutes = workdays * daily;
  const absenceDays = absenceWorkdays(params.absences, start, end);
  const creditedMinutes = Math.round(absenceDays * daily);
  const adjustmentMinutes = params.adjustmentMinutes ?? 0;
  const balanceMinutes = params.workedMinutes + creditedMinutes - sollMinutes;
  return {
    workdays,
    dailySollMinutes: daily,
    sollMinutes,
    absenceDays,
    creditedMinutes,
    workedMinutes: params.workedMinutes,
    adjustmentMinutes,
    balanceMinutes,
    balanceWithAdjustmentsMinutes: balanceMinutes + adjustmentMinutes,
  };
}

/* -------------------------------------------------------- Urlaubsanspruch */

/**
 * Jahresanspruch, im Eintrittsjahr anteilig (§5 BUrlG: Bruchteile ab 0,5 Tagen
 * werden aufgerundet).
 */
export function vacationEntitlement(
  vacationDaysPerYear: number,
  employmentStart: Date | null,
  year: number,
): number {
  if (!employmentStart) return vacationDaysPerYear;
  const startYear = employmentStart.getUTCFullYear();
  if (startYear > year) return 0;
  if (startYear < year) return vacationDaysPerYear;

  const startMonth = employmentStart.getUTCMonth(); // 0-basiert
  const monthsWorked = 12 - startMonth;
  const raw = (vacationDaysPerYear * monthsWorked) / 12;
  const floor = Math.floor(raw);
  return raw - floor >= 0.5 ? floor + 1 : floor;
}

/** Urlaubstage einer Abwesenheit im gegebenen Jahr (halbe Tage 0,5). */
export function vacationDaysInYear(
  absence: { startKey: string; endKey: string; halfDay: boolean },
  year: number,
): number {
  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;
  return absenceWorkdays(
    [{ ...absence, type: "VACATION" }],
    yStart,
    yEnd,
    "VACATION",
  );
}
