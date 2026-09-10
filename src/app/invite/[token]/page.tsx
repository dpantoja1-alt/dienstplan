import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { hashInviteToken } from "@/lib/invite";
import { Logo } from "@/components/logo";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = {
  title: "Einladung – Eifel Wagyu",
};

export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { inviteTokenHash: hashInviteToken(token) },
    select: { name: true, email: true, inviteExpiresAt: true },
  });

  const valid =
    user && user.inviteExpiresAt && user.inviteExpiresAt > new Date();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4">
      <Logo size="lg" />
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold [font-family:var(--font-accent)]">
          Willkommen
        </h1>

        {valid ? (
          <>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              Hallo {user.name.split(" ")[0]}, leg jetzt dein Passwort für{" "}
              <span className="font-medium">{user.email}</span> fest.
            </p>
            <AcceptForm token={token} />
          </>
        ) : (
          <>
            <p className="mb-4 mt-2 text-sm text-red-600 dark:text-red-400">
              Dieser Einladungslink ist ungültig oder abgelaufen. Bitte wende dich
              an deinen Administrator.
            </p>
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:underline dark:text-slate-300"
            >
              Zur Anmeldung
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
