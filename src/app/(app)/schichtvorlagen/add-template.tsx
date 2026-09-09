"use client";

import { useState } from "react";
import { TemplateForm } from "./template-form";

export function AddTemplate() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        + Vorlage
      </button>
    );
  }

  return (
    <div className="w-full">
      <TemplateForm
        submitLabel="Anlegen"
        defaults={{
          name: "",
          shortLabel: "",
          start: "06:00",
          end: "14:00",
          breakMinutes: "",
          color: "#64748b",
        }}
        onDone={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
