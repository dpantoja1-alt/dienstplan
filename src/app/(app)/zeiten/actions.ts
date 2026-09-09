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
}

/* ------------------------------------------------------- Mitarbeiter: eigene */

export async function addOwnEntry(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const session = await requireUser();
  const parsed = parseEntry(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }
  await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      ...parsed.data,
      source: "MANUAL",
      status: "PENDING",
    },
  });
  revalidatePath("/zeiten");
  return { ok: true };
}

export async function updateOwnEntry(
  id: string,
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const session = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    return { error: "Eintrag nicht gefunden." };
  }
  if (entry.status !== "PENDING") {
    return { error: "Bestätigte Einträge kannst du nur per Korrektur ändern." };
  }
  const parsed = parseEntry(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }
  await prisma.timeEntry.update({ where: { id }, data: parsed.data });
  revalidatePath("/zeiten");
  return { ok: true };
}

export async function deleteOwnEntry(id: string) {
  const session = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    throw new Error("Eintrag nicht gefunden.");
  }
  if (entry.status !== "PENDING") {
    throw new Error("Bestätigte Einträge kannst du nicht löschen.");
  }
  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/zeiten");
}

/** Bestätigten eigenen Eintrag zur Korrektur öffnen (Begründung nötig). */
export async function requestCorrection(
  id: string,
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const session = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    return { error: "Eintrag nicht gefunden." };
  }
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) return { error: "Bitte kurz begründen." };

  await prisma.timeEntry.update({
    where: { id },
    data: { status: "PENDING", correctionNote: reason },
  });
  revalidatePath("/zeiten");
  return { ok: true };
}

/* -------------------------------------------------------------------- Admin */

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
    await prisma.timeEntry.update({ where: { id: entryId }, data: parsed.data });
  } else {
    if (!userId) return { error: "Kein Mitarbeiter gewählt." };
    await prisma.timeEntry.create({
      data: { userId, ...parsed.data, source: "MANUAL", status: "CONFIRMED" },
    });
  }
  revalidatePath("/zeiten");
  revalidatePath("/zeiten/pruefen");
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
  revalidatePath(`/mitarbeiter/${entry.userId}/zeiten`);
}

export async function confirmAllForUser(userId: string) {
  await requireAdmin();
  await prisma.timeEntry.updateMany({
    where: { userId, status: "PENDING", end: { not: null } },
    data: { status: "CONFIRMED", correctionNote: null },
  });
  revalidatePath("/zeiten/pruefen");
  revalidatePath(`/mitarbeiter/${userId}/zeiten`);
}

export async function adminDeleteEntry(id: string) {
  await requireAdmin();
  const entry = await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/zeiten/pruefen");
  revalidatePath(`/mitarbeiter/${entry.userId}/zeiten`);
}
