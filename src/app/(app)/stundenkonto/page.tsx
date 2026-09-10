import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getMonthAccount, getCumulativeBalance } from "@/lib/account";
import { formatMinutes } from "@/lib/worktime";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { OvertimeSection, type Adjustment } from "./overtime-section";

export const metadata: Metadata = { title: "Stundenkonto – Eifel Wagyu" };

function parseMonth(m: string | undefined): { year: number; month1: number; key: string } {
  const now = new Date();
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    return { year: Number(m.slice(0, 4)), month1: Number(m.slice(5, 7)), key: m };
  }
  const key = format(now, "yyyy-MM");
  return { year: now.getFullYear(), month1: now.getMonth() + 1, key };
}

function shiftMonth(year: number, month1: number, delta: number): string {
  let y = year;
  let m = month1 + delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

async function AccountTable({
  userId,
  year,
  month1,
  employmentStart,
}: {
  userId: string;
  year: number;
  month1: number;
  employmentStart: Date | null;
}) {
  const acc = await getMonthAccount(userId, year, month1);

  // Kumuliert ab Eintrittsmonat (frühestens 01/2026), sonst ab Januar des Jahres.
  let fromY = year;
  let fromM = 1;
  if (employmentStart) {
    const ey = employmentStart.getUTCFullYear();
    const em = employmentStart.getUTCMonth() + 1;
    if (ey < 2026 || (ey === 2026 && em < 1)) { fromY = 2026; fromM = 1; }
    else { fromY = ey; fromM = em; }
  }
  if (fromY > year || (fromY === year && fromM > month1)) { fromY = year; fromM = month1; }
  const cumulative = await getCumulativeBalance(userId, fromY, fromM, year, month1);

  const rows: [string, string][] = [
    ["Arbeitstage im Monat", String(acc.workdays)],
    ["Sollzeit pro Tag", formatMinutes(acc.dailySollMinutes)],
    ["Sollzeit Monat", formatMinutes(acc.sollMinutes)],
    ["Ist (bestätigt gearbeitet)", formatMinutes(acc.workedMinutes)],
    [
      `Urlaub / Krank gutgeschrieben (${acc.absenceDays} Tag${acc.absenceDays === 1 ? "" : "e"})`,
      formatMinutes(acc.creditedMinutes),
    ],
  ];

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-slate-100 dark:border-slate-800/60">
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{value}</td>
            </tr>
          ))}
          <tr className="border-b border-slate-100 font-medium dark:border-slate-800/60">
            <td className="px-3 py-2">Saldo Monat (erarbeitet)</td>
            <td className={`px-3 py-2 text-right tabular-nums ${acc.balanceMinutes < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
              {formatMinutes(acc.balanceMinutes)}
            </td>
          </tr>
          {acc.adjustmentMinutes !== 0 && (
            <tr className="border-b border-slate-100 dark:border-slate-800/60">
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                Überstunden ausgezahlt / Korrektur
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${acc.adjustmentMinutes < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {formatMinutes(acc.adjustmentMinutes)}
              </td>
            </tr>
          )}
          <tr className="font-semibold">
            <td className="px-3 py-2">
              Saldo gesamt (ab {format(new Date(Date.UTC(fromY, fromM - 1, 1)), "MM/yyyy")})
            </td>
            <td className={`px-3 py-2 text-right tabular-nums ${cumulative < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
              {formatMinutes(cumulative)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function StundenkontoPage({
  searchParams,
}: PageProps<"/stundenkonto">) {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";
  const sp = await searchParams;
  const { year, month1, key } = parseMonth(typeof sp.m === "string" ? sp.m : undefined);
  const monthLabel = format(new Date(Date.UTC(year, month1 - 1, 1)), "LLLL yyyy", { locale: de });

  const users = isAdmin
    ? await prisma.user.findMany({
        where: { active: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, employmentStart: true },
      })
    : [];

  const targetUserId =
    isAdmin && typeof sp.u === "string" && users.some((u) => u.id === sp.u)
      ? sp.u
      : session.user.id;
  const targetUser =
    users.find((u) => u.id === targetUserId) ??
    (await prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      select: { id: true, name: true, employmentStart: true },
    }));

  const adjustments: Adjustment[] = isAdmin
    ? (
        await prisma.balanceAdjustment.findMany({
          where: { userId: targetUserId },
          orderBy: { date: "desc" },
          select: { id: true, date: true, minutes: true, note: true },
        })
      ).map((a) => ({
        id: a.id,
        dateKey: a.date.toISOString().slice(0, 10),
        minutes: a.minutes,
        note: a.note,
      }))
    : [];

  const qs = (over: Record<string, string>) => {
    const params = new URLSearchParams({ m: key });
    if (isAdmin && targetUserId !== session.user.id) params.set("u", targetUserId);
    for (const [k, v] of Object.entries(over)) params.set(k, v);
    return `/stundenkonto?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Stundenkonto</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={qs({ m: shiftMonth(year, month1, -1) }) as Route} className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600">←</Link>
          <span className="min-w-40 text-center text-sm font-medium">{monthLabel}</span>
          <Link href={qs({ m: shiftMonth(year, month1, 1) }) as Route} className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600">→</Link>
        </div>

        {isAdmin && (
          <form className="text-sm">
            <input type="hidden" name="m" value={key} />
            <select
              name="u"
              defaultValue={targetUserId}
              className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button className="ml-2 rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-600">
              anzeigen
            </button>
          </form>
        )}
      </div>

      {isAdmin && targetUserId !== session.user.id && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Stundenkonto von <span className="font-medium">{targetUser.name}</span>
        </p>
      )}

      <AccountTable
        userId={targetUserId}
        year={year}
        month1={month1}
        employmentStart={targetUser.employmentStart}
      />

      <div className="flex flex-wrap gap-2">
        <a
          href={`/stundennachweis?m=${key}${targetUserId !== session.user.id ? `&u=${targetUserId}` : ""}`}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand-strong"
        >
          Stundennachweis (Druck / PDF)
        </a>
        <a
          href={`/api/berichte?m=${key}${targetUserId !== session.user.id ? `&u=${targetUserId}` : ""}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          CSV herunterladen
        </a>
        {isAdmin && (
          <a
            href={`/api/berichte?m=${key}&team=1`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Team-Übersicht CSV
          </a>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Ist zählt nur bestätigte Zeiterfassung. Feiertage senken die Sollzeit
        automatisch, genehmigter Urlaub und Krankheit gelten als erfüllt.
      </p>

      {isAdmin && (
        <OvertimeSection
          userId={targetUserId}
          userName={targetUser.name}
          adjustments={adjustments}
        />
      )}

      {isAdmin && <AdminOverview month1={month1} year={year} monthKey={key} />}
    </div>
  );
}

async function AdminOverview({
  year,
  month1,
  monthKey,
}: {
  year: number;
  month1: number;
  monthKey: string;
}) {
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const rows = await Promise.all(
    users.map(async (u) => ({
      ...u,
      acc: await getMonthAccount(u.id, year, month1),
    })),
  );

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Übersicht – alle Mitarbeiter</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="py-1 pr-4">Mitarbeiter</th>
              <th className="py-1 pr-4 text-right">Soll</th>
              <th className="py-1 pr-4 text-right">Ist</th>
              <th className="py-1 text-right">Saldo Monat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800/60">
                <td className="py-1.5 pr-4">
                  <Link href={`/stundenkonto?m=${monthKey}&u=${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{formatMinutes(r.acc.sollMinutes)}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{formatMinutes(r.acc.workedMinutes + r.acc.creditedMinutes)}</td>
                <td className={`py-1.5 text-right font-medium tabular-nums ${r.acc.balanceWithAdjustmentsMinutes < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {formatMinutes(r.acc.balanceWithAdjustmentsMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
