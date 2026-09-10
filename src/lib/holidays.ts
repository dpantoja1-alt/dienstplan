/**
 * Gesetzliche Feiertage in Nordrhein-Westfalen – rein berechnet, ohne externe API.
 * Alle Datums-Schlüssel im Format "yyyy-MM-dd".
 */

/** Ostersonntag nach der anonymen gregorianischen Methode (Gauß/Meeus). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Map aller NRW-Feiertage eines Jahres: "yyyy-MM-dd" -> Name. */
export function nrwHolidays(year: number): Map<string, string> {
  const easter = easterSunday(year);
  const easterKey = key(year, easter.month, easter.day);

  const list: [string, string][] = [
    [key(year, 1, 1), "Neujahr"],
    [addDays(easterKey, -2), "Karfreitag"],
    [addDays(easterKey, 1), "Ostermontag"],
    [key(year, 5, 1), "Tag der Arbeit"],
    [addDays(easterKey, 39), "Christi Himmelfahrt"],
    [addDays(easterKey, 50), "Pfingstmontag"],
    [addDays(easterKey, 60), "Fronleichnam"],
    [key(year, 10, 3), "Tag der Deutschen Einheit"],
    [key(year, 11, 1), "Allerheiligen"],
    [key(year, 12, 25), "1. Weihnachtstag"],
    [key(year, 12, 26), "2. Weihnachtstag"],
  ];
  return new Map(list);
}

const cache = new Map<number, Map<string, string>>();
function holidaysFor(year: number): Map<string, string> {
  let m = cache.get(year);
  if (!m) {
    m = nrwHolidays(year);
    cache.set(year, m);
  }
  return m;
}

/** Name des Feiertags oder null. */
export function nrwHolidayName(dateKey: string): string | null {
  const year = Number(dateKey.slice(0, 4));
  return holidaysFor(year).get(dateKey) ?? null;
}

export function isNrwHoliday(dateKey: string): boolean {
  return nrwHolidayName(dateKey) !== null;
}

/** Alle Feiertage im Bereich [startKey, endKey] (inklusive), sortiert. */
export function holidaysInRange(
  startKey: string,
  endKey: string,
): { key: string; name: string }[] {
  const out: { key: string; name: string }[] = [];
  const startYear = Number(startKey.slice(0, 4));
  const endYear = Number(endKey.slice(0, 4));
  for (let y = startYear; y <= endYear; y++) {
    for (const [k, name] of holidaysFor(y)) {
      if (k >= startKey && k <= endKey) out.push({ key: k, name });
    }
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : 1));
}
