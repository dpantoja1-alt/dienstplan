import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Übersicht – Dienstplan",
};

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const firstName = user.name?.split(" ")[0] ?? "";
  const isAdmin = user.role === "ADMIN";

  const [employeeCount, pendingCount] = isAdmin
    ? await Promise.all([
        prisma.user.count({ where: { role: "EMPLOYEE" } }),
        prisma.user.count({ where: { passwordHash: null } }),
      ])
    : [0, 0];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Hallo {firstName} 👋</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Willkommen im Dienstplan.
      </p>

      {isAdmin ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/mitarbeiter"
            className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          >
            <div className="text-3xl font-semibold">{employeeCount}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Mitarbeiter
              {pendingCount > 0 && ` · ${pendingCount} offene Einladung${pendingCount === 1 ? "" : "en"}`}
            </div>
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Dein Schichtplan und deine Zeiten erscheinen hier, sobald die nächsten
          Phasen fertig sind.
        </div>
      )}
    </div>
  );
}
