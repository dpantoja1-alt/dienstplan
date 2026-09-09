import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/time-zone";
import { groupByDay } from "@/lib/time-entry-view";
import { formatMinutes } from "@/lib/worktime";

export const metadata: Metadata = {
  title: "Übersicht – Dienstplan",
};

function Card({
  href,
  value,
  label,
}: {
  href: string;
  value: string;
  label: string;
}) {
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

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const firstName = user.name?.split(" ")[0] ?? "";
  const isAdmin = user.role === "ADMIN";
  const month = monthRange();

  if (isAdmin) {
    const [employeeCount, openInvites, pendingReviews] = await Promise.all([
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.user.count({ where: { passwordHash: null } }),
      prisma.timeEntry.count({ where: { status: "PENDING", end: { not: null } } }),
    ]);

    return (
      <div>
        <h1 className="text-2xl font-semibold">Hallo {firstName} 👋</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card
            href="/mitarbeiter"
            value={String(employeeCount)}
            label={
              openInvites > 0
                ? `Mitarbeiter · ${openInvites} offene Einladung${openInvites === 1 ? "" : "en"}`
                : "Mitarbeiter"
            }
          />
          <Card
            href="/zeiten/pruefen"
            value={String(pendingReviews)}
            label="Zeiten zu prüfen"
          />
          <Card href="/zeiten" value="→" label="Meine Zeiterfassung" />
        </div>
      </div>
    );
  }

  const [openEntry, entries, me] = await Promise.all([
    prisma.timeEntry.findFirst({ where: { userId: user.id, end: null } }),
    prisma.timeEntry.findMany({
      where: { userId: user.id, start: { gte: month.start, lte: month.end } },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { minBreakMinutes: true },
    }),
  ]);
  const { totalNet } = groupByDay(entries, me?.minBreakMinutes ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Hallo {firstName} 👋</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card
          href="/zeiten"
          value={openEntry ? "läuft" : formatMinutes(totalNet)}
          label={openEntry ? "Zeiterfassung aktiv" : "Erfasst diesen Monat"}
        />
      </div>
    </div>
  );
}
