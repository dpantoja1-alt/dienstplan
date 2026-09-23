/**
 * Zentrale Definition aller Abwesenheitsarten.
 *
 * effect bestimmt die Wirkung auf das Stundenkonto:
 *  - credit:   bezahlt, die Sollzeit des Tages wird gutgeschrieben (Saldo bleibt neutral)
 *  - sollFree: unbezahlt/ruhend, die Sollzeit des Tages entfällt (Saldo bleibt neutral)
 *  - none:     Sollzeit bleibt bestehen, es wird nichts gutgeschrieben (Freizeitausgleich)
 */
export type AbsenceKind =
  | "VACATION"
  | "SICK"
  | "SICK_CHILD"
  | "SPECIAL_LEAVE"
  | "TRAINING"
  | "PARENTAL"
  | "UNPAID"
  | "TIME_OFF"
  | "OTHER";

export type AbsenceEffect = "credit" | "sollFree" | "none";

export type AbsenceGroup = "vacation" | "other";

export type AbsenceTypeInfo = {
  label: string;
  color: string;
  effect: AbsenceEffect;
  group: AbsenceGroup;
  hint: string;
};

export const ABSENCE_TYPES: Record<AbsenceKind, AbsenceTypeInfo> = {
  VACATION: {
    label: "Urlaub",
    color: "#0ea5e9",
    effect: "credit",
    group: "vacation",
    hint: "Bezahlt, mindert den Urlaubsanspruch.",
  },
  SICK: {
    label: "Krank",
    color: "#ef4444",
    effect: "credit",
    group: "other",
    hint: "Bezahlt (Entgeltfortzahlung bis 6 Wochen, EFZG). Die Sollzeit wird gutgeschrieben.",
  },
  SICK_CHILD: {
    label: "Kind krank",
    color: "#f97316",
    effect: "sollFree",
    group: "other",
    hint: "Freistellung nach § 45 SGB V, Krankengeld zahlt die Kasse. Vom Betrieb unbezahlt, die Sollzeit entfällt.",
  },
  SPECIAL_LEAVE: {
    label: "Sonderurlaub",
    color: "#8b5cf6",
    effect: "credit",
    group: "other",
    hint: "Bezahlte Freistellung bei persönlichem Anlass (§ 616 BGB), z. B. Hochzeit, Geburt, Todesfall. Mindert den Urlaub nicht.",
  },
  TRAINING: {
    label: "Berufsschule / Fortbildung",
    color: "#14b8a6",
    effect: "credit",
    group: "other",
    hint: "Gilt als Arbeitszeit (§ 15 BBiG, § 9 JArbSchG). Die Sollzeit wird gutgeschrieben.",
  },
  PARENTAL: {
    label: "Elternzeit / Mutterschutz",
    color: "#ec4899",
    effect: "sollFree",
    group: "other",
    hint: "Arbeitsverhältnis ruht (BEEG, MuSchG). Kein Arbeitsentgelt vom Betrieb, die Sollzeit entfällt.",
  },
  UNPAID: {
    label: "Unbezahlter Urlaub",
    color: "#78716c",
    effect: "sollFree",
    group: "other",
    hint: "Nur nach Vereinbarung. Unbezahlt, die Sollzeit entfällt.",
  },
  TIME_OFF: {
    label: "Überstundenabbau",
    color: "#6366f1",
    effect: "none",
    group: "other",
    hint: "Freizeitausgleich: Die Sollzeit bleibt, die Stunden werden vom Stundenkonto abgezogen.",
  },
  OTHER: {
    label: "Sonstiges",
    color: "#64748b",
    effect: "credit",
    group: "other",
    hint: "Sonstige bezahlte Abwesenheit. Die Sollzeit wird gutgeschrieben.",
  },
};

export const ABSENCE_KINDS = Object.keys(ABSENCE_TYPES) as AbsenceKind[];

export function typesOfGroup(group: AbsenceGroup): { value: AbsenceKind; label: string }[] {
  return ABSENCE_KINDS.filter((k) => ABSENCE_TYPES[k].group === group).map((k) => ({
    value: k,
    label: ABSENCE_TYPES[k].label,
  }));
}
