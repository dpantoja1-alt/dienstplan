"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import {
  createInviteToken,
  inviteExpiryDate,
  inviteUrl,
} from "@/lib/invite";
import { sendInviteEmail } from "@/lib/email";
import { audit, changedFields } from "@/lib/audit";
import { fmtKey } from "@/lib/audit-format";
import { dateFromKey } from "@/lib/shift";
import { BASE_PERIOD_KEY, syncCurrentWorkTime } from "@/lib/work-schedule";

const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(120),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  weeklyHours: z.coerce.number().min(0).max(80),
  workDaysPerWeek: z.coerce.number().int().min(1).max(7),
  vacationDaysPerYear: z.coerce.number().min(0).max(60),
  minBreakMinutes: z.coerce.number().int().min(0).max(240),
  employmentStart: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : null))
    .refine((v) => v === null || !Number.isNaN(v.getTime()), "Ungültiges Datum"),
  monthlySalary: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : null))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 1_000_000),
      "Ungültiges Gehalt",
    ),
});

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "E-Mail",
  role: "Rolle",
  weeklyHours: "Wochenstunden",
  workDaysPerWeek: "Arbeitstage",
  vacationDaysPerYear: "Urlaubstage",
  minBreakMinutes: "Mindestpause",
  employmentStart: "Eintrittsdatum",
  monthlySalary: "Gehalt",
};

function employeeSnapshot(u: {
  name: string;
  email: string;
  role: string;
  weeklyHours: number;
  workDaysPerWeek: number;
  vacationDaysPerYear: number;
  minBreakMinutes: number;
  employmentStart: Date | null;
  monthlySalary: number | null;
}) {
  return {
    name: u.name,
    email: u.email,
    role: u.role,
    weeklyHours: u.weeklyHours,
    workDaysPerWeek: u.workDaysPerWeek,
    vacationDaysPerYear: u.vacationDaysPerYear,
    minBreakMinutes: u.minBreakMinutes,
    employmentStart: u.employmentStart?.toISOString().slice(0, 10) ?? null,
    monthlySalary: u.monthlySalary,
  };
}

/** Gehalt nur als „hinterlegt“ protokollieren, nie den Betrag. */
function maskSalary<T extends Record<string, unknown>>(snap: T): T {
  if (!("monthlySalary" in snap)) return snap;
  return { ...snap, monthlySalary: snap.monthlySalary == null ? null : "hinterlegt" };
}

export type EmployeeFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    weeklyHours: formData.get("weeklyHours"),
    workDaysPerWeek: formData.get("workDaysPerWeek"),
    vacationDaysPerYear: formData.get("vacationDaysPerYear"),
    minBreakMinutes: formData.get("minBreakMinutes"),
    employmentStart: formData.get("employmentStart"),
    monthlySalary: formData.get("monthlySalary"),
  });
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const session = await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Bitte Eingaben prüfen.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const { token, tokenHash } = createInviteToken();

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        weeklyHours: data.weeklyHours,
        workDaysPerWeek: data.workDaysPerWeek,
        vacationDaysPerYear: data.vacationDaysPerYear,
        minBreakMinutes: data.minBreakMinutes,
        employmentStart: data.employmentStart,
        monthlySalary: data.monthlySalary,
        active: false,
        inviteTokenHash: tokenHash,
        inviteExpiresAt: inviteExpiryDate(),
      },
    });
    userId = user.id;
    await audit({
      actor: session.user,
      action: "user.create",
      subjectUserId: user.id,
      entityId: user.id,
      summary: `Mitarbeiter angelegt: ${user.name}`,
      after: maskSalary(employeeSnapshot(user)),
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        error: "E-Mail bereits vergeben.",
        fieldErrors: { email: "Diese E-Mail wird schon verwendet." },
      };
    }
    throw err;
  }

  const url = inviteUrl(token, await getBaseUrl());
  const mail = await sendInviteEmail({ to: data.email, name: data.name, url });

  revalidatePath("/mitarbeiter");
  const mailFlag = mail.ok ? "sent" : "skipped";
  redirect(
    `/mitarbeiter/${userId}?token=${encodeURIComponent(token)}&mail=${mailFlag}`,
  );
}

