import { describe, expect, it } from "vitest";
import {
  absenceEffectDays,
  absenceWorkdays,
  countWorkdays,
  dailySollMinutes,
  monthAccount,
  periodAccount,
  vacationDaysInYear,
  vacationEntitlement,
  vacationBalance,
  workTimeAt,
  type AbsenceSpan,
  type WorkPeriod,
} from "./soll";

const span = (
  type: AbsenceSpan["type"],
  startKey: string,
  endKey = startKey,
  halfDay = false,
): AbsenceSpan => ({ type, startKey, endKey, halfDay });

describe("Arbeitstage", () => {
  it("Januar 2026: 22 Wochentage minus Neujahr", () => {
    expect(countWorkdays("2026-01-01", "2026-01-31")).toBe(21);
  });

  it("Oktober 2026: Tag der Deutschen Einheit fällt auf Samstag", () => {
    expect(countWorkdays("2026-10-01", "2026-10-31")).toBe(22);
  });

  it("Ostern 2026: Karfreitag und Ostermontag zählen nicht", () => {
    expect(countWorkdays("2026-03-30", "2026-04-10")).toBe(8);
  });
});

describe("dailySollMinutes", () => {
  it.each([
    [40, 5, 480],
    [39, 5, 468],
    [20, 4, 300],
    [40, 0, 0],
  ])("%d Std. / %d Tage → %d Min.", (hours, days, expected) => {
    expect(dailySollMinutes(hours, days)).toBe(expected);
  });
});

describe("absenceWorkdays", () => {
  it("Urlaub über Ostern zählt nur echte Arbeitstage", () => {
    // Do 02.04. bis Di 07.04.2026: Karfreitag, Wochenende, Ostermontag entfallen
    expect(absenceWorkdays([span("VACATION", "2026-04-02", "2026-04-07")], "2026-01-01", "2026-12-31")).toBe(2);
  });

  it("halber Tag zählt 0,5, aber nur bei eintägiger Abwesenheit", () => {
    expect(absenceWorkdays([span("VACATION", "2026-03-10", "2026-03-10", true)], "2026-03-01", "2026-03-31")).toBe(0.5);
    expect(absenceWorkdays([span("VACATION", "2026-03-10", "2026-03-11", true)], "2026-03-01", "2026-03-31")).toBe(2);
  });

  it("überlappende Abwesenheiten zählen einen Tag nur einmal", () => {
    const list = [span("VACATION", "2026-03-09", "2026-03-13"), span("VACATION", "2026-03-12", "2026-03-16")];
    expect(absenceWorkdays(list, "2026-03-01", "2026-03-31")).toBe(6);
  });

  it("wird auf den Zeitraum zugeschnitten und kann nach Art filtern", () => {
    const list = [span("VACATION", "2026-01-26", "2026-02-06"), span("SICK", "2026-02-09")];
    expect(absenceWorkdays(list, "2026-02-01", "2026-02-28")).toBe(6);
    expect(absenceWorkdays(list, "2026-02-01", "2026-02-28", "VACATION")).toBe(5);
  });
});

describe("absenceEffectDays", () => {
  it("bei Überschneidung gewinnt „Soll entfällt“", () => {
    const list = [span("SICK", "2026-03-10"), span("UNPAID", "2026-03-10")];
    expect(absenceEffectDays(list, "2026-03-01", "2026-03-31")).toEqual({ credit: 0, sollFree: 1 });
  });

  it("halber unbezahlter Tag + Krankheit: je die Hälfte", () => {
    const list = [span("SICK", "2026-03-10"), span("UNPAID", "2026-03-10", "2026-03-10", true)];
    expect(absenceEffectDays(list, "2026-03-01", "2026-03-31")).toEqual({ credit: 0.5, sollFree: 0.5 });
  });

  it("Überstundenabbau wirkt weder als Gutschrift noch als Soll-Entfall", () => {
    expect(absenceEffectDays([span("TIME_OFF", "2026-03-10")], "2026-03-01", "2026-03-31")).toEqual({
      credit: 0,
      sollFree: 0,
    });
  });
});

describe("monthAccount / periodAccount", () => {
  it("Januar 2026, 40 Std., ein Urlaubstag", () => {
    const acc = monthAccount({
      year: 2026,
      month1: 1,
      weeklyHours: 40,
      workDaysPerWeek: 5,
      absences: [span("VACATION", "2026-01-02")],
      workedMinutes: 10000,
      adjustmentMinutes: -120,
    });
    expect(acc.workdays).toBe(21);
    expect(acc.sollMinutes).toBe(21 * 480);
    expect(acc.creditedMinutes).toBe(480);
    expect(acc.balanceMinutes).toBe(10000 + 480 - 21 * 480);
    expect(acc.balanceWithAdjustmentsMinutes).toBe(acc.balanceMinutes - 120);
  });

  it("Freizeitausgleich senkt den Saldo um einen Tag", () => {
    const acc = periodAccount({
      startKey: "2026-01-02",
      endKey: "2026-01-02",
      weeklyHours: 40,
      workDaysPerWeek: 5,
      absences: [span("TIME_OFF", "2026-01-02")],
      workedMinutes: 0,
    });
    expect(acc.balanceMinutes).toBe(-480);
  });

  it("unbezahlter Urlaub hält den Saldo neutral", () => {
    const acc = periodAccount({
      startKey: "2026-03-09",
      endKey: "2026-03-13",
      weeklyHours: 40,
      workDaysPerWeek: 5,
      absences: [span("UNPAID", "2026-03-09", "2026-03-13")],
      workedMinutes: 0,
    });
    expect(acc.sollMinutes).toBe(0);
    expect(acc.balanceMinutes).toBe(0);
  });
});

