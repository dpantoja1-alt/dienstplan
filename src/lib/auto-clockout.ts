import "server-only";
import { hasFlexibleShift } from "./flexible";
import { prisma } from "./prisma";
import { audit } from "./audit";
import { timeEntryText } from "./audit-format";

/**
 * Gesetzliche Höchstgrenze für eine ununterbrochene Anwesenheit:
 * max. 10 Std. Netto-Arbeitszeit (ArbZG §3) + bis zu 1 Std. Pause = 11 Std. brutto.
 * Wird nicht ausgestempelt, schließen wir den Eintrag spätestens hier automatisch.
 */
export const MAX_GROSS_MINUTES = 11 * 60;

const AUTO_CLOSE_NOTE =
  "Automatisch ausgestempelt: gesetzliche Höchstarbeitszeit (11 Std. inkl. Pause) erreicht. Bitte tatsächliche Zeit prüfen und korrigieren.";

/**
 * Schließt alle offenen Zeiterfassungen, die die Höchstgrenze überschritten haben.
 * Das Ende wird auf Start + 11 Std. gesetzt (nicht auf "jetzt"), damit nie mehr als
 * die gesetzlich zulässige Zeit aufgezeichnet wird, selbst wenn diese Prüfung erst
 * später läuft. Status geht zurück auf PENDING, damit die Korrektur im
 * Review-Flow ("Zeiten prüfen") auffällt.
 *
 * Ausnahme: Einträge an Tagen mit flexiblem Dienst (FX, z. B. Geschäftsführer)
 * bleiben offen – dort wird die tatsächliche Zeit erfasst.
 */
export async function autoCloseOverrunEntries(): Promise<number> {
  const cutoff = new Date(Date.now() - MAX_GROSS_MINUTES * 60_000);
  const overdue = await prisma.timeEntry.findMany({
    where: { end: null, start: { lte: cutoff } },
    select: { id: true, userId: true, start: true },
  });
  if (overdue.length === 0) return 0;

  const toClose = [];
  for (const e of overdue) {
    if (!(await hasFlexibleShift(e.userId, e.start))) toClose.push(e);
  }
  if (toClose.length === 0) return 0;

  let count = 0;
  for (const e of toClose) {
    const end = new Date(e.start.getTime() + MAX_GROSS_MINUTES * 60_000);
    // "end: null" im Filter: läuft die Prüfung parallel in zwei Requests,
    // schließt und protokolliert nur einer den Eintrag.
    const { count: n } = await prisma.timeEntry.updateMany({
      where: { id: e.id, end: null },
      data: { end, status: "PENDING", correctionNote: AUTO_CLOSE_NOTE },
    });
    if (n === 0) continue;
    count += 1;
    await audit({
      actor: null,
      action: "timeEntry.autoClockOut",
      subjectUserId: e.userId,
      entityId: e.id,
      summary: `Automatisch ausgestempelt nach 11 Std.: ${timeEntryText({ start: e.start.toISOString(), end: end.toISOString() })}`,
      after: { end: end.toISOString(), status: "PENDING" },
    });
  }
  return count;
}
