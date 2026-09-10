/** Bruttostundensatz aus Monatsgehalt und Wochenstunden. null, wenn kein Gehalt hinterlegt. */
export function hourlyRate(
  monthlySalary: number | null | undefined,
  weeklyHours: number,
): number | null {
  if (monthlySalary == null || monthlySalary <= 0 || weeklyHours <= 0) return null;
  const monthlyHours = (weeklyHours * 52) / 12; // z. B. 40 h/Woche -> ~173,3 h/Monat
  return monthlySalary / monthlyHours;
}

/** Kosten eines Tages = Ist-Minuten × Stundensatz. */
export function dayCost(
  netMinutes: number,
  rate: number | null,
): number | null {
  if (rate == null) return null;
  return (netMinutes / 60) * rate;
}

export function formatEuro(n: number, decimals = 0): string {
  return n.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
