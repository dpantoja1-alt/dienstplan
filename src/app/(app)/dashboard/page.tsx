import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/time-zone";
import { groupByDay } from "@/lib/time-entry-view";
import { formatMinutes } from "@/lib/worktime";
import { dateFromKey, formatFullDay, formatShiftRange } from "@/lib/shift";
import { getMonthAccount, getVacationSummary } from "@/lib/account";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Übersicht – Eifel Wagyu",
};

function Card({ href, value, label }: { href: string; value: string; label: string }) {
  return (
    <Link
      href={href as never}
      className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
    >
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </Link>
  );
}

async function UpcomingShifts({ userId }: { userId: string }) {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const shifts = await prisma.shift.findMany({
    where: { userId, date: { gte: dateFromKey(todayKey) } },
    orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
    take: 5,
  });

  if (shifts.length === 0) {
    return (
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Keine kommenden Schichten eingeplant.
      </p>
    );
  }

  return (
    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800/60 dark:border-slate-800">
      {shifts.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="w-48 text-slate-500 dark:text-slate-400">
            {formatFullDay(s.date.toISOString().slice(0, 10))}
          </span>
          <span className="font-medium">{s.label}</span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">
            {formatShiftRange(s.startMinutes, s.endMinutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const firstName = user.name?.split(" ")[0] ?? "";
  const isAdmin = user.role === "ADMIN";
  const month = monthRange();
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const nowYear = new Date().getFullYear();
  const nowMonth1 = new Date().getMonth() + 1;

  if (isAdmin) {
    const [openInvites, pendingReviews, pendingAbsences, todayShifts] = await Promise.all([
      prisma.user.count({ where: { passwordHash: null } }),
      prisma.timeEntry.count({ where: { status: "PENDING", end: { not: null } } }),
      prisma.absence.count({ where: { status: "PENDING" } }),
      prisma.shift.count({ where: { date: dateFromKey(todayKey) } }),
    ]);

    return (
      <div>
        <h1 className="text-2xl font-semibold">Hallo {firstName} 👋</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card href="/zeiten/team" value={String(pendingReviews)} label="Zeiten zu prüfen" />
          <Card href="/urlaub/antraege" value={String(pendingAbsences)} label="Urlaubsanträge" />
          <Card href="/plan" value={String(todayShifts)} label="Schichten heute" />
          <Card
            href="/mitarbeiter"
            value={openInvites > 0 ? String(openInvites) : "→"}
            label={openInvites > 0 ? "offene Einladungen" : "Mitarbeiter"}
          />
        </div>

        <h2 className="mt-8 text-lg font-semibold">Meine nächsten Schichten</h2>
        <UpcomingShifts userId={user.id} />
      </div>
    );
  }

  const [openEntry, entries, me, vacation, account] = await Promise.all([
    prisma.timeEntry.findFirst({ where: { userId: user.id, end: null } }),
    prisma.timeEntry.findMany({
      where: { userId: user.id, start: { gte: month.start, lte: month.end } },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { minBreakMinutes: true },
    }),
    getVacationSummary(user.id, nowYear),
    getMonthAccount(user.id, nowYear, nowMonth1),
  ]);
  const { totalNet } = groupByDay(entries, me?.minBreakMinutes ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Hallo {firstName} 👋</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          href="/zeiten"
          value={openEntry ? "läuft" : formatMinutes(totalNet)}
          label={openEntry ? "Zeiterfassung aktiv" : "Erfasst diesen Monat"}
        />
        <Card
          href="/stundenkonto"
          value={formatMinutes(account.balanceMinutes)}
          label="Saldo diesen Monat"
        />
        <Card href="/urlaub" value={String(vacation.remaining)} label="Resturlaub (Tage)" />
        <Card href="/plan" value="→" label="Dienstplan ansehen" />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Meine nächsten Schichten</h2>
      <UpcomingShifts userId={user.id} />
    </div>
  );
}
