import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { createEmployee } from "../actions";
import { EmployeeForm } from "../employee-form";

export const metadata: Metadata = {
  title: "Neuer Mitarbeiter – Dienstplan",
};

export default async function NeuerMitarbeiterPage() {
  await requireAdmin();

  return (
    <div>
      <Link
        href="/mitarbeiter"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Zurück zur Liste
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Neuer Mitarbeiter</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Nach dem Speichern bekommst du einen Einladungslink, über den sich der
        Mitarbeiter ein Passwort setzt.
      </p>

      <EmployeeForm
        action={createEmployee}
        submitLabel="Anlegen & einladen"
        defaults={{
          name: "",
          email: "",
          role: "EMPLOYEE",
          weeklyHours: 40,
          workDaysPerWeek: 5,
          vacationDaysPerYear: 30,
          minBreakMinutes: 0,
          employmentStart: "",
        }}
      />
    </div>
  );
}
