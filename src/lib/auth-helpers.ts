import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
};

/**
 * Aktueller Benutzer inkl. Prüfung, dass die Zeile noch existiert und aktiv ist
 * (schützt vor "Geister-Sessions" nach dem Löschen eines Kontos).
 * Über den Request memoisiert.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!user || !user.active) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** Wirft auf /login, wenn nicht (mehr) angemeldet. */
export async function requireUser(): Promise<{ user: CurrentUser }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { user };
}

/** Wie requireUser, verlangt zusätzlich die Rolle ADMIN. */
export async function requireAdmin(): Promise<{ user: CurrentUser }> {
  const { user } = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return { user };
}
