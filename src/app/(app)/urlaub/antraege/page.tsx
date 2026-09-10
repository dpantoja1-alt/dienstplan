import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getVacationSummary } from "@/lib/account";
import { dateKey } from "@/lib/shift";
import { AbsenceRow } from "../absence-row";

export const metadata: Metadata = { title: "Urlaubsanträge – Eifel Wagyu" };

export default async function AntraegePage() {
  await requireAdmin();

  const pending = await prisma.absence.findMany({
    where: { status: "PENDING" },
    orderBy: { startDate: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  // Resturlaub je betroffenem Mitarbeiter (Jahr des Antragsbeginns)
  const summaries = new Map<string, { remaining: number; pending: number }>();
  await Promise.all(
    [...new Set(pending.map((p) => `${p.userId}|${p.startDate.getUTCFullYear()}`))].map(
      async (combo) => {
        const [uid, y] = combo.split("|");
        const s = await getVacationSummary(uid, Number(y));
        summaries.set(combo, { remaining: s.remaining, pending: s.pending });
      },
    ),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/urlaub" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Urlaub
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Offene Anträge</h1>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Keine offenen Anträge. 🎉</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {pending.map((a) => {
            const combo = `${a.userId}|${a.startDate.getUTCFullYear()}`;
            const s = summaries.get(combo);
            return (
              <AbsenceRow
                key={a.id}
                a={{
                  id: a.id,
                  userId: a.userId,
                  userName: a.user.name,
                  type: a.type,
                  startKey: dateKey(a.startDate),
                  endKey: dateKey(a.endDate),
                  halfDay: a.halfDay,
                  status: a.status,
                  note: a.note,
                }}
                mode="admin"
                footer={
                  a.type === "VACATION" && s ? (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Resturlaub {a.startDate.getUTCFullYear()}: {s.remaining} Tage
                      {s.pending > 0 ? ` (inkl. ${s.pending} offen beantragt)` : ""}
                    </p>
                  ) : undefined
                }
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
