import { isNrwHoliday } from "./holidays";
import { ABSENCE_TYPES, type AbsenceKind } from "./absence-types";

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
  type: AbsenceKind;
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

/**
 * Wirkung der Abwesenheiten je Arbeitstag: credit = Anteil mit Gutschrift,
 * free = Anteil, an dem die Sollzeit entfällt (jeweils 1 oder 0,5).
 * Bei Überschneidung gewinnt "Soll entfällt" – credit ist bereits gekürzt.
 */
function absenceEffectByDay(
  absences: AbsenceSpan[],
  rangeStartKey: string,
  rangeEndKey: string,
): { credit: Map<string, number>; free: Map<string, number> } {
  const credit = new Map<string, number>();
  const free = new Map<string, number>();
  for (const a of absences) {
    const effect = ABSENCE_TYPES[a.type].effect;
    if (effect === "none") continue;
    const target = effect === "credit" ? credit : free;
    const from = a.startKey > rangeStartKey ? a.startKey : rangeStartKey;
    const to = a.endKey < rangeEndKey ? a.endKey : rangeEndKey;
    if (from > to) continue;
    const single = a.startKey === a.endKey;
    for (const k of iterateDayKeys(from, to)) {
      if (!isWorkday(k)) continue;
      target.set(k, Math.max(target.get(k) ?? 0, a.halfDay && single ? 0.5 : 1));
    }
  }
  for (const [k, c] of credit) credit.set(k, Math.min(c, 1 - (free.get(k) ?? 0)));
  return { credit, free };
}

/**
 * Wirkung der Abwesenheiten auf das Stundenkonto, in Arbeitstagen:
 * credit = Tage mit Gutschrift, sollFree = Tage, an denen die Sollzeit entfällt.
 * Halbe Tage zählen 0,5; bei Überschneidung gewinnt "Soll entfällt".
 */
export function absenceEffectDays(
  absences: AbsenceSpan[],
  rangeStartKey: string,
  rangeEndKey: string,
): { credit: number; sollFree: number } {
  const { credit, free } = absenceEffectByDay(absences, rangeStartKey, rangeEndKey);
  let creditSum = 0;
  let freeSum = 0;
  for (const f of free.values()) freeSum += f;
  for (const c of credit.values()) creditSum += c;
  return { credit: creditSum, sollFree: freeSum };
}

/* ------------------------------------------------------ Arbeitszeit-Verlauf */

export type WorkTime = { weeklyHours: number; workDaysPerWeek: number };

/** Ab `fromKey` (yyyy-MM-dd) gelten diese Wochenstunden / Arbeitstage. */
export type WorkPeriod = WorkTime & { fromKey: string };

/**
 * Arbeitszeit an einem Tag: die letzte Periode, die an oder vor dem Tag beginnt.
 * Ohne passende Periode gilt `fallback` (die Stammdaten des Mitarbeiters).
 */
export function workTimeAt(
  dateKey: string,
  periods: WorkPeriod[] | undefined,
  fallback: WorkTime,
): WorkTime {
  let hit: WorkPeriod | undefined;
  for (const p of periods ?? []) {
    if (p.fromKey <= dateKey && (!hit || p.fromKey > hit.fromKey)) hit = p;
  }
  return hit ?? fallback;
}

/** Tagessoll in Minuten an einem Tag, unter Berücksichtigung des Verlaufs. */
export function dailySollAt(
  dateKey: string,
  periods: WorkPeriod[] | undefined,
  fallback: WorkTime,
): number {
  const w = workTimeAt(dateKey, periods, fallback);
  return dailySollMinutes(w.weeklyHours, w.workDaysPerWeek);
}

export type MonthAccount = {
  workdays: number;
  dailySollMinutes: number; // Tagessoll am letzten Tag des Zeitraums
  sollMinutes: number; // Soll nach Abzug der Tage, an denen die Sollzeit entfällt (unbezahlt, Elternzeit …)
  sollFreeDays: number; // Arbeitstage ohne Sollzeit (unbezahlte Abwesenheit)
  absenceDays: number; // bezahlte Abwesenheit mit Gutschrift (Urlaub, Krank, Sonderurlaub …)
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
  periods?: WorkPeriod[];
  absences: AbsenceSpan[];
  workedMinutes: number;
  adjustmentMinutes?: number;
}): MonthAccount {
  const { start, end } = monthRangeKeys(params.year, params.month1);
  return periodAccount({ ...params, startKey: start, endKey: end });
}

