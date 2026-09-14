import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "../stundennachweis/print-button";

export const metadata: Metadata = { title: "Kenntnisnahme Datenschutzerklärung" };

export default async function DatenschutzKenntnisnahmePage({
  searchParams,
}: PageProps<"/datenschutz-kenntnisnahme">) {
  const { user: me } = await requireUser();

  const sp = await searchParams;
  const targetId = typeof sp.u === "string" ? sp.u : me.id;
  if (targetId !== me.id) await requireAdmin();

  const target =
    targetId === me.id
      ? me
      : await prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true, name: true },
        });
  if (!target) redirect("/mitarbeiter");

  return (
    <div className="text-sm">
      <div className="mb-4 flex items-start justify-between print:hidden">
        <a href="/datenschutz" className="text-slate-500 hover:underline">
          ← Datenschutzerklärung
        </a>
        <PrintButton />
      </div>

      <h1 className="text-lg font-bold">Kenntnisnahme der Datenschutzerklärung</h1>
      <p className="mt-1 text-slate-600">Dienstplan – TOP BEEF GmbH (Eifel Wagyū)</p>

      <p className="mt-6 leading-relaxed">
        Hiermit bestätige ich, <strong>{target.name}</strong>, dass ich die
        Datenschutzerklärung zur Dienstplan-Anwendung (abrufbar unter
        „/datenschutz“ in der Anwendung sowie als Anlage zu diesem Blatt)
        erhalten und zur Kenntnis genommen habe.
      </p>

      <p className="mt-4 leading-relaxed">
        Mir ist bekannt, welche personenbezogenen Daten im Rahmen der
        Dienstplan- und Zeiterfassungs-Anwendung verarbeitet werden
        (u. a. Name, E-Mail-Adresse, Arbeitszeiten, Schichtplan, Abwesenheiten,
        Urlaubsanspruch sowie – falls hinterlegt – mein Bruttomonatsgehalt zur
        internen Kostenkalkulation), zu welchem Zweck dies geschieht und
        welche Rechte mir als betroffene Person zustehen (Auskunft,
        Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit,
        Widerspruch, Beschwerde bei der Aufsichtsbehörde).
      </p>

      <p className="mt-4 leading-relaxed text-slate-600">
        Diese Bestätigung ist eine Nachweis-Kenntnisnahme der Informationspflicht
        nach Art. 13 DSGVO. Sie ist <strong>keine Einwilligung</strong> im Sinne
        von Art. 6 Abs. 1 lit. a DSGVO – die Verarbeitung erfolgt unabhängig
        davon auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO i. V. m. § 26 BDSG
        (Erforderlichkeit für das Beschäftigungsverhältnis) und ist für die
        Nutzung der Anwendung nicht widerruflich.
      </p>

      <div className="mt-16 flex justify-between text-xs text-slate-500">
        <div className="w-64">
          <div className="mb-2 border-b border-slate-400 pb-8" />
          Datum, Unterschrift Mitarbeiter
        </div>
        <div className="w-64">
          <div className="mb-2 border-b border-slate-400 pb-8" />
          Datum, Unterschrift Leitung
        </div>
      </div>

      <p className="mt-10 text-[11px] text-slate-400">
        Erstellt am {format(new Date(), "dd.MM.yyyy")}. Bitte ausgedruckt
        unterschreiben und in der Personalakte ablegen.
      </p>
    </div>
  );
}
