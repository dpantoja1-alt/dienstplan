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
  await requireAdmin();

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
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Bitte Eingaben prüfen.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  try {
    await prisma.user.update({
      where: { id },
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
      },
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

  revalidatePath("/mitarbeiter");
  revalidatePath(`/mitarbeiter/${id}`);
  redirect(`/mitarbeiter/${id}?gespeichert=1`);
}

export async function setEmployeeActive(id: string, active: boolean) {
  const session = await requireAdmin();
  if (session.user.id === id && !active) {
    throw new Error("Du kannst dich nicht selbst deaktivieren.");
  }
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/mitarbeiter");
  revalidatePath(`/mitarbeiter/${id}`);
}

/** Erzeugt einen frischen Einladungslink (z. B. wenn der alte abgelaufen ist). */
export async function regenerateInvite(id: string): Promise<{ url: string }> {
  await requireAdmin();

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

  revalidatePath(`/mitarbeiter/${id}`);
  return { url };
}
