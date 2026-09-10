import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { updateEmployee } from "../actions";
import { EmployeeForm } from "../employee-form";
import { InvitePanel } from "./invite-panel";
import { ActiveToggle } from "./active-toggle";
import { DeleteEmployee } from "./delete-employee";

export const metadata: Metadata = {
  title: "Mitarbeiter bearbeiten – Dienstplan",
};

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function MitarbeiterDetailPage({
  params,
  searchParams,
}: PageProps<"/mitarbeiter/[id]">) {
  const session = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const [teCount, shCount, abCount] = await Promise.all([
    prisma.timeEntry.count({ where: { userId: id } }),
    prisma.shift.count({ where: { userId: id } }),
    prisma.absence.count({ where: { userId: id } }),
  ]);

  const isSelf = session.user.id === user.id;
  const isPending = !user.passwordHash;

  const token = typeof sp.token === "string" ? sp.token : undefined;
  const mailSent = sp.mail === "sent";
  const saved = sp.gespeichert === "1";
  const initialInviteUrl = token
    ? `${(await getBaseUrl()).replace(/\/$/, "")}/invite/${token}`
    : undefined;

  return (
    <div>
      <Link
        href="/mitarbeiter"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Zurück zur Liste
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <Link
          href={`/mitarbeiter/${user.id}/zeiten`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Zeiten ansehen
        </Link>
      </div>

      {saved && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          Änderungen gespeichert.
        </p>
      )}

      {isPending && (
        <InvitePanel
          userId={user.id}
          initialUrl={initialInviteUrl}
          mailSent={mailSent}
          expiresAt={user.inviteExpiresAt?.toISOString() ?? null}
        />
      )}

      {!isPending && (
        <ActiveToggle userId={user.id} active={user.active} isSelf={isSelf} />
      )}

      <EmployeeForm
        action={updateEmployee.bind(null, user.id)}
        submitLabel="Speichern"
        defaults={{
          name: user.name,
          email: user.email,
          role: user.role,
          weeklyHours: user.weeklyHours,
          workDaysPerWeek: user.workDaysPerWeek,
          vacationDaysPerYear: user.vacationDaysPerYear,
          minBreakMinutes: user.minBreakMinutes,
          employmentStart: toDateInput(user.employmentStart),
          monthlySalary: user.monthlySalary?.toString() ?? "",
        }}
      />

      {!isSelf && (
        <DeleteEmployee
          userId={user.id}
          name={user.name}
          impact={{ timeEntries: teCount, shifts: shCount, absences: abCount }}
        />
      )}
    </div>
  );
}
