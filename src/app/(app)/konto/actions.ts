"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema, verifyPassword } from "@/lib/password";

const schema = z
  .object({
    current: z.string().min(1, "Aktuelles Passwort fehlt"),
    next: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

export type PasswordState = { error?: string; ok?: boolean };

export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await requireUser();

  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return { error: "Konto nicht gefunden." };

  const valid = await verifyPassword(parsed.data.current, user.passwordHash);
  if (!valid) return { error: "Aktuelles Passwort ist falsch." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });

  return { ok: true };
}