export async function updateEmployee(
  id: string,
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const session = await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Bitte Eingaben prüfen.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const old = await prisma.user.findUnique({ where: { id } });
  if (!old) return { error: "Mitarbeiter nicht gefunden." };

  try {
    // Wochenstunden / Arbeitstage werden nicht hier geändert, sondern über den
    // Arbeitszeit-Verlauf mit Gültigkeitsdatum (addWorkSchedule).
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        vacationDaysPerYear: data.vacationDaysPerYear,
        minBreakMinutes: data.minBreakMinutes,
        employmentStart: data.employmentStart,
        monthlySalary: data.monthlySalary,
      },
    });
    const diff = changedFields(employeeSnapshot(old), employeeSnapshot(updated));
    if (Object.keys(diff.after).length > 0) {
      await audit({
        actor: session.user,
        action: "user.update",
        subjectUserId: id,
        entityId: id,
        summary: `Stammdaten geändert: ${Object.keys(diff.after).map((k) => FIELD_LABELS[k] ?? k).join(", ")}`,
        before: maskSalary(diff.before),
        after: maskSalary(diff.after),
      });
    }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        error: "E-Mail bereits vergeben.",
        fieldErrors: { email: "Diese E-Mail wird schon verwendet." },
      };
    }
    throw err;
  }

  revalidatePath("/mitarbeiter");
  revalidatePath(`/mitarbeiter/${id}`);
  redirect(`/mitarbeiter/${id}?gespeichert=1`);
}

export async function setEmployeeActive(id: string, active: boolean) {
  const session = await requireAdmin();
  if (session.user.id === id && !active) {
    throw new Error("Du kannst dich nicht selbst deaktivieren.");
  }
  const user = await prisma.user.update({ where: { id }, data: { active } });
  await audit({
    actor: session.user,
    action: active ? "user.activate" : "user.deactivate",
    subjectUserId: id,
    entityId: id,
    summary: `${user.name} ${active ? "aktiviert" : "deaktiviert"}`,
  });
  revalidatePath("/mitarbeiter");
  revalidatePath(`/mitarbeiter/${id}`);
}

/** Zählt, was beim Löschen mit entfernt würde. */
export async function employeeDeletionImpact(id: string): Promise<{
  timeEntries: number;
  shifts: number;
  absences: number;
}> {
  await requireAdmin();
  const [timeEntries, shifts, absences] = await Promise.all([
    prisma.timeEntry.count({ where: { userId: id } }),
    prisma.shift.count({ where: { userId: id } }),
    prisma.absence.count({ where: { userId: id } }),
  ]);
  return { timeEntries, shifts, absences };
}

export async function deleteEmployee(id: string) {
  const session = await requireAdmin();
  if (session.user.id === id) {
    throw new Error("Du kannst dein eigenes Konto nicht löschen.");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, name: true },
  });
  if (!target) throw new Error("Mitarbeiter nicht gefunden.");

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Der letzte Admin kann nicht gelöscht werden.");
    }
  }

  const impact = await employeeDeletionImpact(id);
  // Zeiterfassung, Schichten und Abwesenheiten werden per Cascade mitgelöscht.
  await prisma.user.delete({ where: { id } });
  await audit({
    actor: session.user,
    action: "user.delete",
    subjectUserId: id,
    entityId: id,
    summary: `Mitarbeiter gelöscht: ${target.name} (mit ${impact.timeEntries} Zeiten, ${impact.shifts} Schichten, ${impact.absences} Abwesenheiten)`,
  });

  revalidatePath("/mitarbeiter");
  revalidatePath("/plan");
  revalidatePath("/zeiten/team");
  redirect("/mitarbeiter");
}

/** Erzeugt einen frischen Einladungslink (z. B. wenn der alte abgelaufen ist). */
export async function regenerateInvite(id: string): Promise<{ url: string }> {
  const session = await requireAdmin();

  const { token, tokenHash } = createInviteToken();
  const user = await prisma.user.update({
    where: { id },
    data: {
      inviteTokenHash: tokenHash,
      inviteExpiresAt: inviteExpiryDate(),
      active: false,
      passwordHash: null,
    },
  });

  const url = inviteUrl(token, await getBaseUrl());
  await sendInviteEmail({ to: user.email, name: user.name, url });
  await audit({
    actor: session.user,
    action: "user.reinvite",
    subjectUserId: id,
    entityId: id,
    summary: `Neuer Einladungslink für ${user.name} (Passwort zurückgesetzt, Konto inaktiv bis zur Annahme)`,
  });

  revalidatePath(`/mitarbeiter/${id}`);
  return { url };
}

