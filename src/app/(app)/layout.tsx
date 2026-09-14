import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOverrunAlerts } from "@/lib/alerts";
import { Logo } from "@/components/logo";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";
import { UserIcon, LogoutIcon } from "./nav-icons";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireUser();
  const { name, role } = session.user;
  const isAdmin = role === "ADMIN";

  const [pendingReviews, pendingAbsences, overruns] = isAdmin
    ? await Promise.all([
        prisma.timeEntry.count({ where: { status: "PENDING", end: { not: null } } }),
        prisma.absence.count({ where: { status: "PENDING" } }),
        getOverrunAlerts(),
      ])
    : [0, 0, []];
  const overrunCount = overruns.length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/dashboard" aria-label="Startseite">
              <Logo size="sm" />
            </Link>
            <MobileNav>
              <NavLink href="/dashboard">Übersicht</NavLink>
              <NavLink href="/plan">Plan</NavLink>
              <NavLink href="/zeiten" exact>Zeiten</NavLink>
              <NavLink href="/urlaub">
                Urlaub
                {pendingAbsences > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-xs text-white">
                    {pendingAbsences}
                  </span>
                )}
              </NavLink>
              <NavLink href="/stundenkonto">Stundenkonto</NavLink>
              {isAdmin && <NavLink href="/mitarbeiter">Mitarbeiter</NavLink>}
              {isAdmin && <NavLink href="/schichtvorlagen">Vorlagen</NavLink>}
              {isAdmin && (
                <NavLink href="/zeiten/team">
                  Team-Zeiten
                  {overrunCount > 0 ? (
                    <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                      ⚠ {overrunCount}
                    </span>
                  ) : (
                    pendingReviews > 0 && (
                      <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-xs text-white">
                        {pendingReviews}
                      </span>
                    )
                  )}
                </NavLink>
              )}
            </MobileNav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/konto"
              title={`${name} · ${isAdmin ? "Admin" : "Mitarbeiter"}`}
              aria-label={`${name} · ${isAdmin ? "Admin" : "Mitarbeiter"}`}
              className="rounded-md border border-transparent p-1.5 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                title="Abmelden"
                aria-label="Abmelden"
                className="rounded-md border border-slate-300 p-1.5 transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-line px-4 py-3 text-center">
        <Link href="/datenschutz" className="text-xs text-muted hover:underline">
          Datenschutzerklärung
        </Link>
      </footer>
    </div>
  );
}
