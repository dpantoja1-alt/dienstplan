import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toViewEntry } from "@/lib/time-entry-view";
import { formatDay, dayKey } from "@/lib/time-zone";
import { plannedMinutesByDay } from "@/lib/shift";
import { AdminEntryRow } from "../admin-entry-row";
import { ConfirmAllButton } from "../confirm-all-button";

export const metadata: Metadata = { title: "Zeiten prüfen – Eifel Wagyu" };

export default async function ZeitenPruefenPage() {
  await requireAdmin();

  const pending = await prisma.timeEntry.findMany({
    where: { status: "PENDING", end: { not: null } },
    orderBy: { start: "asc" },
    include: { user: { select: { id: true, name: true, minBreakMinutes: true } } },
  });

  // nach Mitarbeiter gruppieren
  const byUser = new Map<
    string,
    { name: string; minBreak: number; entries: typeof pending }
  >();
  for (const e of pending) {
    let g = byUser.get(e.userId);
    if (!g) {
      g = { name: e.user.name, minBreak: e.user.minBreakMinutes, entries: [] };
      byUser.set(e.userId, g);
    }
    g.entries.push(e);
  }

  // geplante Schichten je Mitarbeiter/Tag für den betroffenen Zeitraum laden,
  // um Abweichungen zum Plan markieren zu können
  const plannedByUser = new Map<string, Map<string, number>>();
  if (pending.length > 0) {
    const starts = pending.map((e) => e.start.getTime());
    const shifts = await prisma.shift.findMany({
      where: {
        userId: { in: [...byUser.keys()] },
        date: { gte: new Date(Math.min(...starts)), lte: new Date(Math.max(...starts)) },
      },
      select: { userId: true, date: true, startMinutes: true, endMinutes: true, breakMinutes: true, flexible: true },
    });
    for (const userId of byUser.keys()) {
      plannedByUser.set(
        userId,
        plannedMinutesByDay(shifts.filter((s) => s.userId === userId)),
      );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Zeiten prüfen</h1>

      {byUser.size === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Keine offenen Einträge. 🎉
        </p>
      ) : (
        [...byUser.entries()].map(([userId, group]) => (
          <div key={userId} className="rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
              <Link href={`/mitarbeiter/${userId}/zeiten`} className="font-medium hover:underline">
                {group.name}
              </Link>
              <ConfirmAllButton userId={userId} />
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {group.entries.map((e) => (
                <AdminEntryRow
                  key={e.id}
                  entry={toViewEntry(e, group.minBreak)}
                  dateLabel={formatDay(e.start)}
                  plannedMinutes={plannedByUser.get(userId)?.get(dayKey(e.start)) ?? null}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
