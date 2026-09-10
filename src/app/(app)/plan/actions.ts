"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { dateFromKey, hhmmToMinutes } from "@/lib/shift";

export type ShiftFormState = { error?: string; ok?: boolean };

const keyRe = /^\d{4}-\d{2}-\d{2}$/;

export async function assignShiftFromTemplate(
  userId: string,
  dateKey: string,
  templateId: string,
) {
  await requireAdmin();
  if (!keyRe.test(dateKey)) throw new Error("Ungültiges Datum.");

  const template = await prisma.shiftTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Vorlage nicht gefunden.");

  const date = dateFromKey(dateKey);
  const existing = await prisma.shift.findFirst({
    where: { userId, date, startMinutes: template.startMinutes },
  });
  if (existing) return; // Doppelklick abfangen

  await prisma.shift.create({
    data: {
      userId,
      date,
      templateId: template.id,
      startMinutes: template.startMinutes,
      endMinutes: template.endMinutes,
      breakMinutes: template.breakMinutes,
      label: template.shortLabel,
      color: template.color,
    },
  });
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

const customSchema = z
  .object({
    userId: z.string().min(1),
    dateKey: z.string().regex(keyRe),
    shiftId: z.string().optional(),
    label: z.string().trim().min(1, "Bezeichnung fehlt").max(40),
    start: z.string().trim(),
    end: z.string().trim(),
    breakMinutes: z.string().optional(),
    note: z.string().trim().max(200).optional(),
    color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
  })
  .transform((v, ctx) => {
    const start = hhmmToMinutes(v.start);
    const end = hhmmToMinutes(v.end);
    if (start === null || end === null) {
      ctx.addIssue({ code: "custom", message: "Zeit ungültig (HH:MM)" });
      return z.NEVER;
    }
    if (start === end) {
      ctx.addIssue({ code: "custom", message: "Start und Ende sind gleich" });
      return z.NEVER;
    }
    let breakMinutes: number | null = null;
    if (v.breakMinutes && v.breakMinutes.trim() !== "") {
      const n = Number(v.breakMinutes);
      if (!Number.isInteger(n) || n < 0 || n > 240) {
        ctx.addIssue({ code: "custom", message: "Pause 0–240 Minuten" });
        return z.NEVER;
      }
      breakMinutes = n;
    }
    return {
      userId: v.userId,
      dateKey: v.dateKey,
      shiftId: v.shiftId || null,
      label: v.label,
      startMinutes: start,
      endMinutes: end,
      breakMinutes,
      note: v.note || null,
      color: v.color,
    };
  });

export async function saveCustomShift(
  _prev: ShiftFormState,
  formData: FormData,
): Promise<ShiftFormState> {
  await requireAdmin();
  const parsed = customSchema.safeParse({
    userId: formData.get("userId"),
    dateKey: formData.get("dateKey"),
    shiftId: formData.get("shiftId") ?? undefined,
    label: formData.get("label"),
    start: formData.get("start"),
    end: formData.get("end"),
    breakMinutes: formData.get("breakMinutes") ?? undefined,
    note: formData.get("note") ?? undefined,
    color: formData.get("color") || "#64748b",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }
  const d = parsed.data;
  const saveAsTemplate = formData.get("saveAsTemplate") === "on" && !d.shiftId;

  if (d.shiftId) {
    await prisma.shift.update({
      where: { id: d.shiftId },
      data: {
        label: d.label,
        startMinutes: d.startMinutes,
        endMinutes: d.endMinutes,
        breakMinutes: d.breakMinutes,
        note: d.note,
        color: d.color,
        templateId: null,
      },
    });
  } else {
    let templateId: string | null = null;
    if (saveAsTemplate) {
      const existing = await prisma.shiftTemplate.findFirst({
        where: { name: { equals: d.label, mode: "insensitive" } },
      });
      if (existing) {
        templateId = existing.id;
      } else {
        const count = await prisma.shiftTemplate.count();
        const created = await prisma.shiftTemplate.create({
          data: {
            name: d.label,
            shortLabel: d.label.slice(0, 12),
            startMinutes: d.startMinutes,
            endMinutes: d.endMinutes,
            breakMinutes: d.breakMinutes,
            color: d.color,
            sortOrder: count,
          },
        });
        templateId = created.id;
      }
    }

    await prisma.shift.create({
      data: {
        userId: d.userId,
        date: dateFromKey(d.dateKey),
        templateId,
        label: d.label,
        startMinutes: d.startMinutes,
        endMinutes: d.endMinutes,
        breakMinutes: d.breakMinutes,
        note: d.note,
        color: d.color,
      },
    });
  }
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  revalidatePath("/schichtvorlagen");
  return { ok: true };
}

/** Eine bestehende (freie) Schicht als wiederverwendbare Vorlage speichern. */
export async function saveShiftAsTemplate(
  shiftId: string,
): Promise<{ created: boolean }> {
  await requireAdmin();
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error("Schicht nicht gefunden.");

  const existing = await prisma.shiftTemplate.findFirst({
    where: { name: { equals: shift.label, mode: "insensitive" } },
  });
  if (existing) {
    await prisma.shift.update({ where: { id: shiftId }, data: { templateId: existing.id } });
    return { created: false };
  }

  const count = await prisma.shiftTemplate.count();
  const template = await prisma.shiftTemplate.create({
    data: {
      name: shift.label,
      shortLabel: shift.label.slice(0, 12),
      startMinutes: shift.startMinutes,
      endMinutes: shift.endMinutes,
      breakMinutes: shift.breakMinutes,
      color: shift.color,
      sortOrder: count,
    },
  });
  await prisma.shift.update({ where: { id: shiftId }, data: { templateId: template.id } });
  revalidatePath("/plan");
  revalidatePath("/schichtvorlagen");
  return { created: true };
}

export async function removeShift(id: string) {
  await requireAdmin();
  await prisma.shift.delete({ where: { id } });
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function copyPreviousWeek(mondayKey: string) {
  await requireAdmin();
  if (!keyRe.test(mondayKey)) throw new Error("Ungültige Woche.");

  const thisMonday = dateFromKey(mondayKey);
  const prevMonday = addDays(thisMonday, -7);
  const prevSunday = addDays(thisMonday, -1);

  const [source, existing] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: prevMonday, lte: prevSunday } },
    }),
    prisma.shift.findMany({
      where: { date: { gte: thisMonday, lte: addDays(thisMonday, 6) } },
      select: { userId: true, date: true, startMinutes: true },
    }),
  ]);

  const seen = new Set(
    existing.map((s) => `${s.userId}|${s.date.toISOString().slice(0, 10)}|${s.startMinutes}`),
  );

  const toCreate = source
    .map((s) => {
      const newDate = addDays(s.date, 7);
      const key = `${s.userId}|${newDate.toISOString().slice(0, 10)}|${s.startMinutes}`;
      if (seen.has(key)) return null;
      return {
        userId: s.userId,
        date: newDate,
        templateId: s.templateId,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        breakMinutes: s.breakMinutes,
        label: s.label,
        color: s.color,
        note: s.note,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (toCreate.length > 0) {
    await prisma.shift.createMany({ data: toCreate });
  }
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { created: toCreate.length };
}

export async function clearWeek(mondayKey: string) {
  await requireAdmin();
  if (!keyRe.test(mondayKey)) throw new Error("Ungültige Woche.");
  const monday = dateFromKey(mondayKey);
  await prisma.shift.deleteMany({
    where: { date: { gte: monday, lte: addDays(monday, 6) } },
  });
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}
