import { format } from "date-fns";
import { de } from "date-fns/locale";
import { dateFromKey } from "./shift";
import { absenceWorkdays, type AbsenceSpan } from "./soll";

export function absenceTypeLabel(type: "VACATION" | "SICK" | "OTHER"): string {
  return type === "VACATION" ? "Urlaub" : type === "SICK" ? "Krank" : "Sonstiges";
}

export function absenceTypeColor(type: "VACATION" | "SICK" | "OTHER"): string {
  return type === "VACATION" ? "#0ea5e9" : type === "SICK" ? "#ef4444" : "#64748b";
}

export function statusLabel(status: "PENDING" | "APPROVED" | "REJECTED"): string {
  return status === "PENDING" ? "offen" : status === "APPROVED" ? "genehmigt" : "abgelehnt";
}

/** "09.09.2026", "09.–13.09.2026" oder "09.09.2026 (halber Tag)" */
export function formatAbsenceRange(
  startKey: string,
  endKey: string,
  halfDay: boolean,
): string {
  const s = dateFromKey(startKey);
  const e = dateFromKey(endKey);
  if (startKey === endKey) {
    const d = format(s, "dd.MM.yyyy", { locale: de });
    return halfDay ? `${d} (halber Tag)` : d;
  }
  const sameMonth = startKey.slice(0, 7) === endKey.slice(0, 7);
  const left = sameMonth
    ? format(s, "dd.", { locale: de })
    : format(s, "dd.MM.", { locale: de });
  return `${left}–${format(e, "dd.MM.yyyy", { locale: de })}`;
}

/** Anzahl beanspruchter Arbeitstage einer einzelnen Abwesenheit. */
export function absenceDayCount(span: {
  startKey: string;
  endKey: string;
  halfDay: boolean;
}): number {
  const s: AbsenceSpan = { ...span, type: "VACATION" };
  return absenceWorkdays([s], span.startKey, span.endKey);
}