describe("vacationEntitlement (§ 5 BUrlG)", () => {
  it("volles Jahr bei Eintritt im Vorjahr oder ohne Eintrittsdatum", () => {
    expect(vacationEntitlement(30, new Date("2025-08-01"), 2026)).toBe(30);
    expect(vacationEntitlement(30, null, 2026)).toBe(30);
  });

  it("anteilig im Eintrittsjahr, ab 0,5 aufgerundet", () => {
    expect(vacationEntitlement(30, new Date("2026-07-01"), 2026)).toBe(15);
    expect(vacationEntitlement(30, new Date("2026-02-15"), 2026)).toBe(28); // 27,5
    expect(vacationEntitlement(29, new Date("2026-08-01"), 2026)).toBe(12); // 12,08
  });

  it("0 vor dem Eintrittsjahr", () => {
    expect(vacationEntitlement(30, new Date("2027-01-01"), 2026)).toBe(0);
  });
});

describe("vacationDaysInYear", () => {
  it("Urlaub über den Jahreswechsel wird aufgeteilt", () => {
    const a = { startKey: "2026-12-28", endKey: "2027-01-05", halfDay: false };
    expect(vacationDaysInYear(a, 2026)).toBe(4);
    expect(vacationDaysInYear(a, 2027)).toBe(2); // Neujahr ist Feiertag
  });
});

describe("Arbeitszeit-Verlauf", () => {
  const base = { weeklyHours: 40, workDaysPerWeek: 5 };
  const periods: WorkPeriod[] = [
    { fromKey: "2000-01-01", weeklyHours: 40, workDaysPerWeek: 5 },
    { fromKey: "2026-03-16", weeklyHours: 30, workDaysPerWeek: 5 },
  ];

  it("workTimeAt nimmt die letzte Periode, die bis zum Tag begonnen hat", () => {
    expect(workTimeAt("2026-03-15", periods, base).weeklyHours).toBe(40);
    expect(workTimeAt("2026-03-16", periods, base).weeklyHours).toBe(30);
    expect(workTimeAt("2030-01-01", periods, base).weeklyHours).toBe(30);
    expect(workTimeAt("1999-12-31", periods, { weeklyHours: 20, workDaysPerWeek: 5 }).weeklyHours).toBe(20);
  });

  it("Reihenfolge der Perioden spielt keine Rolle", () => {
    expect(workTimeAt("2026-04-01", [...periods].reverse(), base).weeklyHours).toBe(30);
  });

  it("Wechsel mitten im Monat: Soll und Gutschrift je Tag", () => {
    const acc = monthAccount({
      year: 2026,
      month1: 3,
      ...base,
      periods,
      absences: [span("VACATION", "2026-03-16")],
      workedMinutes: 0,
    });
    expect(acc.workdays).toBe(22);
    expect(acc.sollMinutes).toBe(10 * 480 + 12 * 360);
    expect(acc.creditedMinutes).toBe(360);
    expect(acc.dailySollMinutes).toBe(360);
  });

  it("frühere Monate bleiben bei einer späteren Änderung gleich", () => {
    const feb = (p?: WorkPeriod[]) =>
      monthAccount({ year: 2026, month1: 2, ...base, periods: p, absences: [], workedMinutes: 0 }).sollMinutes;
    expect(feb(periods)).toBe(feb(undefined));
  });
});

describe("vacationBalance (Resturlaub)", () => {
  const feb = [span("VACATION", "2027-02-15", "2027-02-17")]; // Mo–Mi, 3 Tage
  const carry = { days: 5, expiresKey: "2027-03-31" };

  it("vor dem Verfall: offener Übertrag wird angezeigt", () => {
    const b = vacationBalance({ year: 2027, entitlement: 30, carry, taken: feb, pending: [], todayKey: "2027-02-20" });
    expect(b).toMatchObject({ carry: 5, carryOpen: 2, carryExpired: 0, taken: 3, remaining: 32 });
  });

  it("nach dem Verfall: nicht genommener Übertrag verfällt", () => {
    const later = [...feb, span("VACATION", "2027-04-12", "2027-04-13")];
    const b = vacationBalance({ year: 2027, entitlement: 30, carry, taken: later, pending: [], todayKey: "2027-04-20" });
    expect(b).toMatchObject({ carryOpen: 0, carryExpired: 2, taken: 5, remaining: 28 });
  });

  it("Übertrag ganz genommen: nichts verfällt", () => {
    const five = [span("VACATION", "2027-02-15", "2027-02-19")];
    const b = vacationBalance({ year: 2027, entitlement: 30, carry, taken: five, pending: [], todayKey: "2027-05-01" });
    expect(b).toMatchObject({ carryExpired: 0, remaining: 30 });
  });

  it("ohne Verfallsdatum bleibt der Übertrag erhalten", () => {
    const b = vacationBalance({
      year: 2027,
      entitlement: 30,
      carry: { days: 5, expiresKey: null },
      taken: [],
      pending: feb,
      todayKey: "2027-12-01",
    });
    expect(b).toMatchObject({ carryExpired: 0, pending: 3, remaining: 35 });
  });

  it("überzogener Urlaub aus dem Vorjahr wird abgezogen, verfällt aber nicht", () => {
    const b = vacationBalance({
      year: 2027,
      entitlement: 30,
      carry: { days: -2, expiresKey: "2027-03-31" },
      taken: [],
      pending: [],
      todayKey: "2027-06-01",
    });
    expect(b).toMatchObject({ carry: -2, carryExpiresKey: null, carryExpired: 0, remaining: 28 });
  });
});
