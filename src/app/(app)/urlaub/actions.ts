"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ABSENCE_KINDS, type AbsenceKind } from "@/lib/absence-types";
import { dateFromKey } from "@/lib/shift";
import { audit, changedFields } from "@/lib/audit";
import { absenceSnapshot, absenceText, fmtKey } from "@/lib/audit-format";

export type AbsenceFormState = { error?: string; ok?: boolean };

const keyRe = /^\d{4}-\d{2}-\d{2}$/;

const baseSchema = z
  .object({
    start: z.string().regex(keyRe, "Startdatum fehlt"),
    end: z.string().regex(keyRe, "Enddatum fehlt"),
    halfDay: z.string().optional(),
    note: z.string().trim().max(300).optional(),
  })
  .transform((v, ctx) => {
    if (v.end < v.start) {
      ctx.addIssue({ code: "custom", message: "Ende liegt vor dem Start" });
      return z.NEVER;
    }
    const halfDay = v.halfDay === "on" || v.halfDay === "true";
    if (halfDay && v.start !== v.end) {
      ctx.addIssue({ code: "custom", message: "Halbe Tage nur bei einem einzelnen Datum" });
      return z.NEVER;
    }
    return {
      startDate: dateFromKey(v.start),
      endDate: dateFromKey(v.end),
      halfDay,
      note: v.note?.trim() || null,
    };
  });

/* --------------------------------------------------- Mitarbeiter: Urlaubsantrag */

export async function requestVacation(
  _prev: AbsenceFormState,
  formData: FormData,
): Promise<AbsenceFormState> {
  const session = await requireUser();
  const parsed = baseSchema.safeParse({
    start: formData.get("start"),
    end: formData.get("end"),
    halfDay: formData.get("halfDay") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }

  const created = await prisma.absence.create({
    data: {
      userId: session.user.id,
      type: "VACATION",
      status: "PENDING",
      ...parsed.data,
    },
  });
  const snap = absenceSnapshot(created);
  await audit({
    actor: session.user,
    action: "absence.request",
    subjectUserId: session.user.id,
    entityId: created.id,
    summary: `Urlaubsantrag gestellt: ${absenceText(snap)}`,
    after: snap,
  });
  revalidatePath("/urlaub");
  revalidatePath("/abwesenheiten");
  revalidatePath("/urlaub/antraege");
  return { ok: true };
}

export async function cancelOwnAbsence(id: string) {
  const session = await requireUser();
  const absence = await prisma.absence.findUnique({ where: { id } });
  if (!absence || absence.userId !== session.user.id) {
    throw new Error("Antrag nicht gefunden.");
  }
  if (absence.status !== "PENDING") {
    throw new Error("Nur offene Anträge lassen sich zurückziehen.");
  }
  await prisma.absence.delete({ where: { id } });
  const snap = absenceSnapshot(absence);
  await audit({
    actor: session.user,
    action: "absence.cancel",
    subjectUserId: absence.userId,
    entityId: id,
    summary: `Urlaubsantrag zurückgezogen: ${absenceText(snap)}`,
    before: snap,
  });
  revalidatePath("/urlaub");
  revalidatePath("/abwesenheiten");
  revalidatePath("/urlaub/antraege");
}

/* ------------------------------------------------------------------- Admin */

const adminSchema = z.object({
  entryId: z.string().optional(),
  userId: z.string().min(1, "Kein Mitarbeiter gewählt"),
  type: z.enum(ABSENCE_KINDS as [AbsenceKind, ...AbsenceKind[]]),
});

export async function adminSaveAbsence(
  _prev: AbsenceFormState,
  formData: FormData,
): Promise<AbsenceFormState> {
  const session = await requireAdmin();

  const meta = adminSchema.safeParse({
    entryId: formData.get("entryId") ?? undefined,
    userId: formData.get("userId"),
    type: formData.get("type"),
  });
  const dates = baseSchema.safeParse({
    start: formData.get("start"),
    end: formData.get("end"),
    halfDay: formData.get("halfDay") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!meta.success) return { error: meta.error.issues[0]?.message ?? "Eingabe ungültig." };
  if (!dates.success) return { error: dates.error.issues[0]?.message ?? "Eingabe ungültig." };

  if (meta.data.entryId) {
    const old = await prisma.absence.findUnique({ where: { id: meta.data.entryId } });
    if (!old) return { error: "Eintrag nicht gefunden." };
    const updated = await prisma.absence.update({
      where: { id: meta.data.entryId },
      data: { type: meta.data.type, status: "APPROVED", ...dates.data },
    });
    const before = absenceSnapshot(old);
    const after = absenceSnapshot(updated);
    await audit({
      actor: session.user,
      action: "absence.update",
      subjectUserId: updated.userId,
      entityId: updated.id,
      summary: `Abwesenheit geändert: ${absenceText(before)} → ${absenceText(after)}`,
      ...changedFields(before, after),
    });
  } else {
    const created = await prisma.absence.create({
      data: {
        userId: meta.data.userId,
        type: meta.data.type,
        status: "APPROVED", // Direkteintrag durch Admin gilt als genehmigt
        ...dates.data,
      },
    });
    const snap = absenceSnapshot(created);
    await audit({
      actor: session.user,
      action: "absence.create",
      subjectUserId: created.userId,
      entityId: created.id,
      summary: `Abwesenheit eingetragen: ${absenceText(snap)}`,
      after: snap,
    });
  }
  revalidatePath("/urlaub");
  revalidatePath("/abwesenheiten");
  revalidatePath("/urlaub/antraege");
  revalidatePath("/stundenkonto");
  revalidatePath("/plan");
  return { ok: true };
}

/** Schnell-Eintrag aus dem Plan: 1 Tag, sofort genehmigt. */
export async function quickAddAbsence(
  userId: string,
  dateKey: string,
  type: AbsenceKind,
) {
  const session = await requireAdmin();
  if (!keyRe.test(dateKey)) throw new Error("Ungültiges Datum.");
  const date = dateFromKey(dateKey);
  const created = await prisma.absence.create({
    data: { userId, type, status: "APPROVED", startDate: date, endDate: date },
  });
  const snap = absenceSnapshot(created);
  await audit({
    actor: session.user,
    action: "absence.create",
    subjectUserId: userId,
    entityId: created.id,
    summary: `Abwesenheit eingetragen (Plan): ${absenceText(snap)}`,
    after: snap,
  });
  revalidatePath("/plan");
  revalidatePath("/urlaub");
  revalidatePath("/abwesenheiten");
  revalidatePath("/stundenkonto");
}

export async function decideAbsence(id: string, approve: boolean) {
  const session = await requireAdmin();
  const updated = await prisma.absence.update({
    where: { id },
    data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date() },
  });
  await audit({
    actor: session.user,
    action: approve ? "absence.approve" : "absence.reject",
    subjectUserId: updated.userId,
    entityId: id,
    summary: `${approve ? "Genehmigt" : "Abgelehnt"}: ${absenceText(absenceSnapshot(updated))}`,
    after: { status: updated.status },
  });
  revalidatePath("/urlaub");
  revalidatePath("/abwesenheiten");
  revalidatePath("/urlaub/antraege");
  revalidatePath("/stundenkonto");
  revalidatePath("/plan");
}

export async function deleteAbsence(id: string) {
  const session = await requireAdmin();
  const old = await prisma.absence.delete({ where: { id } });
  const snap = absenceSnapshot(old);
  await audit({
    actor: session.user,
    action: "absence.delete",
    subjectUserId: old.userId,
    entityId: id,
    summary: `Abwesenheit gelöscht: ${absenceText(snap)}`,
    before: snap,
  });
  revalidatePath("/urlaub");
  revalidatePath("/abwesenheiten");
  revalidatePath("/urlaub/antraege");
  revalidatePath("/stundenkonto");
  revalidatePath("/plan");
}

/* --------------------------------------------------- Resturlaub-Übertrag */

const carrySchema = z.object({
  userId: z.string().min(1),
  year: z.coerce.number().int().min(2026).max(2100),
  days: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && Math.abs(v) <= 100), "Ungültige Tageszahl"),
  expiresOn: z
    .string()
    .trim()
    .refine((v) => v === "" || keyRe.test(v), "Ungültiges Datum")
    .transform((v) => (v === "" ? null : v)),
  note: z.string().trim().max(200).optional(),
});

