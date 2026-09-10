import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden – Eifel Wagyu",
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4">
      <Logo size="lg" />

      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold [font-family:var(--font-accent)]">
          Dienstplan
        </h1>
        <p className="mb-6 text-sm text-muted">
          Bitte mit deinen Zugangsdaten anmelden.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
