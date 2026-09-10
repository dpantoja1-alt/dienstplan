import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toViewEntry } from "@/lib/time-entry-view";
import { formatDay } from "@/lib/time-zone";
import { AdminEntryRow } from "../admin-entry-row";
import { ConfirmAllButton } from "../confirm-all-button";

export const metadata: Metadata = { title: "Zeiten prüfen – Dienstplan" };

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
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
