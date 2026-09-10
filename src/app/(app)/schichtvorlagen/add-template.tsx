"use client";

import { useState } from "react";
import { TemplateForm } from "./template-form";

export function AddTemplate() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition hover:bg-brand-strong"
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