/** Wie monthAccount, aber für einen beliebigen Zeitraum (z. B. Monatsanfang bis heute). */
export function periodAccount(params: {
  startKey: string;
  endKey: string;
  weeklyHours: number;
  workDaysPerWeek: number;
  /** Arbeitszeit-Verlauf; ohne Angabe gelten weeklyHours/workDaysPerWeek durchgehend. */
  periods?: WorkPeriod[];
  absences: AbsenceSpan[];
  workedMinutes: number;
  adjustmentMinutes?: number;
}): MonthAccount {
  const start = params.startKey;
  const end = params.endKey;
  const fallback = { weeklyHours: params.weeklyHours, workDaysPerWeek: params.workDaysPerWeek };
  const { credit, free } = absenceEffectByDay(params.absences, start, end);
  let workdays = 0;
  let absenceDays = 0;
  let sollFreeDays = 0;
  let soll = 0;
  let credited = 0;
  for (const k of iterateDayKeys(start, end)) {
    if (!isWorkday(k)) continue;
    const day = dailySollAt(k, params.periods, fallback);
    const f = free.get(k) ?? 0;
    const c = credit.get(k) ?? 0;
    workdays += 1;
    sollFreeDays += f;
    absenceDays += c;
    soll += (1 - f) * day;
    credited += c * day;
  }
  const daily = dailySollAt(end, params.periods, fallback);
  const sollMinutes = Math.round(soll);
  const creditedMinutes = Math.round(credited);
  const adjustmentMinutes = params.adjustmentMinutes ?? 0;
  const balanceMinutes = params.workedMinutes + creditedMinutes - sollMinutes;
  return {
    workdays,
    dailySollMinutes: daily,
    sollMinutes,
    sollFreeDays,
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

/** Übertrag aus dem Vorjahr; expiresKey = letzter Tag, an dem er genommen werden kann. */
export type VacationCarry = { days: number; expiresKey: string | null };

export type VacationBalance = {
  entitlement: number;
  carry: number; // Übertrag aus dem Vorjahr (negativ = im Vorjahr überzogen)
  carryExpiresKey: string | null;
  carryOpen: number; // Übertrag, der bis zum Verfall noch genommen werden muss
  carryExpired: number; // bereits verfallener Übertrag
  taken: number;
  pending: number;
  remaining: number; // entitlement + carry − carryExpired − taken
};

/**
 * Urlaubskonto eines Jahres. Genommener Urlaub verbraucht zuerst den Übertrag;
 * was davon bis zum Verfallstag nicht genommen wurde, verfällt danach.
 */
export function vacationBalance(params: {
  year: number;
  entitlement: number;
  carry: VacationCarry | null;
  taken: AbsenceSpan[]; // genehmigter Urlaub
  pending: AbsenceSpan[]; // beantragter Urlaub
  todayKey: string;
}): VacationBalance {
  const yStart = `${params.year}-01-01`;
  const yEnd = `${params.year}-12-31`;
  const taken = absenceWorkdays(params.taken, yStart, yEnd, "VACATION");
  const pending = absenceWorkdays(params.pending, yStart, yEnd, "VACATION");
  const carry = params.carry?.days ?? 0;
  const expiresKey = carry > 0 ? (params.carry?.expiresKey ?? null) : null;

  let carryOpen = 0;
  let carryExpired = 0;
  if (expiresKey) {
    const before = absenceWorkdays(params.taken, yStart, expiresKey < yEnd ? expiresKey : yEnd, "VACATION");
    const unused = Math.max(0, carry - before);
    if (params.todayKey > expiresKey) carryExpired = unused;
    else carryOpen = unused;
  }

  return {
    entitlement: params.entitlement,
    carry,
    carryExpiresKey: expiresKey,
    carryOpen,
    carryExpired,
    taken,
    pending,
    remaining: params.entitlement + carry - carryExpired - taken,
  };
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
