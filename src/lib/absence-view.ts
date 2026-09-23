import { format } from "date-fns";
import { de } from "date-fns/locale";
import { dateFromKey } from "./shift";
import { ABSENCE_TYPES, typesOfGroup, type AbsenceKind } from "./absence-types";
import { absenceWorkdays, type AbsenceSpan } from "./soll";

export function absenceTypeLabel(type: AbsenceKind): string {
  return ABSENCE_TYPES[type].label;
}

export function absenceTypeColor(type: AbsenceKind): string {
  return ABSENCE_TYPES[type].color;
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

export type { AbsenceKind } from "./absence-types";

/** Arten, die im Bereich "Urlaub" verwaltet werden. */
export const VACATION_TYPES = typesOfGroup("vacation");

/** Arten, die im Bereich "Abwesenheiten" verwaltet werden. */
export const OTHER_ABSENCE_TYPES = typesOfGroup("other");
