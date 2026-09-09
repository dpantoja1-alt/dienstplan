import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { hashInviteToken } from "@/lib/invite";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = {
  title: "Einladung – Dienstplan",
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
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="mb-1 text-xl font-semibold">Willkommen beim Dienstplan</h1>

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
