"use client";

import { useState, useTransition } from "react";
import { formatShiftRange, minutesToHHMM } from "@/lib/shift";
import { assignShiftFromTemplate, removeShift } from "./actions";
import { CustomShiftForm } from "./custom-shift-form";
import type { GridShift, GridTemplate } from "./types";

export function CellEditor({
  userId,
  userName,
  dayKey,
  dayLabel,
  shifts,
  templates,
  onClose,
}: {
  userId: string;
  userName: string;
  dayKey: string;
  dayLabel: string;
  shifts: GridShift[];
  templates: GridTemplate[];
  onClose: () => void;
}) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [custom, setCustom] = useState<null | { shiftId?: string; defaults: GridShift | null }>(null);

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {dayLabel} · {userName}
        </h2>
        <button onClick={onClose} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          Schließen
        </button>
      </div>

      {shifts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {shifts.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-sm dark:bg-slate-800">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="font-medium">{s.label}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatShiftRange(s.startMinutes, s.endMinutes)}
                  {s.breakMinutes ? ` · ${s.breakMinutes} Min Pause` : ""}
                </span>
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() =>
                    setCustom({ shiftId: s.id, defaults: s })
                  }
                  className="text-slate-500 hover:underline dark:text-slate-400"
                >
                  Ändern
                </button>
                <button
                  disabled={busy}
                  onClick={() => run(() => removeShift(s.id))}
                  className="text-red-600 hover:underline dark:text-red-400"
                >
                  Entfernen
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {custom ? (
        <CustomShiftForm
          userId={userId}
          dateKey={dayKey}
          defaults={{
            shiftId: custom.shiftId,
            label: custom.defaults?.label ?? "",
            start: minutesToHHMM(custom.defaults?.startMinutes ?? 480),
            end: minutesToHHMM(custom.defaults?.endMinutes ?? 960),
            breakMinutes: custom.defaults?.breakMinutes?.toString() ?? "",
            note: custom.defaults?.note ?? "",
            color: custom.defaults?.color ?? "#64748b",
          }}
          onDone={() => setCustom(null)}
          onCancel={() => setCustom(null)}
        />
      ) : (
        <div className="mt-3">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Vorlage zuweisen
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {templates.length === 0 && (
              <span className="text-sm text-slate-400">
                Keine aktiven Vorlagen – zuerst unter „Vorlagen“ anlegen.
              </span>
            )}
            {templates.map((t) => (
              <button
                key={t.id}
                disabled={busy}
                onClick={() => run(() => assignShiftFromTemplate(userId, dayKey, t.id))}
                className="rounded-md border px-2 py-1 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: t.color, color: t.color }}
                title={`${t.name} ${t.range}`}
              >
                {t.shortLabel} <span className="opacity-70">{t.range}</span>
              </button>
            ))}
            <button
              onClick={() => setCustom({ defaults: null })}
              className="rounded-md border border-dashed border-slate-400 px-2 py-1 text-sm text-slate-600 dark:text-slate-300"
            >
              + Eigene Zeit
            </button>
          </div>
        </div>
      )}

      {err && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}
