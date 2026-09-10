import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { groupByDay } from "@/lib/time-entry-view";
import { formatMinutes } from "@/lib/worktime";
import { monthRange, dateToLocalInput } from "@/lib/time-zone";
import { MonthNav } from "@/app/(app)/zeiten/month-nav";
import { AdminEntryRow } from "@/app/(app)/zeiten/admin-entry-row";
import { AdminAddEntry } from "@/app/(app)/zeiten/admin-add-entry";
import { ConfirmAllButton } from "@/app/(app)/zeiten/confirm-all-button";

export const metadata: Metadata = { title: "Zeiten – Eifel Wagyu" };

export default async function MitarbeiterZeitenPage({
  params,
  searchParams,
}: PageProps<"/mitarbeiter/[id]/zeiten">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const month = monthRange(typeof sp.m === "string" ? sp.m : undefined);

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, minBreakMinutes: true },
  });
  if (!user) notFound();

  const entries = await prisma.timeEntry.findMany({
    where: { userId: id, start: { gte: month.start, lte: month.end } },
    orderBy: { start: "desc" },
  });

  const { days, totalNet } = groupByDay(entries, user.minBreakMinutes);
  const pendingCount = entries.filter(
    (e) => e.status === "PENDING" && e.end !== null,
  ).length;
  const basePath = `/mitarbeiter/${id}/zeiten` as const;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/mitarbeiter/${id}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← {user.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Zeiten – {user.name}</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav basePath={basePath} label={month.key} prev={month.prev} next={month.next} />
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Summe: <span className="font-semibold tabular-nums">{formatMinutes(totalNet)}</span>
          </span>
          {pendingCount > 0 && <ConfirmAllButton userId={id} />}
          <AdminAddEntry userId={id} defaultStart={dateToLocalInput(new Date())} />
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Keine Einträge in diesem Monat.</p>
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
                  <AdminEntryRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
