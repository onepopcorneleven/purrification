type CrescentMarkProps = {
  size?: number;
  className?: string;
};

/** A thin gold crescent-moon outline — the one genuinely new glyph in Phase
 * 23's "chapter mark" family (docs/workplan/phase-23-image-experience-redesign.md's
 * "Decorative gold marks" — the brand doc's logo-direction section names a
 * crescent moon as mark territory left unused until this glyph). Placed at
 * the start of a long-form text block (DiagnosisReveal's diagnosis text,
 * TreatmentReveal's ritual text), with a one-shot `animate-fade-in` on
 * mount rather than a continuous loop — see that doc's "On the user's
 * motion suggestion" note for why. Purely decorative — always
 * `aria-hidden`. */
export function CrescentMark({ size = 22, className }: CrescentMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`animate-fade-in ${className ?? ""}`.trim()}
      aria-hidden="true"
    >
      <path
        d="M15 3a9 9 0 100 18 7.2 7.2 0 010-18z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