type CarrySnapshot = { days: number | null; expiresOn: string | null; note: string | null } | null;

function describeCarry(v: CarrySnapshot): string {
  if (!v) return "automatisch, verfällt nicht";
  const days = v.days === null ? "automatisch" : `${v.days} Tage`;
  const exp = v.expiresOn ? `verfällt nach ${fmtKey(v.expiresOn)}` : "verfällt nicht";
  return `${days}, ${exp}`;
}

/**
 * Legt den Übertrag ins Jahr fest: Tage leer = automatisch aus dem Vorjahr,
 * Verfallsdatum leer = verfällt nicht.
 */
export async function saveVacationCarry(
  _prev: AbsenceFormState,
  formData: FormData,
): Promise<AbsenceFormState> {
  const session = await requireAdmin();
  const parsed = carrySchema.safeParse({
    userId: formData.get("userId"),
    year: formData.get("year"),
    days: formData.get("days") ?? "",
    expiresOn: formData.get("expiresOn") ?? "",
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  const { userId, year, days, expiresOn } = parsed.data;
  const note = parsed.data.note || null;
  if (expiresOn && !expiresOn.startsWith(String(year))) {
    return { error: `Das Verfallsdatum muss im Jahr ${year} liegen.` };
  }

  const where = { userId_year: { userId, year } };
  const old = await prisma.vacationCarryover.findUnique({ where });
  const before: CarrySnapshot = old
    ? { days: old.days, expiresOn: old.expiresOn?.toISOString().slice(0, 10) ?? null, note: old.note }
    : null;
  const after: CarrySnapshot = days === null && !expiresOn && !note ? null : { days, expiresOn, note };

  if (!after) {
    if (old) await prisma.vacationCarryover.delete({ where });
  } else {
    const data = { days, expiresOn: expiresOn ? dateFromKey(expiresOn) : null, note };
    await prisma.vacationCarryover.upsert({ where, create: { userId, year, ...data }, update: data });
  }

  await audit({
    actor: session.user,
    action: "vacationCarry.save",
    subjectUserId: userId,
    summary: `Resturlaub-Übertrag ${year - 1} → ${year}: ${describeCarry(before)} → ${describeCarry(after)}`,
    before,
    after,
  });

  revalidatePath("/urlaub");
  revalidatePath("/dashboard");
  return { ok: true };
}
