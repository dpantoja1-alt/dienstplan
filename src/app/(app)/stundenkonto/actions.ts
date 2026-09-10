"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { dateFromKey } from "@/lib/shift";

export type PayoutState = { error?: string; ok?: boolean };

const keyRe = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  userId: z.string().min(1, "Kein Mitarbeiter gewählt."),
  date: z.string().regex(keyRe, "Datum fehlt."),
  hours: z.string().trim().min(1, "Stundenzahl fehlt."),
  note: z.string().trim().max(200).optional(),
});

/** Überstunden-Auszahlung: zieht die angegebenen Stunden vom Stundenkonto ab. */
export async function addOvertimePayout(
  _prev: PayoutState,
  formData: FormData,
): Promise<PayoutState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }

  const { userId, date, note } = parsed.data;
  const hours = Number(parsed.data.hours.replace(",", "."));
  if (!Number.isFinite(hours) || hours <= 0) {
    return { error: "Stundenzahl muss eine Zahl größer als 0 sein." };
  }
  if (hours > 1000) {
    return { error: "Stundenzahl ist unrealistisch hoch." };
  }
  await prisma.balanceAdjustment.create({
    data: {
      userId,
      date: dateFromKey(date),
      minutes: -Math.round(hours * 60), // Auszahlung = Abzug
      note: note || null,
    },
  });

  revalidatePath("/stundenkonto");
  return { ok: true };
}

export async function deleteBalanceAdjustment(id: string) {
  await requireAdmin();
  await prisma.balanceAdjustment.delete({ where: { id } });
  revalidatePath("/stundenkonto");
}
