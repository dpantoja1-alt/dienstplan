import type { Metadata } from "next";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Dashboard – Dienstplan",
};

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Hallo {firstName} 👋</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Willkommen im Dienstplan. Hier entstehen als Nächstes die
        Mitarbeiterprofile, die Zeiterfassung und der Schichtplan.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <p className="font-medium text-slate-800 dark:text-slate-100">
          Phase 1 steht: Grundgerüst, Login und Deployment.
        </p>
        <p className="mt-1">
          {session?.user?.role === "ADMIN"
            ? "Als Admin kannst du künftig Mitarbeiter-Konten anlegen und Pläne verwalten."
            : "Als Mitarbeiter siehst du hier bald deinen Plan und deine Zeiten."}
        </p>
      </div>
    </div>
  );
}
