import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/shift";
import { OTHER_ABSENCE_TYPES } from "@/lib/absence-view";
import { AbsenceRow } from "../urlaub/absence-row";
import { AdminAddAbsence } from "../urlaub/admin-add-absence";

export const metadata: Metadata = { title: "Abwesenheiten – Eifel Wagyu" };

export default async function AbwesenheitenPage({ searchParams }: PageProps<"/abwesenheiten">) {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";
  const sp = await searchParams;
  const year =
    typeof sp.j === "string" && /^\d{4}$/.test(sp.j) ? Number(sp.j) : new Date().getFullYear();
  const yStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yEnd = new Date(`${year}-12-31T00:00:00.000Z`);

  const [rows, users] = await Promise.all([
    prisma.absence.findMany({
      where: {
        type: { not: "VACATION" },
        ...(isAdmin ? {} : { userId: session.user.id }),
        startDate: { lte: yEnd },
        endDate: { gte: yStart },
      },
      orderBy: { startDate: "desc" },
      include: { user: { select: { name: true } } },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { active: true },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const nav = "rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Abwesenheiten</h1>
        <div className="flex items-center gap-2">
          <Link href={`/abwesenheiten?j=${year - 1}` as Route} className={nav}>←</Link>
          <span className="min-w-16 text-center font-medium">{year}</span>
          <Link href={`/abwesenheiten?j=${year + 1}` as Route} className={nav}>→</Link>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Krankheit und sonstige Abwesenheiten. Urlaub findest du unter „Urlaub“.
      </p>

      {isAdmin && (
        <div>
          <AdminAddAbsence users={users} types={OTHER_ABSENCE_TYPES} label="Abwesenheit eintragen" />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Keine Einträge.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {rows.map((a) => (
            <AbsenceRow
              key={a.id}
              a={{
                id: a.id,
                userId: a.userId,
                userName: isAdmin ? a.user.name : undefined,
                type: a.type,
                startKey: dateKey(a.startDate),
                endKey: dateKey(a.endDate),
                halfDay: a.halfDay,
                status: a.status,
                note: a.note,
              }}
              mode={isAdmin ? "admin" : "own"}
              users={users}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
