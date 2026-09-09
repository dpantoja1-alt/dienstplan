"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { hhmmToMinutes } from "@/lib/shift";

export type TemplateFormState = { error?: string; ok?: boolean };

const schema = z
  .object({
    name: z.string().trim().min(1, "Name fehlt").max(60),
    shortLabel: z.string().trim().min(1, "Kürzel fehlt").max(12),
    start: z.string().trim(),
    end: z.string().trim(),
    breakMinutes: z.string().optional(),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Farbe ungültig")
      .default("#64748b"),
  })
  .transform((v, ctx) => {
    const start = hhmmToMinutes(v.start);
    const end = hhmmToMinutes(v.end);
    if (start === null) {
      ctx.addIssue({ code: "custom", message: "Startzeit ungültig (HH:MM)" });
      return z.NEVER;
    }
    if (end === null) {
      ctx.addIssue({ code: "custom", message: "Endzeit ungültig (HH:MM)" });
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
      name: v.name,
      shortLabel: v.shortLabel,
      startMinutes: start,
      endMinutes: end,
      breakMinutes,
      color: v.color,
    };
  });

export async function saveTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    shortLabel: formData.get("shortLabel"),
    start: formData.get("start"),
    end: formData.get("end"),
    breakMinutes: formData.get("breakMinutes") ?? undefined,
    color: formData.get("color") || "#64748b",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }

  if (id) {
    await prisma.shiftTemplate.update({ where: { id }, data: parsed.data });
  } else {
    const count = await prisma.shiftTemplate.count();
    await prisma.shiftTemplate.create({
      data: { ...parsed.data, sortOrder: count },
    });
  }

  revalidatePath("/schichtvorlagen");
  revalidatePath("/plan");
  return { ok: true };
}

export async function toggleTemplateActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.shiftTemplate.update({ where: { id }, data: { active } });
  revalidatePath("/schichtvorlagen");
  revalidatePath("/plan");
}

export async function deleteTemplate(id: string) {
  await requireAdmin();
  // Zugewiesene Schichten behalten ihre Werte, verlieren nur die Verknüpfung.
  await prisma.shiftTemplate.delete({ where: { id } });
  revalidatePath("/schichtvorlagen");
  revalidatePath("/plan");
}
