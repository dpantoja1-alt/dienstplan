import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Datenschutz – Eifel Wagyu",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold text-foreground">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>;
}

export default function DatenschutzPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-4 py-10">
      <Link href="/dashboard" aria-label="Startseite" className="self-start">
        <Logo size="sm" />
      </Link>

      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Datenschutzerklärung – Dienstplan
        </h1>
        <p className="mt-1 text-sm text-muted">Stand: 14. September 2026</p>

        <P>
          Diese Erklärung informiert Mitarbeiterinnen und Mitarbeiter der TOP BEEF GmbH
          (Marke „Eifel Wagyū“) darüber, welche personenbezogenen Daten in der internen
          Dienstplan- und Zeiterfassungs-Anwendung („Dienstplan“) verarbeitet werden und
          welche Rechte ihnen dabei nach der Datenschutz-Grundverordnung (DSGVO) und dem
          Bundesdatenschutzgesetz (BDSG) zustehen.
        </P>

        <H2>1. Verantwortlicher</H2>
        <P>
          TOP BEEF GmbH
          <br />
          Normannenstraße 9, 41462 Neuss
          <br />
          Geschäftsführer: Tom Brass
        </P>

        <H2>2. Ansprechpartner für Datenschutzfragen</H2>
        <P>
          Bei Fragen zu dieser Erklärung oder zur Ausübung deiner Rechte (z. B. Auskunft,
          Löschung) wende dich an den Geschäftsführer, Tom Brass, unter den oben genannten
          Kontaktdaten. Ein gesonderter Datenschutzbeauftragter ist aufgrund der
          Unternehmensgröße gesetzlich nicht vorgeschrieben (§ 38 BDSG: Pflicht erst ab 20
          Personen, die ständig mit automatisierter Datenverarbeitung befasst sind).
        </P>

        <H2>3. Welche Daten werden verarbeitet?</H2>
        <P>Im Dienstplan werden folgende Daten zu deiner Person gespeichert:</P>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
          <li>Name und E-Mail-Adresse (Zugang/Login)</li>
          <li>Passwort – ausschließlich als Hash gespeichert, nicht im Klartext einsehbar</li>
          <li>Rolle (Mitarbeiter/Admin), Beschäftigungsbeginn, Wochenstunden, Arbeitstage</li>
          <li>Geplante und tatsächlich gearbeitete Zeiten (Schichtplan, Stempeluhr, manuelle Einträge)</li>
          <li>Abwesenheiten (Urlaub, Krankheit, Sonstiges) inkl. Genehmigungsstatus</li>
          <li>Urlaubsanspruch und Stundenkonto (Über-/Minderstunden)</li>
          <li>
            Bruttomonatsgehalt – <strong>optional</strong>, nur falls von der Geschäftsführung
            hinterlegt, ausschließlich zur internen Kostenkalkulation im Schichtplan
          </li>
        </ul>

        <H2>4. Zu welchem Zweck und auf welcher Rechtsgrundlage?</H2>
        <P>
          Die Verarbeitung erfolgt zur Durchführung des Beschäftigungsverhältnisses – für
          Personalplanung, gesetzeskonforme Arbeitszeiterfassung, Urlaubsverwaltung und
          Lohn-/Gehaltsvorbereitung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
          (Erforderlichkeit für das Beschäftigungsverhältnis) in Verbindung mit § 26 BDSG.
          Eine Einwilligung der Mitarbeitenden ist dafür nicht erforderlich.
        </P>

        <H2>5. Wer hat Zugriff auf welche Daten?</H2>
        <P>
          Jeder Mitarbeiter sieht standardmäßig nur seine eigenen Zeiten, Schichten und
          Urlaubsdaten. Die Admin-Rolle (Geschäftsführung) kann zusätzlich die Daten aller
          Mitarbeiter einsehen und verwalten, einschließlich der optionalen Gehaltsangabe.
          Der Zugriff ist technisch durch Rollenprüfung auf jeder Seite der Anwendung
          abgesichert.
        </P>

        <H2>6. Wer verarbeitet die Daten noch (Dienstleister)?</H2>
        <P>Folgende Dienstleister sind als technische Auftragsverarbeiter eingebunden:</P>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <strong>Neon</strong> (Datenbank-Hosting) – Server in Frankfurt am Main, EU
          </li>
          <li>
            <strong>Vercel</strong> (Anwendungs-Hosting) – Server in Frankfurt am Main, EU
          </li>
        </ul>
        <P>
          Der optionale E-Mail-Versand von Einladungslinks über den Anbieter Resend ist
          aktuell <strong>nicht aktiv</strong>; Einladungslinks werden ausschließlich im
          Admin-Bereich der Anwendung angezeigt und von der Geschäftsführung persönlich
          weitergegeben. Sollte der E-Mail-Versand künftig aktiviert werden, wird diese
          Erklärung entsprechend ergänzt (Resend ist ein US-Anbieter, dafür wäre ein
          zusätzlicher Auftragsverarbeitungsvertrag mit geeigneten Garantien für die
          Datenübermittlung in die USA erforderlich).
        </P>

        <H2>7. Wie lange werden die Daten gespeichert?</H2>
        <P>
          Daten werden für die Dauer des Beschäftigungsverhältnisses gespeichert. Danach
          werden sie gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen
          – insbesondere für lohn- und gehaltsrelevante Unterlagen, die nach § 257 HGB bzw.
          § 147 AO bis zu zehn Jahre aufzubewahren sind. Vor der endgültigen Löschung eines
          Mitarbeiterkontos werden diese Unterlagen exportiert und getrennt von der
          Anwendung archiviert.
        </P>

        <H2>8. Deine Rechte</H2>
        <P>Du hast als betroffene Person das Recht auf:</P>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
          <li>Auskunft über die zu dir gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung, soweit keine Aufbewahrungspflicht entgegensteht (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO) – z. B. als CSV-Export deiner Zeiten</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <P>
          Deine Stammdaten, Zeiten und Urlaubsübersicht kannst du jederzeit selbst in der
          Anwendung einsehen. Für Auskunfts- oder Löschanträge wende dich an die in Ziffer 2
          genannte Kontaktperson.
        </P>

        <H2>9. Beschwerderecht</H2>
        <P>
          Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren,
          insbesondere bei der für den Sitz der TOP BEEF GmbH zuständigen Behörde:
          <br />
          Landesbeauftragte für Datenschutz und Informationsfreiheit
          Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf.
        </P>

        <H2>10. Automatisierte Entscheidungsfindung</H2>
        <P>
          Es findet keine automatisierte Entscheidungsfindung oder Profiling im Sinne von
          Art. 22 DSGVO statt. Warnhinweise der Anwendung (z. B. bei Überschreitung der
          Planzeit) dienen ausschließlich der Information der Geschäftsführung und lösen
          keine automatischen Konsequenzen aus.
        </P>

        <H2>11. Änderungen dieser Erklärung</H2>
        <P>
          Diese Erklärung wird angepasst, sobald sich die Datenverarbeitung in der
          Anwendung wesentlich ändert (z. B. neue Funktionen, neue Dienstleister). Die
          jeweils aktuelle Fassung ist immer unter dieser Adresse abrufbar.
        </P>

        <div className="mt-8 border-t border-line pt-4">
          <Link href="/login" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            ← Zur Anmeldung
          </Link>
        </div>
      </div>
    </main>
  );
}
