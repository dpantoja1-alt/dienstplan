/**
 * Berechnung von Arbeits- und Pausenzeiten.
 * Alle Werte in Minuten, sofern nicht anders angegeben.
 */

/** Gesetzliche Mindestpause nach ArbZG §4 abhängig von der Bruttodauer. */
export function legalBreakMinutes(grossMinutes: number): number {
  if (grossMinutes > 9 * 60) return 45;
  if (grossMinutes > 6 * 60) return 30;
  return 0;
}

/**
 * Tatsächlich anzusetzende Pause:
 * - manuelle Überschreibung hat Vorrang
 * - sonst das Maximum aus gesetzlicher Pause und dem MA-Mindestwert
 *   (der MA-Mindestwert gilt immer, auch bei kurzen Schichten)
 */
export function effectiveBreakMinutes(
  grossMinutes: number,
  minBreakMinutes: number,
  override: number | null | undefined,
): number {
  if (override != null) return Math.max(0, override);
  return Math.max(legalBreakMinutes(grossMinutes), minBreakMinutes);
}

export function grossMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

/** Nettoarbeitszeit in Minuten (Brutto minus Pause). */
export function netWorkedMinutes(
  start: Date,
  end: Date,
  minBreakMinutes: number,
  override: number | null | undefined,
): number {
  const gross = grossMinutes(start, end);
  return Math.max(0, gross - effectiveBreakMinutes(gross, minBreakMinutes, override));
}

/** 452 -> "7:32 h" */
export function formatMinutes(total: number): string {
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")} h`;
}

/** 452 -> "7,53" (Dezimalstunden, für Export/Anzeige) */
export function toDecimalHours(total: number): number {
  return Math.round((total / 60) * 100) / 100;
}
