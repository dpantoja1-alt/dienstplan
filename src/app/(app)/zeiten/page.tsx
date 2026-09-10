import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { groupByDay } from "@/lib/time-entry-view";
import { formatMinutes } from "@/lib/worktime";
import { monthRange, dateToLocalInput } from "@/lib/time-zone";
import { StampClock } from "./stamp-clock";
import { MonthNav } from "./month-nav";
import { AddEntry } from "./add-entry";
import { OwnEntryRow } from "./own-entry-row";

export const metadata: Metadata = { title: "Zeiten – Eifel Wagyu" };

export default async function ZeitenPage({
  searchParams,
}: PageProps<"/zeiten">) {
  const session = await requireUser();
  const sp = await searchParams;
  const month = monthRange(typeof sp.m === "string" ? sp.m : undefined);

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { minBreakMinutes: true },
  });
  const minBreak = me?.minBreakMinutes ?? 0;

  const [openEntry, entries] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { userId: session.user.id, end: null },
      orderBy: { start: "desc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        start: { gte: month.start, lte: month.end },
      },
      orderBy: { start: "desc" },
    }),
  ]);

  const { days, totalNet } = groupByDay(entries, minBreak);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meine Zeiten</h1>
      </div>

      <StampClock openSinceISO={openEntry?.start.toISOString() ?? null} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav basePath="/zeiten" label={month.key} prev={month.prev} next={month.next} />
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Summe Monat:{" "}
            <span className="font-semibold tabular-nums">{formatMinutes(totalNet)}</span>
          </span>
          <AddEntry defaultStart={dateToLocalInput(new Date())} />
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Keine Einträge in diesem Monat.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <div key={day.key} className="rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span className="font-medium">{day.label}</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                  {formatMinutes(day.netMinutes)}
                </span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {day.entries.map((entry) => (
                  <OwnEntryRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
