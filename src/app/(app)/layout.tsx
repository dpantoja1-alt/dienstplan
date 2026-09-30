import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOverrunAlerts } from "@/lib/alerts";
import { Logo } from "@/components/logo";
import { SideNav, BottomNav, type NavItem } from "./side-nav";
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

  const home: NavItem = { href: "/dashboard", label: "Übersicht", short: "Start", icon: "home" };
  const plan: NavItem = { href: "/plan", label: "Plan", icon: "plan" };
  const zeiten: NavItem = {
    href: "/zeiten",
    label: "Meine Zeiten",
    short: "Zeiten",
    icon: "zeiten",
    also: ["/stundenkonto"],
    except: ["/zeiten/team", "/zeiten/pruefen"],
  };
  const urlaub: NavItem = {
    href: "/urlaub",
    label: "Urlaub",
    icon: "urlaub",
    also: isAdmin ? [] : ["/abwesenheiten"],
    badge: pendingAbsences > 0 ? { text: String(pendingAbsences), tone: "amber" } : null,
  };
  const team: NavItem = {
    href: "/zeiten/team",
    label: "Team",
    icon: "team",
    also: ["/zeiten/pruefen", "/abwesenheiten"],
    badge:
      overrunCount > 0
        ? { text: `⚠ ${overrunCount}`, tone: "red" }
        : pendingReviews > 0
          ? { text: String(pendingReviews), tone: "amber" }
          : null,
  };
  const mitarbeiter: NavItem = { href: "/mitarbeiter", label: "Mitarbeiter", icon: "mitarbeiter" };
  const vorlagen: NavItem = { href: "/schichtvorlagen", label: "Schichtvorlagen", icon: "vorlagen" };
  const handbuch: NavItem = { href: "/handbuch", label: "Handbuch", icon: "handbuch" };
  const konto: NavItem = { href: "/konto", label: "Konto", icon: "konto" };

  const roleLabel = isAdmin ? "Leitung" : "Mitarbeiter";

  const logout = (
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
        className="rounded-md p-2 text-side-muted transition hover:bg-side-active/50 hover:text-side-text"
      >
        <LogoutIcon className="h-5 w-5" />
      </button>
    </form>
  );

  const logo = (
    <Link href="/dashboard" aria-label="Startseite">
      <Logo size="sm" />
    </Link>
  );

  return (
    <div className="flex min-h-dvh">
      <SideNav
        main={[home, plan, zeiten, urlaub]}
        admin={isAdmin ? [team, mitarbeiter, vorlagen] : []}
        footer={[handbuch]}
        logo={logo}
        userName={name ?? ""}
        roleLabel={roleLabel}
        logout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Handy: schlanke Kopfzeile, Navigation unten */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-side-line bg-side/95 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
          {logo}
          <div className="flex items-center gap-1">
            <Link
              href="/konto"
              aria-label={`${name} · ${roleLabel}`}
              className="rounded-md p-2 text-side-muted transition hover:text-side-text"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
            {logout}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-6 has-[>.wide]:max-w-none md:px-8 md:pt-8">
          {children}
        </main>
        <footer className="mb-[calc(4.25rem+env(safe-area-inset-bottom))] border-t border-line px-4 py-3 text-center md:mb-0">
          <Link href="/datenschutz" className="text-xs text-muted hover:underline">
            Datenschutzerklärung
          </Link>
        </footer>
      </div>

      <BottomNav
        items={isAdmin ? [home, plan, zeiten, urlaub, team] : [home, plan, zeiten, urlaub]}
        more={isAdmin ? [mitarbeiter, vorlagen, handbuch, konto] : [handbuch, konto]}
      />
    </div>
  );
}
