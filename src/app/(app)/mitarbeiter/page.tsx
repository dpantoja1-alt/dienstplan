import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mitarbeiter – Dienstplan",
};

export default async function MitarbeiterPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      passwordHash: true,
      vacationDaysPerYear: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mitarbeiter</h1>
        <Link
          href="/mitarbeiter/neu"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          + Mitarbeiter
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {users.map((u) => {
          const status = !u.passwordHash
            ? { label: "Einladung offen", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }
            : u.active
              ? { label: "Aktiv", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" }
              : { label: "Inaktiv", cls: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
          return (
            <li key={u.id}>
              <Link
                href={`/mitarbeiter/${u.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{u.name}</span>
                    {u.role === "ADMIN" && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {u.email} · {u.vacationDaysPerYear} Urlaubstage
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                  {status.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
