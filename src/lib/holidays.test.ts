import { describe, expect, it } from "vitest";
import { easterSunday, holidaysInRange, isNrwHoliday, nrwHolidayName } from "./holidays";

describe("easterSunday", () => {
  it.each([
    [2025, { month: 4, day: 20 }],
    [2026, { month: 4, day: 5 }],
    [2027, { month: 3, day: 28 }],
    [2028, { month: 4, day: 16 }],
  ])("%i", (year, expected) => {
    expect(easterSunday(year)).toEqual(expected);
  });
});

describe("NRW-Feiertage", () => {
  it("bewegliche Feiertage 2026", () => {
    expect(nrwHolidayName("2026-04-03")).toBe("Karfreitag");
    expect(nrwHolidayName("2026-04-06")).toBe("Ostermontag");
    expect(nrwHolidayName("2026-05-14")).toBe("Christi Himmelfahrt");
    expect(nrwHolidayName("2026-05-25")).toBe("Pfingstmontag");
    expect(nrwHolidayName("2026-06-04")).toBe("Fronleichnam");
  });

  it("keine Feiertage, die es nur in anderen Bundesländern gibt", () => {
    expect(isNrwHoliday("2026-01-06")).toBe(false); // Heilige Drei Könige
    expect(isNrwHoliday("2026-10-31")).toBe(false); // Reformationstag
    expect(isNrwHoliday("2026-12-24")).toBe(false);
    expect(isNrwHoliday("2026-12-31")).toBe(false);
  });

  it("11 Feiertage pro Jahr, auch über den Jahreswechsel", () => {
    expect(holidaysInRange("2026-01-01", "2026-12-31")).toHaveLength(11);
    expect(holidaysInRange("2026-12-20", "2027-01-10").map((h) => h.key)).toEqual([
      "2026-12-25",
      "2026-12-26",
      "2027-01-01",
    ]);
  });
});
