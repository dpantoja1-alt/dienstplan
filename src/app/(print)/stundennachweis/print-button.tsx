"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
    >
      Drucken / als PDF speichern
    </button>
  );
}
