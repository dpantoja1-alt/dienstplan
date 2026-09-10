import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getVacationSummary } from "@/lib/account";
import { nrwHolidays } from "@/lib/holidays";
import { vacationEntitlement, absenceWorkdays } from "@/lib/soll";
import { dateKey } from "@/lib/shift";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RequestForm } from "./request-form";
import { AdminAddAbsence } from "./admin-add-absence";
import { AbsenceRow, type AbsenceView } from "./absence-row";

export const metadata: Metadata = { title: "Urlaub – Dienstplan" };

function YearNav({ year }: { year: number }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`/urlaub?j=${year - 1}` as Route} className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600">←</Link>
      <span className="min-w-16 text-center font-medium">{year}</span>
      <Link href={`/urlaub?j=${year + 1}` as Route} className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600">→</Link>
    </div>
  );
}

function toView(a: {
  id: string; userId: string; type: "VACATION" | "SICK" | "OTHER";
  startDate: Date; endDate: Date; halfDay: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED"; note: string | null;
}, userName?: string): AbsenceView {
  return {
    id: a.id, userId: a.userId, userName, type: a.type,
    startKey: dateKey(a.startDate), endKey: dateKey(a.endDate),
    halfDay: a.halfDay, status: a.status, note: a.note,
  };
}

export default async function UrlaubPage({ searchParams }: PageProps<"/urlaub">) {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";
  const sp = await searchParams;
  const now = new Date();
  const year = typeof sp.j === "string" && /^\d{4}$/.test(sp.j) ? Number(sp.j) : now.getFullYear();

  const yStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yEnd = new Date(`${year}-12-31T00:00:00.000Z`);
  const holidays = [...nrwHolidays(year).entries()].sort();

  if (!isAdmin) {
    const [summary, rows] = await Promise.all([
      getVacationSummary(session.user.id, year),
      prisma.absence.findMany({
        where: { userId: session.user.id, startDate: { lte: yEnd }, endDate: { gte: yStart } },
        orderBy: { startDate: "desc" },
      }),
    ]);

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Urlaub</h1>
          <YearNav year={year} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Anspruch" value={summary.entitlement} />
          <Stat label="Genommen" value={summary.taken} />
          <Stat label="Beantragt" value={summary.pending} />
          <Stat label="Rest" value={summary.remaining} highlight />
        </div>

        <RequestForm />

        <section>
          <h2 className="mb-2 text-lg font-semibold">Meine Abwesenheiten {year}</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Keine Einträge.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {rows.map((a) => (
                <AbsenceRow key={a.id} a={toView(a)} mode="own" />
              ))}
            </ul>
          )}
        </section>

        <HolidayList year={year} holidays={holidays} />
      </div>
    );
  }

  // ---- Admin ----
  const [users, rows, pendingCount] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, vacationDaysPerYear: true, employmentStart: true,
        absences: {
          where: { type: "VACATION", status: "APPROVED", startDate: { lte: yEnd }, endDate: { gte: yStart } },
          select: { startDate: true, endDate: true, halfDay: true },
        },
      },
    }),
    prisma.absence.findMany({
      where: { startDate: { lte: yEnd }, endDate: { gte: yStart } },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: { user: { select: { name: true } } },
    }),
    prisma.absence.count({ where: { status: "PENDING" } }),
  ]);

  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Urlaub</h1>
        <YearNav year={year} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AdminAddAbsence users={userOptions} />
        <Link
          href="/urlaub/antraege"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Offene Anträge
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-xs text-white">{pendingCount}</span>
          )}
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Urlaubskonten {year}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-1 pr-4">Mitarbeiter</th>
                <th className="py-1 pr-4 text-right">Anspruch</th>
                <th className="py-1 pr-4 text-right">Genommen</th>
                <th className="py-1 text-right">Rest</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const entitlement = vacationEntitlement(u.vacationDaysPerYear, u.employmentStart, year);
                const taken = absenceWorkdays(
                  u.absences.map((a) => ({
                    type: "VACATION" as const,
                    startKey: dateKey(a.startDate),
                    endKey: dateKey(a.endDate),
                    halfDay: a.halfDay,
                  })),
                  `${year}-01-01`,
                  `${year}-12-31`,
                );
                return (
                  <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800/60">
                    <td className="py-1.5 pr-4">{u.name}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{entitlement}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{taken}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{entitlement - taken}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Alle Abwesenheiten {year}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Keine Einträge.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {rows.map((a) => (
              <AbsenceRow key={a.id} a={toView(a, a.user.name)} mode="admin" users={userOptions} />
            ))}
          </ul>
        )}
      </section>

      <HolidayList year={year} holidays={holidays} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-slate-400 dark:border-slate-500" : "border-slate-200 dark:border-slate-800"}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label} (Tage)</div>
    </div>
  );
}

function HolidayList({ year, holidays }: { year: number; holidays: [string, string][] }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Feiertage {year} (NRW)</h2>
      <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {holidays.map(([key, name]) => (
          <li key={key} className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800/60">
            <span>{name}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {format(new Date(`${key}T00:00:00.000Z`), "EE, dd.MM.", { locale: de })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