/* ------------------------------------------------------ Arbeitszeit-Verlauf */

export type WorkScheduleState = { error?: string; ok?: boolean };

const scheduleSchema = z.object({
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum fehlt"),
  weeklyHours: z.coerce.number().min(0, "0–80 Std.").max(80, "0–80 Std."),
  workDaysPerWeek: z.coerce.number().int().min(1, "1–7 Tage").max(7, "1–7 Tage"),
  note: z.string().trim().max(200).optional(),
});

/**
 * Neue Arbeitszeit ab einem Stichtag. Beim ersten Wechsel wird der bisherige
 * Stand als Basis-Periode festgehalten, damit frühere Monate unverändert bleiben.
 */
export async function addWorkSchedule(
  userId: string,
  _prev: WorkScheduleState,
  formData: FormData,
): Promise<WorkScheduleState> {
  const session = await requireAdmin();
  const parsed = scheduleSchema.safeParse({
    validFrom: formData.get("validFrom"),
    weeklyHours: String(formData.get("weeklyHours") ?? "").replace(",", "."),
    workDaysPerWeek: formData.get("workDaysPerWeek"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  const { validFrom, weeklyHours, workDaysPerWeek } = parsed.data;
  const note = parsed.data.note || null;
  if (validFrom <= BASE_PERIOD_KEY) return { error: "Datum zu früh." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyHours: true, workDaysPerWeek: true },
  });
  if (!user) return { error: "Mitarbeiter nicht gefunden." };

  const existing = await prisma.workSchedule.count({ where: { userId } });
  await prisma.$transaction([
    ...(existing === 0
      ? [
          prisma.workSchedule.create({
            data: {
              userId,
              validFrom: dateFromKey(BASE_PERIOD_KEY),
              weeklyHours: user.weeklyHours,
              workDaysPerWeek: user.workDaysPerWeek,
              note: "Stand vor der ersten Änderung",
            },
          }),
        ]
      : []),
    prisma.workSchedule.upsert({
      where: { userId_validFrom: { userId, validFrom: dateFromKey(validFrom) } },
      create: { userId, validFrom: dateFromKey(validFrom), weeklyHours, workDaysPerWeek, note },
      update: { weeklyHours, workDaysPerWeek, note },
    }),
  ]);
  await syncCurrentWorkTime(userId);

  await audit({
    actor: session.user,
    action: "workSchedule.add",
    subjectUserId: userId,
    summary: `Arbeitszeit ab ${fmtKey(validFrom)}: ${weeklyHours} Std./Woche, ${workDaysPerWeek} Tage`,
    after: { validFrom, weeklyHours, workDaysPerWeek, note },
  });

  revalidateWorkTime(userId);
  return { ok: true };
}

export async function deleteWorkSchedule(id: string) {
  const session = await requireAdmin();
  const row = await prisma.workSchedule.findUnique({ where: { id } });
  if (!row) return;
  const fromKey = row.validFrom.toISOString().slice(0, 10);
  if (fromKey === BASE_PERIOD_KEY) throw new Error("Der Ausgangsstand lässt sich nicht löschen.");

  await prisma.workSchedule.delete({ where: { id } });
  await syncCurrentWorkTime(row.userId);
  // Bleibt nur der Ausgangsstand übrig, ist der Verlauf überflüssig.
  const rest = await prisma.workSchedule.findMany({ where: { userId: row.userId } });
  if (rest.length === 1 && rest[0].validFrom.toISOString().startsWith(BASE_PERIOD_KEY)) {
    await prisma.workSchedule.delete({ where: { id: rest[0].id } });
  }

  await audit({
    actor: session.user,
    action: "workSchedule.delete",
    subjectUserId: row.userId,
    entityId: id,
    summary: `Arbeitszeit-Änderung ab ${fmtKey(fromKey)} entfernt (${row.weeklyHours} Std./Woche, ${row.workDaysPerWeek} Tage)`,
    before: { validFrom: fromKey, weeklyHours: row.weeklyHours, workDaysPerWeek: row.workDaysPerWeek, note: row.note },
  });

  revalidateWorkTime(row.userId);
}

function revalidateWorkTime(userId: string) {
  revalidatePath(`/mitarbeiter/${userId}`);
  revalidatePath("/mitarbeiter");
  revalidatePath("/stundenkonto");
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}
