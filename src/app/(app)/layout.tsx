import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { NavLink } from "./nav-link";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireUser();
  const { name, role } = session.user;
  const isAdmin = role === "ADMIN";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              Dienstplan
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/dashboard">Übersicht</NavLink>
              {isAdmin && <NavLink href="/mitarbeiter">Mitarbeiter</NavLink>}
              <NavLink href="/konto">Konto</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {name} · {isAdmin ? "Admin" : "Mitarbeiter"}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1 transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
