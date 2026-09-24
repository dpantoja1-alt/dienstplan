import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth-helpers";
import { ABSENCE_KINDS, ABSENCE_TYPES, type AbsenceKind } from "@/lib/absence-types";

export const metadata: Metadata = { title: "Handbuch – Eifel Wagyu" };

type Section = { id: string; title: string; adminOnly?: boolean };

const SECTIONS: Section[] = [
  { id: "start", title: "Erste Schritte" },
  { id: "uebersicht", title: "Übersicht" },
  { id: "zeiterfassung", title: "Zeiterfassung" },
  { id: "plan", title: "Dienstplan" },
  { id: "urlaub", title: "Urlaub" },
  { id: "abwesenheiten", title: "Abwesenheiten" },
  { id: "stundenkonto", title: "Stundenkonto" },
  { id: "admin-mitarbeiter", title: "Mitarbeiter verwalten", adminOnly: true },
  { id: "admin-zeiten", title: "Zeiten prüfen und korrigieren", adminOnly: true },
  { id: "admin-plan", title: "Plan erstellen", adminOnly: true },
  { id: "admin-urlaub", title: "Urlaub und Abwesenheiten verwalten", adminOnly: true },
  { id: "admin-auswertung", title: "Auswertungen und Export", adminOnly: true },
  { id: "recht", title: "Gesetzliche Grundlagen" },
  { id: "faq", title: "Häufige Fragen" },
  { id: "datenschutz", title: "Datenschutz" },
];

const legal: Record<
  AbsenceKind,
  { pay: string; vacation: string; account: string; basis: string; note: string }
> = {
  VACATION: {
    pay: "bezahlt",
    vacation: "wird abgezogen",
    account: "Sollzeit wird gutgeschrieben",
    basis: "BUrlG",
    note: "Beantragen die Mitarbeiter selbst, die Leitung genehmigt.",
  },
  SICK: {
    pay: "bezahlt (bis 6 Wochen)",
    vacation: "unberührt",
    account: "Sollzeit wird gutgeschrieben",
    basis: "§ 3 EFZG",
    note: "Ab dem 4. Kalendertag ärztliche Bescheinigung (eAU), bei Bedarf früher. Nach 6 Wochen zahlt die Krankenkasse Krankengeld, das trägt die App nicht automatisch nach.",
  },
  SICK_CHILD: {
    pay: "unbezahlt, Krankengeld von der Kasse",
    vacation: "unberührt",
    account: "Sollzeit entfällt (kein Minus)",
    basis: "§ 45 SGB V",
    note: "Betrifft die Betreuung eines kranken Kindes unter 12 Jahren. Ärztliche Bescheinigung nötig. Die Zahl der Tage je Kind und Elternteil ist gesetzlich begrenzt und wurde zuletzt befristet erhöht, den aktuellen Wert bitte bei der Krankenkasse prüfen. Zahlt der Betrieb vertraglich weiter, als „Sonstiges“ eintragen.",
  },
  SPECIAL_LEAVE: {
    pay: "bezahlt",
    vacation: "unberührt",
    account: "Sollzeit wird gutgeschrieben",
    basis: "§ 616 BGB",
    note: "Für Anlässe wie eigene Hochzeit, Geburt des Kindes, Todesfall in der Familie. Nur für eine verhältnismäßig kurze Zeit. Der Arbeitsvertrag kann § 616 einschränken oder ausschließen, das bitte vorher prüfen.",
  },
  TRAINING: {
    pay: "bezahlt",
    vacation: "unberührt",
    account: "Sollzeit wird gutgeschrieben",
    basis: "§ 15 BBiG, § 9 JArbSchG",
    note: "Berufsschule und vom Betrieb angeordnete Fortbildung sind Arbeitszeit. Der Tag zählt mit der normalen Sollzeit.",
  },
  PARENTAL: {
    pay: "kein Entgelt vom Betrieb",
    vacation: "siehe Hinweis",
    account: "Sollzeit entfällt (kein Minus)",
    basis: "BEEG, MuSchG",
    note: "Das Arbeitsverhältnis ruht. Mutterschutz: in der Regel 6 Wochen vor und 8 Wochen nach der Geburt, Mutterschaftsgeld von der Kasse plus Arbeitgeberzuschuss. Elternzeit: Urlaub darf pro vollem Monat um 1/12 gekürzt werden (§ 17 BEEG), aber nur, wenn der Betrieb das erklärt. Im Mutterschutz gibt es keine Kürzung (§ 24 MuSchG). Eine Kürzung trägst du beim Mitarbeiter unter „Urlaubstage / Jahr“ von Hand ein.",
  },
  UNPAID: {
    pay: "unbezahlt",
    vacation: "unberührt",
    account: "Sollzeit entfällt (kein Minus)",
    basis: "Vereinbarung",
    note: "Es gibt keinen gesetzlichen Anspruch, es braucht eine Absprache. Bei mehr als einem Monat am Stück Kranken- und Sozialversicherung mit dem Steuerberater klären.",
  },
  TIME_OFF: {
    pay: "bezahlt (aus dem Stundenkonto)",
    vacation: "unberührt",
    account: "Sollzeit bleibt, Stunden werden abgezogen",
    basis: "Absprache",
    note: "Freizeitausgleich für Überstunden. Der Saldo sinkt um die Sollzeit des Tages. Die App verhindert kein Minus, prüfe vorher, ob genug Überstunden da sind.",
  },
  OTHER: {
    pay: "bezahlt",
    vacation: "unberührt",
    account: "Sollzeit wird gutgeschrieben",
    basis: "–",
    note: "Für alles, was in keine andere Art passt. Bitte in der Notiz den Grund festhalten.",
  },
};

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-4 text-xl font-semibold text-foreground">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 font-semibold text-foreground">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">{children}</ul>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/40">
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
      {children}
    </div>
  );
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href as never} className="font-medium underline underline-offset-2">
      {children}
    </Link>
  );
}

