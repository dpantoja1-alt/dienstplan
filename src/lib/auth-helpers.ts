import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Wirft den Besucher auf /login, wenn nicht angemeldet. Gibt sonst die Session zurück. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/** Wie requireUser, verlangt zusätzlich die Rolle ADMIN. */
export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}
