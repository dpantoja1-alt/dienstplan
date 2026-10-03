"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { localInputToDate } from "@/lib/time-zone";
import { audit, changedFields } from "@/lib/audit";
import { timeEntrySnapshot, timeEntryText } from "@/lib/audit-format";

export type EntryFormState = { error?: string; ok?: boolean };

const entrySchema = z
  .object({
    start: z.string().min(1),
    end: z.string().optional(),
    breakMinutes: z.string().optional(),
    note: z.string().max(500).optional(),
  })
  .transform((v, ctx) => {
    const start = localInputToDate(v.start);
    if (!start) {
      ctx.addIssue({ code: "custom", message: "Startzeit ungültig" });
      return z.NEVER;
    }
    const end = v.end ? localInputToDate(v.end) : null;
    if (v.end && !end) {
      ctx.addIssue({ code: "custom", message: "Endzeit ungültig" });
      return z.NEVER;
    }
    if (end && end.getTime() <= start.getTime()) {
      ctx.addIssue({ code: "custom", message: "Ende muss nach dem Start liegen" });
      return z.NEVER;
    }
    let breakMinutes: number | null = null;
    if (v.breakMinutes && v.breakMinutes.trim() !== "") {
      const n = Number(v.breakMinutes);
      if (!Number.isFinite(n) || n < 0 || n > 600) {
        ctx.addIssue({ code: "custom", message: "Pause 0–600 Minuten" });
        return z.NEVER;
      }
      breakMinutes = Math.round(n);
    }
    return {
      start,
      end,
      breakMinutes,
      note: v.note?.trim() || null,
    };
  });

function parseEntry(formData: FormData) {
  return entrySchema.safeParse({
    start: formData.get("start"),
    end: formData.get("end") ?? undefined,
    breakMinutes: formData.get("breakMinutes") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
}

/* ---------------------------------------------------------------- Stempeluhr */

export async function clockIn() {
  const session = await requireUser();
  const open = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, end: null },
  });
  if (open) throw new Error("Es läuft bereits eine Zeiterfassung.");

  await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      start: new Date(),
      source: "CLOCK",
      status: "PENDING",
    },
  });
  revalidatePath("/zeiten");
  revalidatePath("/dashboard");
}

export async function clockOut() {
  const session = await requireUser();
  const open = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, end: null },
    orderBy: { start: "desc" },
  });
  if (!open) throw new Error("Es läuft keine Zeiterfassung.");

  await prisma.timeEntry.update({
    where: { id: open.id },
    data: { end: new Date() },
  });
  revalidatePath("/zeiten");
  revalidatePath("/dashboard");
}

/* ---------------------------------------------- Admin: Stempeluhr für andere */

export async function adminClockIn(userId: string) {
  const session = await requireAdmin();
  const open = await prisma.timeEntry.findFirst({ where: { userId, end: null } });
  if (open) throw new Error("Für diesen Mitarbeiter läuft bereits eine Zeiterfassung.");

  const created = await prisma.timeEntry.create({
    data: { userId, start: new Date(), source: "CLOCK", status: "CONFIRMED" },
  });
  const snap = timeEntrySnapshot(created);
  await audit({
    actor: session.user,
    action: "timeEntry.clockIn",
    subjectUserId: userId,
    entityId: created.id,
    summary: `Für Mitarbeiter eingestempelt: ${timeEntryText(snap)}`,
    after: snap,
  });
  revalidatePath("/zeiten/team");
  revalidatePath("/zeiten");
}

