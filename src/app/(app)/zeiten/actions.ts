"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { localInputToDate } from "@/lib/time-zone";

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
  await requireAdmin();
  const open = await prisma.timeEntry.findFirst({ where: { userId, end: null } });
  if (open) throw new Error("Für diesen Mitarbeiter läuft bereits eine Zeiterfassung.");

  await prisma.timeEntry.create({
    data: { userId, start: new Date(), source: "CLOCK", status: "CONFIRMED" },
  });
  revalidatePath("/zeiten/team");
  revalidatePath("/zeiten");
}

export async function adminClockOut(userId: string) {
  await requireAdmin();
  const open = await prisma.timeEntry.findFirst({
    where: { userId, end: null },
    orderBy: { start: "desc" },
  });
  if (!open) throw new Error("Für diesen Mitarbeiter läuft keine Zeiterfassung.");

  await prisma.timeEntry.update({
    where: { id: open.id },
    data: { end: new Date(), status: "CONFIRMED" },
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
  await requireAdmin();
  const entryId = String(formData.get("entryId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const parsed = parseEntry(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }

  if (entryId) {
    // Die Änderung des Admins ist maßgeblich → sofort bestätigt, Korrekturhinweis weg.
    await prisma.timeEntry.update({
      where: { id: entryId },
      data: { ...parsed.data, status: "CONFIRMED", correctionNote: null },
    });
  } else {
    if (!userId) return { error: "Kein Mitarbeiter gewählt." };
    await prisma.timeEntry.create({
      data: { userId, ...parsed.data, source: "MANUAL", status: "CONFIRMED" },
    });
  }
  revalidatePath("/zeiten");
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  if (userId) revalidatePath(`/mitarbeiter/${userId}/zeiten`);
  return { ok: true };
}

export async function confirmEntry(id: string) {
  await requireAdmin();
  const entry = await prisma.timeEntry.update({
    where: { id },
    data: { status: "CONFIRMED", correctionNote: null },
  });
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  revalidatePath(`/mitarbeiter/${entry.userId}/zeiten`);
}

export async function confirmAllForUser(userId: string) {
  await requireAdmin();
  await prisma.timeEntry.updateMany({
    where: { userId, status: "PENDING", end: { not: null } },
    data: { status: "CONFIRMED", correctionNote: null },
  });
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  revalidatePath(`/mitarbeiter/${userId}/zeiten`);
}

export async function adminDeleteEntry(id: string) {
  await requireAdmin();
  const entry = await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/zeiten/pruefen");
  revalidatePath("/zeiten/team");
  revalidatePath(`/mitarbeiter/${entry.userId}/zeiten`);
}
