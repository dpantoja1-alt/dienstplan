"use client";

import { useMemo, useState } from "react";
import { formatMinutes } from "@/lib/worktime";
import { formatShiftRange } from "@/lib/shift";
import { CellEditor } from "./cell-editor";
import type { GridAbsence, GridDay, GridShift, GridTemplate, GridUser } from "./types";

export function PlanGrid({
  users,
  days,
  shifts,
  absences,
  templates,
  canEdit,
}: {
  users: GridUser[];
  days: GridDay[];
  shifts: GridShift[];
  absences: GridAbsence[];
  templates: GridTemplate[];
  canEdit: boolean;
}) {
  const [sel, setSel] = useState<{ userId: string; dayKey: string } | null>(null);

  const byCell = useMemo(() => {
    const map = new Map<string, GridShift[]>();
    for (const s of shifts) {
      const k = `${s.userId}|${s.dateKey}`;
      const arr = map.get(k);
      if (arr) arr.push(s);
      else map.set(k, [s]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startMinutes - b.startMinutes);
    return map;
  }, [shifts]);

  const absenceByCell = useMemo(() => {
    const map = new Map<string, GridAbsence>();
    for (const a of absences) map.set(`${a.userId}|${a.dayKey}`, a);
    return map;
  }, [absences]);

  const weekTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shifts) m.set(s.userId, (m.get(s.userId) ?? 0) + s.durationMinutes);
    return m;
  }, [shifts]);

  const selUser = sel ? users.find((u) => u.id === sel.userId) : null;
  const selDay = sel ? days.find((d) => d.key === sel.dayKey) : null;
  const selShifts = sel ? (byCell.get(`${sel.userId}|${sel.dayKey}`) ?? []) : [];

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--background,#fafafa)] p-2 text-left dark:bg-slate-950" />
              {days.map((d) => (
                <th
                  key={d.key}
                  className={`min-w-28 p-2 text-center font-medium ${d.isToday ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  <div>{d.weekday}</div>
                  <div className="text-xs font-normal">{d.label}</div>
                  {d.holiday && (
                    <div className="mt-0.5 text-[10px] font-normal leading-tight text-rose-600 dark:text-rose-400">
                      {d.holiday}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                <th className="sticky left-0 z-10 max-w-40 bg-[var(--background,#fafafa)] p-2 text-left align-top dark:bg-slate-950">
                  <div className={`font-medium ${u.isSelf ? "text-sky-700 dark:text-sky-400" : ""}`}>
                    {u.name}
                  </div>
                  <div className="text-xs font-normal text-slate-400">
                    {formatMinutes(weekTotals.get(u.id) ?? 0)}
                  </div>
                </th>
                {days.map((d) => {
                  const cellShifts = byCell.get(`${u.id}|${d.key}`) ?? [];
                  const absence = absenceByCell.get(`${u.id}|${d.key}`);
                  const isSel = sel?.userId === u.id && sel?.dayKey === d.key;
                  return (
                    <td
                      key={d.key}
                      onClick={canEdit ? () => setSel({ userId: u.id, dayKey: d.key }) : undefined}
                      className={`border-l border-slate-100 p-1 align-top dark:border-slate-800/60 ${
                        d.holiday ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                      } ${
                        canEdit ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" : ""
                      } ${isSel ? "outline outline-2 outline-slate-900 dark:outline-white" : ""}`}
                    >
                      <div className="flex flex-col gap-1">
                        {absence && (
                          <div
                            className="rounded border px-1.5 py-1 text-xs font-medium leading-tight"
                            style={{ borderColor: absence.color, color: absence.color }}
                          >
                            {absence.label}
                          </div>
                        )}
                        {cellShifts.map((s) => (
                          <div
                            key={s.id}
                            className="rounded px-1.5 py-1 text-xs font-medium leading-tight text-white"
                            style={{ backgroundColor: s.color }}
                            title={`${s.label} ${formatShiftRange(s.startMinutes, s.endMinutes)}`}
                          >
                            <div>{s.label}</div>
                            <div className="font-normal opacity-90">
                              {formatShiftRange(s.startMinutes, s.endMinutes)}
                            </div>
                          </div>
                        ))}
                        {canEdit && cellShifts.length === 0 && !absence && (
                          <span className="block py-1 text-center text-xs text-slate-300 dark:text-slate-600">
                            +
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && sel && selUser && selDay && (
        <CellEditor
          key={`${sel.userId}|${sel.dayKey}`}
          userId={sel.userId}
          userName={selUser.name}
          dayKey={sel.dayKey}
          dayLabel={`${selDay.weekday} ${selDay.label}`}
          shifts={selShifts}
          templates={templates}
          onClose={() => setSel(null)}
        />
      )}

      {users.length === 0 && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Keine aktiven Mitarbeiter.
        </p>
      )}
    </div>
  );
}
