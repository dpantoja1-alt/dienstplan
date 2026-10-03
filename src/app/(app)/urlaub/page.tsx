import type { Metadata } from "next";
import { ChevronLeftIcon, ChevronRightIcon, navArrow } from "@/components/icons";
import Link from "next/link";
import type { Route } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getAutoVacationCarry, getVacationSummary, type VacationSummary } from "@/lib/account";
import { nrwHolidays } from "@/lib/holidays";
import { dateKey } from "@/lib/shift";
import { dayKey } from "@/lib/time-zone";
import { VacationNotice } from "@/components/vacation-notice";
import { CarryForm } from "./carry-form";
import type { AbsenceKind } from "@/lib/absence-types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RequestForm } from "./request-form";
import { AdminAddAbsence } from "./admin-add-absence";
import { AbsenceRow, type AbsenceView } from "./absence-row";
import { SubTabs } from "@/app/(app)/nav-link";
import { URLAUB_TABS } from "@/app/(app)/tabs";
import { VacationCalendar } from "./vacation-calendar";

export const metadata: Metadata = { title: "Urlaub – Eifel Wagyu" };

function YearNav({ year, person }: { year: number; person?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`/urlaub?j=${year - 1}${person ? `&m=${person}` : ""}` as Route} className={navArrow} aria-label="Vorheriges Jahr"><ChevronLeftIcon /></Link>
      <span className="min-w-16 text-center font-medium">{year}</span>
      <Link href={`/urlaub?j=${year + 1}${person ? `&m=${person}` : ""}` as Route} className={navArrow} aria-label="Nächstes Jahr"><ChevronRightIcon /></Link>
    </div>
  );
}

function toView(a: {
  id: string; userId: string; type: AbsenceKind;
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
  const todayKey = dayKey(now);

  if (!isAdmin) {
    const [summary, rows] = await Promise.all([
      getVacationSummary(session.user.id, year),
      prisma.absence.findMany({
        where: { userId: session.user.id, type: "VACATION", startDate: { lte: yEnd }, endDate: { gte: yStart } },
        orderBy: { startDate: "desc" },
      }),
    ]);

    return (
      <div className="flex flex-col gap-5">
        <SubTabs tabs={URLAUB_TABS} />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Urlaub</h1>
          <YearNav year={year} />
        </div>

        <div className={`grid gap-3 ${summary.carry !== 0 ? "grid-cols-2 sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          <Stat label="Anspruch" value={summary.entitlement} />
          {summary.carry !== 0 && <Stat label={`Übertrag ${year - 1}`} value={summary.carry - summary.carryExpired} />}
          <Stat label="Genommen" value={summary.taken} />
          <Stat label="Beantragt" value={summary.pending} />
          <Stat label="Rest" value={summary.remaining} highlight />
        </div>

        <VacationNotice summary={summary} year={year} todayKey={todayKey} />

        <RequestForm />

        <section>
          <h2 className="mb-2 text-lg font-semibold">Meine Urlaube {year}</h2>
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
      select: { id: true, name: true, employmentStart: true },
    }),
    prisma.absence.findMany({
      where: { type: "VACATION", startDate: { lte: yEnd }, endDate: { gte: yStart } },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: { user: { select: { name: true } } },
    }),
    prisma.absence.count({ where: { status: "PENDING" } }),
  ]);

  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));
  // Liste „Urlaube von …“ nur für die in den Urlaubskonten angeklickte Person
  const selected = typeof sp.m === "string" ? users.find((u) => u.id === sp.m) : undefined;
  const selectedRows = selected ? rows.filter((a) => a.userId === selected.id) : [];

  const summaries = new Map<string, VacationSummary>(
    await Promise.all(
      users.map(async (u) => [u.id, await getVacationSummary(u.id, year, todayKey)] as const),
    ),
  );
  const [carryRow, autoCarry] = selected
    ? await Promise.all([
        prisma.vacationCarryover.findUnique({
          where: { userId_year: { userId: selected.id, year } },
        }),
        getAutoVacationCarry(selected.id, year, selected.employmentStart, todayKey),
      ])
    : [null, null];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Urlaub</h1>
        <YearNav year={year} person={selected?.id} />
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
        <h2 className="mb-2 text-lg font-semibold">Urlaubskalender {year}</h2>
        <VacationCalendar
          key={year}
          year={year}
          initialMonth={year === now.getFullYear() ? now.getMonth() : 0}
          absences={rows.map((a) => toView(a, a.user.name))}
          holidays={Object.fromEntries(holidays)}
          users={userOptions}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Urlaubskonten {year}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-1 pr-4">Mitarbeiter</th>
                <th className="py-1 pr-4 text-right">Anspruch</th>
                <th className="py-1 pr-4 text-right">Übertrag</th>
                <th className="py-1 pr-4 text-right">Genommen</th>
                <th className="py-1 text-right">Rest</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const s = summaries.get(u.id)!;
                return (
                  <tr
                    key={u.id}
                    className={`border-t border-slate-100 dark:border-slate-800/60 ${selected?.id === u.id ? "bg-slate-100 dark:bg-slate-800/60" : ""}`}
                  >
                    <td className="py-1.5 pr-4">
                      <Link
                        href={(selected?.id === u.id ? `/urlaub?j=${year}` : `/urlaub?j=${year}&m=${u.id}#urlaube-person`) as Route}
                        scroll={false}
                        className="font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-current dark:decoration-slate-600"
                      >
                        {u.name}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{s.entitlement}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {s.carry === 0 ? "–" : s.carry - s.carryExpired}
                      {s.carryOpen > 0 && s.carryExpiresKey && (
                        <span
                          className="block text-xs text-amber-700 dark:text-amber-400"
                          title="Noch nicht genommener Übertrag mit Verfallsdatum"
                        >
                          {s.carryOpen} offen bis {s.carryExpiresKey.slice(8, 10)}.{s.carryExpiresKey.slice(5, 7)}.
                        </span>
                      )}
                      {s.carryExpired > 0 && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{s.carryExpired} verfallen</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{s.taken}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{s.remaining}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Auf einen Namen tippen, um alle Urlaube dieser Person zu sehen und zu bearbeiten oder den
          Übertrag aus dem Vorjahr festzulegen.
        </p>
      </section>

      {selected && (
        <section id="urlaube-person" className="scroll-mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Urlaube {selected.name} {year}
            </h2>
            <Link href={`/urlaub?j=${year}` as Route} scroll={false} className="text-sm text-slate-500 underline dark:text-slate-400">
              Schließen
            </Link>
          </div>
          {selectedRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Keine Einträge.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {selectedRows.map((a) => (
                <AbsenceRow key={a.id} a={toView(a, a.user.name)} mode="admin" users={userOptions} />
              ))}
            </ul>
          )}
          <div className="mt-4">
            <CarryForm
              key={`${selected.id}-${year}`}
              userId={selected.id}
              year={year}
              autoDays={autoCarry}
              days={carryRow?.days ?? null}
              expiresKey={carryRow?.expiresOn ? dateKey(carryRow.expiresOn) : null}
              note={carryRow?.note ?? null}
            />
          </div>
        </section>
      )}

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
