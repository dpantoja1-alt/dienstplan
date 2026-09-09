"use client";

import { useState, useTransition } from "react";
import { regenerateInvite } from "../actions";

export function InvitePanel({
  userId,
  initialUrl,
  mailSent,
  expiresAt,
}: {
  userId: string;
  initialUrl?: string;
  mailSent: boolean;
  expiresAt: string | null;
}) {
  const [url, setUrl] = useState<string | undefined>(initialUrl);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await regenerateInvite(userId);
        setUrl(res.url);
        setCopied(false);
      } catch {
        setError("Konnte keinen neuen Link erzeugen.");
      }
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich – Link bitte manuell markieren.");
    }
  }

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
        Einladung offen – der Mitarbeiter hat noch kein Passwort gesetzt.
      </p>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
        {mailSent
          ? "Einladungs-E-Mail wurde verschickt."
          : "E-Mail-Versand ist nicht eingerichtet – Link bitte manuell weitergeben."}
        {expiryText && ` Gültig bis ${expiryText}.`}
      </p>

      {url ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs dark:border-amber-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-amber-700"
            >
              {copied ? "Kopiert ✓" : "Kopieren"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          Aus Sicherheitsgründen wird der Link nicht gespeichert. Erzeuge bei Bedarf
          einen neuen.
        </p>
      )}

      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="mt-3 rounded-md border border-amber-400 px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-60 dark:text-amber-200 dark:hover:bg-amber-900/40"
      >
        {pending ? "Erzeuge …" : "Neuen Einladungslink erzeugen"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
