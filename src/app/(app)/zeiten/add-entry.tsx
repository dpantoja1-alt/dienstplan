"use client";

import { useState } from "react";
import { addOwnEntry } from "./actions";
import { EntryForm } from "./entry-form";

export function AddEntry({ defaultStart }: { defaultStart: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        + Eintrag
      </button>
    );
  }

  return (
    <EntryForm
      action={addOwnEntry}
      submitLabel="Eintragen"
      defaults={{ start: defaultStart, end: "", breakMinutes: "", note: "" }}
      onDone={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );
}