export async function adminClockOut(userId: string) {
  const session = await requireAdmin();
  const open = await prisma.timeEntry.findFirst({
    where: { userId, end: null },
    orderBy: { start: "desc" },
  });
  if (!open) throw new Error("Für diesen Mitarbeiter läuft keine Zeiterfassung.");

  const closed = await prisma.timeEntry.update({
    where: { id: open.id },
    data: { end: new Date(), status: "CONFIRMED" },
  });
  const snap = timeEntrySnapshot(closed);
  await audit({
    actor: session.user,
    action: "timeEntry.clockOut",
    subjectUserId: userId,
    entityId: closed.id,
    summary: `Für Mitarbeiter ausgestempelt: ${timeEntryText(snap)}`,
    ...changedFields(timeEntrySnapshot(open), snap),
  });
  revalidatePath("/zeiten/team");
  revalidatePath("/zeiten");
}

/* -------------------------------------------------------------------- Admin

   Mitarbeiter erfassen ihre Zeit ausschließlich per Stempeluhr (clockIn/
   clockOut). Manuelles Eintragen/Ändern/Löschen eigener Zeiten ist nicht
   möglich – Korrekturen macht die Leitung über die Team-Zeiten. */

export async function adminSaveEntry(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const session = await requireAdmin();
  const entryId = String(formData.get("entryId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const parsed = parseEntry(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }

  if (entryId) {
    const old = await prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!old) return { error: "Eintrag nicht gefunden." };
    // Die Änderung des Admins ist maßgeblich → sofort bestätigt, Korrekturhinweis weg.
    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: { ...parsed.data, status: "CONFIRMED", correctionNote: null },
    });
    const before = timeEntrySnapshot(old);
    const after = timeEntrySnapshot(updated);
    await audit({
      actor: session.user,
      action: "timeEntry.update",
      subjectUserId: updated.userId,
      entityId: updated.id,
      summary: `Zeit geändert: ${timeEntryText(before)} → ${timeEntryText(after)}`,
      ...changedFields(before, after),
    });
  } else {
    if (!userId) return { error: "Kein Mitarbeiter gewählt." };
    const created = await prisma.timeEntry.create({
      data: { userId, ...parsed.data, source: "MANUAL", status: "CONFIRMED" },
    });
    const snap = timeEntrySnapshot(created);
    await audit({
      actor: session.user,
      action: "timeEntry.create",
      subjectUserId: userId,
      entityId: created.id,
      summary: `Zeit nachgetragen: ${timeEntryText(snap)}`,
      after: snap,
    });
  }
  revalidatePath("/zeiten");
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  if (userId) revalidatePath(`/mitarbeiter/${userId}/zeiten`);
  return { ok: true };
}

export async function confirmEntry(id: string) {
  const session = await requireAdmin();
  const entry = await prisma.timeEntry.update({
    where: { id },
    data: { status: "CONFIRMED", correctionNote: null },
  });
  await audit({
    actor: session.user,
    action: "timeEntry.confirm",
    subjectUserId: entry.userId,
    entityId: id,
    summary: `Zeit bestätigt: ${timeEntryText(timeEntrySnapshot(entry))}`,
  });
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  revalidatePath(`/mitarbeiter/${entry.userId}/zeiten`);
}

export async function confirmAllForUser(userId: string) {
  const session = await requireAdmin();
  const { count } = await prisma.timeEntry.updateMany({
    where: { userId, status: "PENDING", end: { not: null } },
    data: { status: "CONFIRMED", correctionNote: null },
  });
  if (count > 0) {
    await audit({
      actor: session.user,
      action: "timeEntry.confirmAll",
      subjectUserId: userId,
      summary: `Alle offenen Zeiten bestätigt (${count} Einträge)`,
    });
  }
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  revalidatePath(`/mitarbeiter/${userId}/zeiten`);
}

export async function adminDeleteEntry(id: string) {
  const session = await requireAdmin();
  const entry = await prisma.timeEntry.delete({ where: { id } });
  const snap = timeEntrySnapshot(entry);
  await audit({
    actor: session.user,
    action: "timeEntry.delete",
    subjectUserId: entry.userId,
    entityId: id,
    summary: `Zeit gelöscht: ${timeEntryText(snap)}`,
    before: snap,
  });
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  revalidatePath(`/mitarbeiter/${entry.userId}/zeiten`);
}
