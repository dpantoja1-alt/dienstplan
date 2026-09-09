import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AddTemplate } from "./add-template";
import { TemplateRow } from "./template-row";

export const metadata: Metadata = { title: "Schichtvorlagen – Dienstplan" };

export default async function SchichtvorlagenPage() {
  await requireAdmin();

  const templates = await prisma.shiftTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { shifts: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Schichtvorlagen</h1>
        <AddTemplate />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Vorlagen sind der Baukasten für den Plan. Bestehende Zuweisungen ändern sich
        nicht, wenn du eine Vorlage später anpasst.
      </p>

      {templates.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Noch keine Vorlagen. Leg z. B. „Früh 06:00–14:00“ an.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {templates.map((t) => (
            <TemplateRow
              key={t.id}
              t={{
                id: t.id,
                name: t.name,
                shortLabel: t.shortLabel,
                startMinutes: t.startMinutes,
                endMinutes: t.endMinutes,
                breakMinutes: t.breakMinutes,
                color: t.color,
                active: t.active,
                shiftCount: t._count.shifts,
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
