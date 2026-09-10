"use client";

import { useState } from "react";
import { AdminAbsenceForm } from "./admin-absence-form";

export function AdminAddAbsence({
  users,
  presetUserId,
}: {
  users: { id: string; name: string }[];
  presetUserId?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        Abwesenheit eintragen
      </button>
    );
  }

  return (
    <AdminAbsenceForm
      users={users}
      lockUser={Boolean(presetUserId)}
      defaults={{
        userId: presetUserId ?? "",
        type: "VACATION",
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
