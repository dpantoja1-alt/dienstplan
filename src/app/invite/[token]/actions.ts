"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema } from "@/lib/password";
import { hashInviteToken } from "@/lib/invite";

const schema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

export type AcceptState = { error?: string };

export async function acceptInvite(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig." };
  }

  const { token, password } = parsed.data;
  const tokenHash = hashInviteToken(token);

  const user = await prisma.user.findUnique({ where: { inviteTokenHash: tokenHash } });
  if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
    return { error: "Dieser Einladungslink ist ungültig oder abgelaufen." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      active: true,
      inviteTokenHash: null,
      inviteExpiresAt: null,
    },
  });

  try {
    await signIn("credentials", {
      email: user.email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Passwort ist gesetzt – zur Not manuell anmelden.
      return { error: "Passwort gesetzt. Bitte melde dich jetzt an." };
    }
    throw error;
  }
  return {};
}
