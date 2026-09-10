import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "Konto – Eifel Wagyu",
};

export default async function KontoPage() {
  const session = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Konto</h1>
      <dl className="mt-4 text-sm">
        <div className="flex gap-2">
          <dt className="text-slate-500 dark:text-slate-400">Name:</dt>
          <dd>{session.user.name}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-500 dark:text-slate-400">E-Mail:</dt>
          <dd>{session.user.email}</dd>
        </div>
      </dl>

      <h2 className="mt-8 text-lg font-semibold">Passwort ändern</h2>
      <PasswordForm />
    </div>
  );
}