export default async function HandbuchPage() {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";
  const sections = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Handbuch</h1>
      <p className="mt-1 text-sm text-muted">
        Alles zum Dienstplan zum Nachlesen.
        {isAdmin
          ? " Du siehst auch die Kapitel für die Leitung."
          : " Die Leitung hat zusätzliche Kapitel, die du nicht siehst."}
      </p>

      <nav aria-label="Inhalt" className="mt-5 rounded-lg border border-line p-4">
        <div className="text-sm font-semibold">Inhalt</div>
        <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ------------------------------------------------------------ Start */}
      <H2 id="start">Erste Schritte</H2>
      <UL>
        <li>
          Du bekommst von der Leitung einen <b>Einladungslink</b> (per E-Mail oder persönlich). Über den Link
          vergibst du dein Passwort, mindestens 8 Zeichen. Der Link ist nur begrenzt gültig. Ist er
          abgelaufen, lass dir einen neuen erzeugen.
        </li>
        <li>
          Danach meldest du dich mit deiner E-Mail-Adresse und dem Passwort an. Nach <b>5 falschen
          Versuchen</b> ist die Anmeldung für <b>15 Minuten</b> gesperrt.
        </li>
        <li>
          Oben rechts findest du das Profil-Symbol (<A href="/konto">Konto</A>) zum Ändern des Passworts und
          das Symbol zum Abmelden. Auf dem Handy öffnest du das Menü über das Hamburger-Symbol.
        </li>
      </UL>

      {/* -------------------------------------------------------- Übersicht */}
      <H2 id="uebersicht">Übersicht</H2>
      <P>Die Startseite zeigt dir das Wichtigste auf einen Blick.</P>
      <H3>Als Mitarbeiter</H3>
      <UL>
        <li>Die Stempeluhr zum Ein- und Ausstempeln.</li>
        <li>Kacheln: erfasste Zeit im Monat, Saldo im Monat, Resturlaub und ein Link zum Dienstplan.</li>
        <li>Deine nächsten fünf Schichten.</li>
      </UL>
      {isAdmin && (
        <>
          <H3>Als Leitung</H3>
          <UL>
            <li>Kacheln: Zeiten zu prüfen, offene Urlaubsanträge, Schichten heute, offene Einladungen.</li>
            <li>
              Ein <b>roter Warnhinweis</b>, wenn jemand länger eingestempelt ist als geplant. Ein Klick führt
              zu den Team-Zeiten.
            </li>
          </UL>
        </>
      )}

      {/* ---------------------------------------------------- Zeiterfassung */}
      <H2 id="zeiterfassung">Zeiterfassung</H2>
      <H3>Ein- und Ausstempeln</H3>
      <P>
        Deine Arbeitszeit erfasst du mit der Stempeluhr auf der Übersicht und unter{" "}
        <A href="/zeiten">Zeiten</A>: „Einstempeln“ bei Arbeitsbeginn, „Ausstempeln“ bei Arbeitsende.
        Selbst nachtragen oder ändern kannst du keine Zeiten. Hast du das Stempeln vergessen, sag der
        Leitung Bescheid, sie korrigiert den Eintrag.
      </P>
      <H3>Pausen</H3>
      <P>Die Pause wird automatisch abgezogen, so wie es das Arbeitszeitgesetz vorschreibt:</P>
      <UL>
        <li>mehr als 6 Stunden Anwesenheit: mindestens 30 Minuten Pause</li>
        <li>mehr als 9 Stunden Anwesenheit: mindestens 45 Minuten Pause</li>
      </UL>
      <P>
        Hat die Leitung bei dir eine höhere Mindestpause hinterlegt, gilt diese, auch bei kurzen Schichten.
        Die Leitung kann die Pause bei einem einzelnen Eintrag von Hand festlegen.
      </P>
      <H3>Status eines Eintrags</H3>
      <UL>
        <li><b>läuft</b>: du bist gerade eingestempelt.</li>
        <li><b>offen</b>: abgeschlossen, aber von der Leitung noch nicht geprüft.</li>
        <li><b>bestätigt</b>: von der Leitung geprüft und freigegeben.</li>
      </UL>
      <Warn>
        Nur <b>bestätigte</b> Zeiten zählen im Stundenkonto. Ein offener Eintrag taucht dort erst nach der
        Bestätigung auf.
      </Warn>
      <H3>Abweichung vom Plan</H3>
      <P>
        Weicht ein Arbeitstag um mehr als eine Stunde von deiner geplanten Schicht ab, wird der Tag rot
        markiert. Das ist nur ein Hinweis, kein Fehler.
      </P>
      <H3>Automatisches Ausstempeln nach 11 Stunden</H3>
      <P>
        Vergisst du das Ausstempeln, schließt die App den Eintrag automatisch nach <b>11 Stunden</b> (10
        Stunden Arbeit plus bis zu 1 Stunde Pause, § 3 ArbZG). Das Ende wird auf Start + 11 Stunden gesetzt,
        nicht auf den Zeitpunkt der Prüfung. Der Eintrag wird als „offen“ markiert und trägt einen
        Korrekturhinweis, damit die Leitung die echte Zeit einträgt. Die Prüfung läuft täglich um 4 Uhr und
        zusätzlich, sobald sich jemand in der App anmeldet oder eine Seite öffnet.
      </P>

      {/* ------------------------------------------------------------ Plan */}
      <H2 id="plan">Dienstplan</H2>
      <P>
        Unter <A href="/plan">Plan</A> siehst du die Woche als Raster: eine Zeile pro Mitarbeiter, eine
        Spalte pro Tag. Mit den Pfeilen blätterst du zwischen den Wochen. „Aktuelle Woche“ springt zurück.
        Änderungen am Plan macht die Leitung.
      </P>
      <UL>
        <li>Jede Schicht zeigt ihren Namen und ihre Zeit, zum Beispiel „Früh 06:00–14:00“.</li>
        <li>
          Urlaub steht farbig in der Zelle. Alle anderen Abwesenheiten sehen Kollegen nur als „Abwesend“, den
          Grund sieht nur die Leitung.
        </li>
        <li>Feiertage (NRW) und Tagesnotizen stehen beim jeweiligen Tag.</li>
        <li>Rechts stehen Soll und Geplant der Woche. Das Soll sinkt um Tage mit Abwesenheit.</li>
      </UL>

      {/* ---------------------------------------------------------- Urlaub */}
      <H2 id="urlaub">Urlaub</H2>
      <UL>
        <li>
          Unter <A href="/urlaub">Urlaub</A> siehst du Anspruch, genommen, beantragt und Rest in Tagen.
        </li>
        <li>
          Mit dem Formular beantragst du Urlaub für einen Zeitraum, optional mit Notiz. Für einen einzelnen
          Tag kannst du „halber Tag“ wählen.
        </li>
        <li>
          Ein Antrag ist zuerst <b>offen</b>, die Leitung <b>genehmigt</b> oder <b>lehnt ab</b>. Einen
          offenen Antrag kannst du selbst zurückziehen.
        </li>
        <li>Es zählen nur Arbeitstage. Wochenenden und NRW-Feiertage werden nicht abgezogen.</li>
        <li>Die Feiertage des Jahres stehen unten auf der Seite.</li>
      </UL>
      <H3>Wie der Anspruch berechnet wird</H3>
      <UL>
        <li>Volles Jahr: die bei dir hinterlegten Urlaubstage pro Jahr.</li>
        <li>
          Im Eintrittsjahr anteilig, 1/12 pro Monat ab dem Eintrittsmonat. Ab einem halben Tag wird
          aufgerundet (§ 5 BUrlG).
        </li>
      </UL>

      {/* --------------------------------------------------- Abwesenheiten */}
      <H2 id="abwesenheiten">Abwesenheiten</H2>
      <P>
        Alles außer Urlaub steht unter <A href="/abwesenheiten">Abwesenheiten</A>: Krankheit,
        Sonderurlaub und weitere Arten. Die Leitung trägt sie ein. Du siehst deine eigenen Einträge.
      </P>
      <P>
        Jede Art wirkt anders auf dein Stundenkonto. Es gibt drei Wirkungen:
      </P>
      <UL>
        <li>
          <b>Sollzeit wird gutgeschrieben:</b> Du hast an dem Tag nicht gearbeitet, bekommst die Stunden aber
          angerechnet. Dein Saldo ändert sich nicht.
        </li>
        <li>
          <b>Sollzeit entfällt:</b> Der Tag zählt nicht als Arbeitstag für dich. Du bekommst nichts bezahlt,
          rutschst aber auch nicht ins Minus.
        </li>
        <li>
          <b>Sollzeit bleibt:</b> Nur beim Überstundenabbau. Die Stunden werden von deinen Überstunden
          abgezogen.
        </li>
      </UL>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-muted dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2">Art</th>
              <th className="px-3 py-2">Bezahlung</th>
              <th className="px-3 py-2">Urlaubskonto</th>
              <th className="px-3 py-2">Stundenkonto</th>
              <th className="px-3 py-2">Grundlage</th>
            </tr>
          </thead>
          <tbody>
            {ABSENCE_KINDS.map((k) => (
              <tr key={k} className="border-t border-line align-top">
                <td className="px-3 py-2 font-medium">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ABSENCE_TYPES[k].color }}
                  />
                  {ABSENCE_TYPES[k].label}
                </td>
                <td className="px-3 py-2">{legal[k].pay}</td>
                <td className="px-3 py-2">{legal[k].vacation}</td>
                <td className="px-3 py-2">{legal[k].account}</td>
                <td className="px-3 py-2">{legal[k].basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H3>Hinweise zu den einzelnen Arten</H3>
      <UL>
        {ABSENCE_KINDS.map((k) => (
          <li key={k}>
            <b>{ABSENCE_TYPES[k].label}:</b> {legal[k].note}
          </li>
        ))}
      </UL>
      <Warn>
        <b>Krank im Urlaub:</b> Werden Urlaubstage durch eine ärztlich bescheinigte Krankheit unterbrochen,
        werden diese Tage nicht auf den Urlaub angerechnet (§ 9 BUrlG). Die App macht das nicht von allein.
        Die Leitung kürzt dafür den Urlaubseintrag und trägt die Krankheit separat ein.
      </Warn>

      {/* ---------------------------------------------------- Stundenkonto */}
      <H2 id="stundenkonto">Stundenkonto</H2>
      <P>
        Unter <A href="/stundenkonto">Stundenkonto</A> siehst du pro Monat, ob du im Plus oder Minus
        bist.
      </P>
      <UL>
        <li>
          <b>Soll pro Tag</b> = Wochenstunden geteilt durch Arbeitstage pro Woche. Bei 40 Stunden an 5 Tagen
          sind das 8:00 Stunden.
        </li>
        <li>
          <b>Soll im Monat</b> = Arbeitstage (Montag bis Freitag ohne NRW-Feiertage) mal Soll pro Tag,
          abzüglich der Tage, an denen die Sollzeit entfällt.
        </li>
        <li>
          <b>Ist</b> = deine bestätigte Arbeitszeit nach Abzug der Pausen.
        </li>
        <li>
          <b>Saldo</b> = Ist + Gutschriften bei bezahlter Abwesenheit − Soll.
        </li>
        <li>
          Der <b>Gesamtsaldo</b> läuft über die Monate weiter und enthält Auszahlungen und Korrekturen.
        </li>
      </UL>
      <Tip>
        <b>Beispiel:</b> 40 Wochenstunden, 20 Arbeitstage im Monat, also 160:00 Soll. Du arbeitest 150:00,
        nimmst 2 Tage Urlaub (16:00 Gutschrift): 150 + 16 − 160 = <b>+6:00</b>. Nimmst du stattdessen 2 Tage
        unbezahlten Urlaub, ist das Soll nur 144:00: 150 − 144 = <b>+6:00</b>. Nimmst du 2 Tage
        Überstundenabbau, bleibt das Soll bei 160:00: 150 − 160 = <b>−10:00</b>.
      </Tip>

      {isAdmin && (
        <>
          {/* -------------------------------------------- Admin: Mitarbeiter */}
          <H2 id="admin-mitarbeiter">Mitarbeiter verwalten</H2>
          <UL>
            <li>
              Unter <A href="/mitarbeiter">Mitarbeiter</A> legst du neue Mitarbeiter an (Name, E-Mail, Rolle)
              und bearbeitest sie.
            </li>
            <li>
              <b>Wochenstunden</b> und <b>Arbeitstage pro Woche</b> bestimmen das Tagessoll.{" "}
              <b>Urlaubstage pro Jahr</b> ist der volle Jahresanspruch. <b>Mindestpause</b> setzt eine Pause,
              die immer gilt. <b>Eintrittsdatum</b> steuert den anteiligen Urlaub im ersten Jahr und den
              Beginn des Stundenkontos. <b>Monatsgehalt brutto</b> ist nur für dich sichtbar und speist die
              Kosten im Plan.
            </li>
            <li>
              Nach dem Anlegen zeigt die App einen <b>Einladungslink</b>. Ist der E-Mail-Versand eingerichtet,
              geht er zusätzlich per Mail raus. Ein neuer Link lässt sich jederzeit erzeugen, der alte wird
              dann ungültig.
            </li>
            <li>
              <b>Deaktivieren</b> sperrt die Anmeldung, alle Daten bleiben erhalten. <b>Löschen</b> entfernt
              den Mitarbeiter samt Zeiten, Schichten und Abwesenheiten endgültig. Für ausgeschiedene
              Mitarbeiter also besser nur deaktivieren, sonst gehen Nachweise verloren.
            </li>
            <li>Du kannst dich nicht selbst deaktivieren.</li>
          </UL>

          {/* ------------------------------------------------ Admin: Zeiten */}
          <H2 id="admin-zeiten">Zeiten prüfen und korrigieren</H2>
          <UL>
            <li>
              <A href="/zeiten/team">Team-Zeiten</A> zeigt, wer gerade eingestempelt ist. Du kannst für jeden
              ein- und ausstempeln und die Einträge von heute bearbeiten. Ein roter Zähler am Menüpunkt
              meldet Überschreitungen der geplanten Zeit, sonst zeigt ein gelber Zähler die Zahl offener
              Einträge.
            </li>
            <li>
              Unter <A href="/zeiten/pruefen">Zeiten prüfen</A> stehen alle offenen Einträge nach Mitarbeiter
              gruppiert. Du kannst sie ändern (Beginn, Ende, Pause, Notiz) und einzeln
              oder mit „Alle bestätigen“ freigeben.
            </li>
            <li>Bestätigte Zeiten zählen im Stundenkonto. Prüfe regelmäßig, sonst fehlen Stunden im Saldo.</li>
            <li>
              Pro Mitarbeiter gibt es unter dem Profil eine Monatsansicht der Zeiten, in der du auch
              nachträglich Einträge anlegen kannst.
            </li>
            <li>
              Von der App automatisch ausgestempelte Einträge (11 Stunden) sind mit einem Korrekturhinweis
              versehen. Trage dort die tatsächliche Zeit ein.
            </li>
            <li>
              Ausnahme <b>Flexibler Dienst (FX)</b>: Ist an dem Tag eine Vorlage mit dem Merkmal
              „Flexibler Dienst“ eingeplant (z. B. für die Geschäftsführung), wird nicht automatisch
              ausgestempelt, es gibt keine Überzeit-Warnung und keine Plan-Abweichung, und es zählt
              die tatsächlich gestempelte Zeit.
            </li>
          </UL>

          {/* -------------------------------------------------- Admin: Plan */}
          <H2 id="admin-plan">Plan erstellen</H2>
          <UL>
            <li>
              Unter <A href="/schichtvorlagen">Vorlagen</A> legst du Schichtvorlagen an: Name, Kurzname,
              Beginn, Ende, geplante Pause und Farbe. Schichten über Mitternacht sind möglich.
            </li>
            <li>
              Im <A href="/plan">Plan</A> klickst du auf eine Zelle und wählst eine Vorlage, trägst eine
              individuelle Schicht ein oder markierst den Tag mit einer Abwesenheit. Eine individuelle
              Schicht kannst du als neue Vorlage speichern.
            </li>
            <li>
              „Vorwoche übernehmen“ kopiert die Schichten der letzten Woche, „Woche leeren“ löscht alle
              Schichten der Woche nach einer Rückfrage.
            </li>
            <li>
              Schalter im Plan blenden die <b>Ist-Zeiten</b> und, wenn Gehälter hinterlegt sind, die{" "}
              <b>Kosten</b> ein. Diese sind nur für dich sichtbar.
            </li>
            <li>Tagesnotizen stehen für alle sichtbar in der Kopfzeile des Tages.</li>
          </UL>

          {/* ----------------------------------------------- Admin: Urlaub */}
          <H2 id="admin-urlaub">Urlaub und Abwesenheiten verwalten</H2>
          <H3>Urlaub</H3>
          <UL>
            <li>
              Der <b>Urlaubskalender</b> zeigt alle Mitarbeiter im Monat. Grün ist genehmigt, gelb gestrichelt
              ist in Prüfung. Halbe Tage sind mit ½ markiert. Ein Klick auf einen Tag zeigt, wer frei hat,
              und du kannst dort direkt genehmigen, ablehnen, bearbeiten oder löschen.
            </li>
            <li>
              Unter <A href="/urlaub/antraege">Offene Anträge</A> siehst du alle Anträge mit dem
              Resturlaub des Mitarbeiters. Ein gelber Zähler am Menüpunkt „Urlaub“ zeigt die Zahl der offenen
              Anträge.
            </li>
            <li>„Urlaub eintragen“ legt einen Urlaub direkt an. Er gilt sofort als genehmigt.</li>
            <li>Die Tabelle „Urlaubskonten“ zeigt Anspruch, genommen und Rest je Mitarbeiter.</li>
          </UL>
          <H3>Abwesenheiten</H3>
          <UL>
            <li>
              Unter <A href="/abwesenheiten">Abwesenheiten</A> trägst du alle anderen Arten ein. Beim Wählen
              der Art zeigt das Formular, wie sie sich auf Bezahlung und Stundenkonto auswirkt.
            </li>
            <li>
              Im Plan kannst du eine Abwesenheit für einen Tag auch direkt aus der Zelle setzen. Sie ist dann
              sofort genehmigt.
            </li>
            <li>
              Wechselt die Art (z. B. von „Sonstiges“ zu „Unbezahlter Urlaub“), rechnet sich das
              Stundenkonto rückwirkend neu. Bestehende „Sonstiges“-Einträge werden weiter
              gutgeschrieben, ändere die Art dort, wo sie unbezahlt oder etwas anderes war.
            </li>
          </UL>

          {/* --------------------------------------------- Admin: Auswertung */}
          <H2 id="admin-auswertung">Auswertungen und Export</H2>
          <UL>
            <li>
              Im <A href="/stundenkonto">Stundenkonto</A> wählst du oben einen Mitarbeiter. Die Übersicht
              „alle Mitarbeiter“ zeigt den Saldo des Monats für alle.
            </li>
            <li>
              <b>Stundennachweis (Druck / PDF)</b> erzeugt eine druckbare Monatsübersicht pro Mitarbeiter mit
              Tagen, Zeiten, Abwesenheiten, Soll, Ist und Saldo.
            </li>
            <li>
              <b>CSV herunterladen</b> liefert dieselben Daten für Excel. „Team-Übersicht CSV“ liefert alle
              Mitarbeiter in einer Datei.
            </li>
            <li>
              <b>Überstunden auszahlen:</b> Im Stundenkonto eines Mitarbeiters trägst du eine Auszahlung mit
              Stunden, Stichtag und Notiz ein. Sie wird vom Saldo abgezogen und in Nachweis und CSV
              ausgewiesen.
            </li>
          </UL>
        </>
      )}

      {/* ------------------------------------------------------------ Recht */}
      <H2 id="recht">Gesetzliche Grundlagen</H2>
      <P>
        Die App setzt die folgenden Regeln um. Sie ersetzt keine Rechtsberatung, im Zweifel gelten
        Arbeitsvertrag und Tarifvertrag.
      </P>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-muted dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2">Regel</th>
              <th className="px-3 py-2">Inhalt</th>
              <th className="px-3 py-2">In der App</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["§ 3 ArbZG", "Höchstens 10 Stunden Arbeit am Tag", "Automatisches Ausstempeln nach 11 Stunden (10 + 1 Stunde Pause)"],
              ["§ 4 ArbZG", "30 Min. Pause über 6 Std., 45 Min. über 9 Std.", "Pause wird automatisch abgezogen"],
              ["§ 5 ArbZG", "11 Stunden Ruhezeit zwischen zwei Arbeitstagen", "Die App prüft das nicht, bitte beim Planen beachten"],
              ["§ 3 EFZG", "Lohnfortzahlung bei Krankheit bis 6 Wochen", "Krank = Sollzeit wird gutgeschrieben"],
              ["§ 5 EFZG", "Krankmeldung, ärztliche Bescheinigung ab dem 4. Tag", "Nachweis liegt bei der Leitung, die App speichert nur die Tage"],
              ["§ 3, § 5 BUrlG", "Mindesturlaub 24 Werktage (20 Tage bei 5-Tage-Woche), anteilig im Eintrittsjahr, ab 0,5 aufrunden", "Anspruch pro Jahr und anteilige Berechnung"],
              ["§ 9 BUrlG", "Krankheitstage im Urlaub werden nicht angerechnet", "Manuell durch die Leitung"],
              ["§ 616 BGB", "Bezahlte Freistellung bei persönlichem Anlass", "Sonderurlaub"],
              ["§ 45 SGB V", "Freistellung bei Erkrankung des Kindes, Krankengeld von der Kasse", "Kind krank = Sollzeit entfällt"],
              ["BEEG / MuSchG", "Elternzeit und Mutterschutz, Arbeitsverhältnis ruht", "Elternzeit / Mutterschutz = Sollzeit entfällt"],
              ["§ 15 BBiG, § 9 JArbSchG", "Berufsschule ist Arbeitszeit", "Berufsschule / Fortbildung = Sollzeit wird gutgeschrieben"],
            ].map(([rule, content, app]) => (
              <tr key={rule} className="border-t border-line align-top">
                <td className="px-3 py-2 font-medium">{rule}</td>
                <td className="px-3 py-2">{content}</td>
                <td className="px-3 py-2">{app}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        Feiertage werden für Nordrhein-Westfalen berechnet (Neujahr, Karfreitag, Ostermontag, 1. Mai,
        Christi Himmelfahrt, Pfingstmontag, Fronleichnam, 3. Oktober, Allerheiligen, 1. und 2.
        Weihnachtstag).
      </P>

      {/* ------------------------------------------------------------- FAQ */}
      <H2 id="faq">Häufige Fragen</H2>
      <H3>Ich habe vergessen auszustempeln.</H3>
      <P>
        Sag der Leitung Bescheid. Nach 11 Stunden schließt die App den Eintrag von selbst, die Leitung trägt
        dann die echte Zeit ein.
      </P>
      <H3>Meine gestempelte Zeit fehlt im Stundenkonto.</H3>
      <P>Die Zeit zählt erst, wenn die Leitung sie bestätigt hat. Bis dahin steht sie als „offen“ da.</P>
      <H3>Mein Saldo ist im Minus, obwohl ich krank war.</H3>
      <P>
        Krankheit wird gutgeschrieben, sobald die Leitung sie einträgt. Prüfe unter Abwesenheiten, ob dein
        Krankheitszeitraum erfasst ist.
      </P>
      <H3>Ich habe mich ausgesperrt.</H3>
      <P>
        Nach 5 falschen Passwörtern wartest du 15 Minuten. Hast du das Passwort vergessen, lässt du dir von
        der Leitung einen neuen Einladungslink erzeugen.
      </P>
      <H3>Ich sehe die Kosten oder Gehälter nicht.</H3>
      <P>Das ist gewollt, sie sind nur für die Leitung sichtbar.</P>
      <H3>Ein Tag ist bei den Zeiten rot.</H3>
      <P>Rot heißt: mehr als eine Stunde Abweichung von der geplanten Schicht.</P>

      {/* ---------------------------------------------------- Datenschutz */}
      <H2 id="datenschutz">Datenschutz</H2>
      <P>
        Die App speichert nur, was für Arbeitszeit, Plan und Abwesenheiten nötig ist. Krankheit, Kind krank,
        Elternzeit und Mutterschutz sind besonders sensible Angaben. Sie sind nur für die Leitung und für
        dich selbst sichtbar. Im Plan sehen Kollegen bei allen Abwesenheiten außer Urlaub nur „Abwesend“. Die vollständige Erklärung steht unter{" "}
        <A href="/datenschutz">Datenschutzerklärung</A>.
      </P>
    </div>
  );
}
