"use client";

import { useState } from "react";
import { AdminAbsenceForm } from "./admin-absence-form";
import type { AbsenceKind } from "@/lib/absence-types";
import { VACATION_TYPES } from "@/lib/absence-view";

export function AdminAddAbsence({
  users,
  presetUserId,
  types = VACATION_TYPES,
  label = "Urlaub eintragen",
}: {
  users: { id: string; name: string }[];
  presetUserId?: string;
  types?: { value: AbsenceKind; label: string }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        {label}
      </button>
    );
  }

  return (
    <AdminAbsenceForm
      users={users}
      lockUser={Boolean(presetUserId)}
      types={types}
      defaults={{
        userId: presetUserId ?? "",
        type: types[0].value,
        start: "",
        end: "",
        halfDay: false,
        note: "",
      }}
      onDone={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );
}
