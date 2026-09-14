"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon } from "./nav-icons";

export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="hidden flex-wrap items-center gap-1 text-sm md:flex">{children}</nav>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        className="rounded-md border border-slate-300 p-1.5 transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {open && (
        <nav className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b border-line bg-surface p-3 text-sm shadow-sm md:hidden">
          {children}
        </nav>
      )}
    </>
  );
}
