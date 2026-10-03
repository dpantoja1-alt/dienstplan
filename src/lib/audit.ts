import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditActor = { id: string; name: string } | null; // null = System

/** Werte für before/after: Datumswerte werden als ISO-String gespeichert. */
type Snapshot = Record<string, unknown> | null | undefined;

function toJson(v: Snapshot): Prisma.InputJsonValue | undefined {
  if (!v) return undefined;
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

/**
 * Schreibt einen Eintrag ins Änderungsprotokoll. Fehler beim Protokollieren
 * werden geloggt, brechen die eigentliche Aktion aber nicht ab.
 */
export async function audit(entry: {
  actor: AuditActor;
  action: string;
  subjectUserId?: string | null;
  entityId?: string | null;
  summary: string;
  before?: Snapshot;
  after?: Snapshot;
}): Promise<void> {
  try {
    const subject = entry.subjectUserId
      ? await prisma.user.findUnique({ where: { id: entry.subjectUserId }, select: { name: true } })
      : null;
    await prisma.auditLog.create({
      data: {
        actorId: entry.actor?.id ?? null,
        actorName: entry.actor?.name ?? "System",
        action: entry.action,
        subjectUserId: entry.subjectUserId ?? null,
        subjectName: subject?.name ?? null,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        before: toJson(entry.before),
        after: toJson(entry.after),
      },
    });
  } catch (err) {
    console.error("[audit] Protokolleintrag fehlgeschlagen", err);
  }
}

/** Nur die Felder, die sich geändert haben (für eine kompakte Anzeige). */
export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key];
      a[key] = after[key];
    }
  }
  return { before: b, after: a };
}
