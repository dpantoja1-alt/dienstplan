"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { dateFromKey } from "@/lib/shift";
import { audit } from "@/lib/audit";
import { fmtKey } from "@/lib/audit-format";
import { formatMinutes } from "@/lib/worktime";

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
  const session = await requireAdmin();

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
  const created = await prisma.balanceAdjustment.create({
    data: {
      userId,
      date: dateFromKey(date),
      minutes: -Math.round(hours * 60), // Auszahlung = Abzug
      note: note || null,
    },
  });
  await audit({
    actor: session.user,
    action: "balance.payout",
    subjectUserId: userId,
    entityId: created.id,
    summary: `Überstunden-Auszahlung gebucht: ${formatMinutes(created.minutes)} zum ${fmtKey(date)}`,
    after: { date, minutes: created.minutes, note: created.note },
  });

  revalidatePath("/stundenkonto");
  return { ok: true };
}

export async function deleteBalanceAdjustment(id: string) {
  const session = await requireAdmin();
  const old = await prisma.balanceAdjustment.delete({ where: { id } });
  const date = old.date.toISOString().slice(0, 10);
  await audit({
    actor: session.user,
    action: "balance.delete",
    subjectUserId: old.userId,
    entityId: id,
    summary: `Stundenkonto-Buchung gelöscht: ${formatMinutes(old.minutes)} zum ${fmtKey(date)}`,
    before: { date, minutes: old.minutes, note: old.note },
  });
  revalidatePath("/stundenkonto");
}
