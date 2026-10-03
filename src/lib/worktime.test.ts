import { describe, expect, it } from "vitest";
import {
  effectiveBreakMinutes,
  formatMinutes,
  legalBreakMinutes,
  netWorkedMinutes,
  toDecimalHours,
} from "./worktime";

describe("legalBreakMinutes (§ 4 ArbZG)", () => {
  it.each([
    [360, 0], // genau 6 Std.
    [361, 30],
    [540, 30], // genau 9 Std.
    [541, 45],
  ])("%i Min. brutto → %i Min. Pause", (gross, expected) => {
    expect(legalBreakMinutes(gross)).toBe(expected);
  });
});

describe("effectiveBreakMinutes", () => {
  it("manuelle Pause hat Vorrang, auch unter dem gesetzlichen Wert", () => {
    expect(effectiveBreakMinutes(600, 0, 15)).toBe(15);
    expect(effectiveBreakMinutes(600, 0, 0)).toBe(0);
  });

  it("Mindestpause des Mitarbeiters gilt auch bei kurzen Diensten", () => {
    expect(effectiveBreakMinutes(240, 20, null)).toBe(20);
    expect(effectiveBreakMinutes(600, 20, null)).toBe(45);
    expect(effectiveBreakMinutes(600, 60, undefined)).toBe(60);
  });
});

describe("netWorkedMinutes", () => {
  const at = (hhmm: string) => new Date(`2026-03-10T${hhmm}:00.000Z`);

  it("8:00–16:30 → 8 Std. netto", () => {
    expect(netWorkedMinutes(at("08:00"), at("16:30"), 0, null)).toBe(480);
  });

  it("Ende vor Start ergibt 0", () => {
    expect(netWorkedMinutes(at("16:00"), at("08:00"), 0, null)).toBe(0);
  });
});

describe("Formatierung", () => {
  it("formatMinutes", () => {
    expect(formatMinutes(452)).toBe("7:32 h");
    expect(formatMinutes(-75)).toBe("-1:15 h");
    expect(formatMinutes(0)).toBe("0:00 h");
  });

  it("toDecimalHours", () => {
    expect(toDecimalHours(452)).toBe(7.53);
    expect(toDecimalHours(-90)).toBe(-1.5);
  });
});
