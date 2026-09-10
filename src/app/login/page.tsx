import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden – Dienstplan",
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="mb-1 text-xl font-semibold">Dienstplan</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Bitte mit deinen Zugangsdaten anmelden.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
