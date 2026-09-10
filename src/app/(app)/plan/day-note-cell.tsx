"use client";

import { useState, useTransition } from "react";
import { saveDayNote } from "./actions";

export function DayNoteCell({
  dayKey,
  text,
  canEdit,
}: {
  dayKey: string;
  text: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!canEdit) {
    return text ? (
      <div className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">{text}</div>
    ) : null;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded border border-slate-300 p-1 text-xs dark:border-slate-600 dark:bg-slate-800"
          placeholder="Info für diesen Tag …"
        />
        <div className="flex gap-1">
          <button
            disabled={busy}
            onClick={() =>
              start(async () => {
                setErr(null);
                try {
                  await saveDayNote(dayKey, value);
                  setEditing(false);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Fehler");
                }
              })
            }
            className="rounded bg-brand px-2 py-0.5 text-xs text-brand-ink"
          >
            OK
          </button>
          <button
            onClick={() => {
              setValue(text);
              setEditing(false);
            }}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-600"
          >
            Abbrechen
          </button>
        </div>
        {err && <span className="text-xs text-red-600 dark:text-red-400">{err}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-xs text-slate-700 hover:opacity-70 dark:text-slate-200"
    >
      {text ? (
        <span className="whitespace-pre-wrap">{text}</span>
      ) : (
        <span className="text-slate-300 dark:text-slate-600">+ Info</span>
      )}
    </button>
  );
}
