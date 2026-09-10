import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { berlinTodayRange, dateToLocalInput } from "@/lib/time-zone";
import { toViewEntry } from "@/lib/time-entry-view";
import { TeamClockRow, type TeamRow } from "./team-clock-row";

export const metadata: Metadata = { title: "Team-Zeiten – Dienstplan" };

export default async function TeamZeitenPage() {
  await requireAdmin();
  const today = berlinTodayRange();

  const [users, pendingCount] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, minBreakMinutes: true },
    }),
    prisma.timeEntry.count({ where: { status: "PENDING", end: { not: null } } }),
  ]);

  // Offene + heutige Einträge für alle Mitarbeiter in einem Rutsch
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      OR: [{ end: null }, { start: { gte: today.start, lt: today.end } }],
    },
    orderBy: { start: "asc" },
  });

  const defaultStart = dateToLocalInput(new Date());

  const rows: TeamRow[] = users.map((u) => {
    const mine = entries.filter((e) => e.userId === u.id);
    const open = mine.find((e) => e.end === null) ?? null;
    const todays = mine
      .filter((e) => e.start >= today.start && e.start < today.end)
      .map((e) => {
        const v = toViewEntry(e, u.minBreakMinutes);
        return {
          id: e.id,
          startTime: v.startTime,
          endTime: v.endTime,
          netMinutes: v.netMinutes,
          status: e.status,
          startInput: v.startInput,
          endInput: v.endInput ?? "",
          breakOverride: v.breakOverride?.toString() ?? "",
          note: v.note ?? "",
          running: v.running,
        };
      });
    const todayNet = todays.reduce((s, e) => s + (e.netMinutes ?? 0), 0);

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      openSinceISO: open?.start.toISOString() ?? null,
      todayNetMinutes: todayNet,
      todayEntries: todays,
      defaultStart,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Team-Zeiten</h1>
        <Link
          href="/zeiten/pruefen"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Offene Einträge prüfen
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-xs text-white">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Stempeluhr und Nachträge für alle Mitarbeiter. Was du hier einträgst, ist
        sofort bestätigt.
      </p>

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {rows.map((row) => (
          <TeamClockRow key={row.userId} row={row} />
        ))}
      </ul>
    </div>
  );
}
