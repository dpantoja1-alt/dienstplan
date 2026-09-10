/**
 * Wortmarke „Eifel Wagyū“ – nachgebaut mit Barlow Semi Condensed in den
 * Markenfarben (Eifel Meadow / Eifel Stone). Bei Bedarf durch die Original-SVG
 * unter /public ersetzbar.
 */
export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl sm:text-6xl",
  }[size];

  return (
    <span
      className={`inline-flex select-none items-center font-bold uppercase leading-none tracking-tight [font-family:var(--font-logo)] ${text} ${className}`}
      aria-label="Eifel Wagyu"
    >
      <span style={{ color: "var(--brand)" }}>Eifel</span>
      <span
        aria-hidden
        className="mx-[0.12em] inline-block w-px self-stretch"
        style={{ backgroundColor: "var(--brand)" }}
      />
      <span style={{ color: "var(--muted)" }}>Wagyū</span>
    </span>
  );
}
