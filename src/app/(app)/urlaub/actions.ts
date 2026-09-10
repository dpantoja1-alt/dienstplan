"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { dateFromKey } from "@/lib/shift";

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

  await prisma.absence.create({
    data: {
      userId: session.user.id,
      type: "VACATION",
      status: "PENDING",
      ...parsed.data,
    },
  });
  revalidatePath("/urlaub");
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
  revalidatePath("/urlaub");
  revalidatePath("/urlaub/antraege");
}

/* ------------------------------------------------------------------- Admin */

const adminSchema = z.object({
  entryId: z.string().optional(),
  userId: z.string().min(1, "Kein Mitarbeiter gewählt"),
  type: z.enum(["VACATION", "SICK", "OTHER"]),
});

export async function adminSaveAbsence(
  _prev: AbsenceFormState,
  formData: FormData,
): Promise<AbsenceFormState> {
  await requireAdmin();

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
    await prisma.absence.update({
      where: { id: meta.data.entryId },
      data: { type: meta.data.type, status: "APPROVED", ...dates.data },
    });
  } else {
    await prisma.absence.create({
      data: {
        userId: meta.data.userId,
        type: meta.data.type,
        status: "APPROVED", // Direkteintrag durch Admin gilt als genehmigt
        ...dates.data,
      },
    });
  }
  revalidatePath("/urlaub");
  revalidatePath("/urlaub/antraege");
  revalidatePath("/stundenkonto");
  revalidatePath("/plan");
  return { ok: true };
}

/** Schnell-Eintrag aus dem Plan: 1 Tag, sofort genehmigt. */
export async function quickAddAbsence(
  userId: string,
  dateKey: string,
  type: "VACATION" | "SICK" | "OTHER",
) {
  await requireAdmin();
  if (!keyRe.test(dateKey)) throw new Error("Ungültiges Datum.");
  const date = dateFromKey(dateKey);
  await prisma.absence.create({
    data: { userId, type, status: "APPROVED", startDate: date, endDate: date },
  });
  revalidatePath("/plan");
  revalidatePath("/urlaub");
  revalidatePath("/stundenkonto");
}

export async function decideAbsence(id: string, approve: boolean) {
  await requireAdmin();
  await prisma.absence.update({
    where: { id },
    data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date() },
  });
  revalidatePath("/urlaub");
  revalidatePath("/urlaub/antraege");
  revalidatePath("/stundenkonto");
  revalidatePath("/plan");
}

export async function deleteAbsence(id: string) {
  await requireAdmin();
  await prisma.absence.delete({ where: { id } });
  revalidatePath("/urlaub");
  revalidatePath("/urlaub/antraege");
  revalidatePath("/stundenkonto");
  revalidatePath("/plan");
}
