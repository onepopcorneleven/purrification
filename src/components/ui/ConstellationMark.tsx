type ConstellationMarkProps = {
  size?: number;
  className?: string;
};

/** Three dots joined by thin lines — one of Phase 23's "chapter mark" family
 * (docs/workplan/phase-23-image-experience-redesign.md's "Decorative gold
 * marks"). Sits above the results overview's "Spiritual Reading" eyebrow and
 * above the login/signup headlines. Purely decorative — always
 * `aria-hidden`. */
export function ConstellationMark({
  size = 16,
  className,
}: ConstellationMarkProps) {
  return (
    <svg
      viewBox="0 0 60 20"
      width={size * 3}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 14L30 6L54 14"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <circle cx="6" cy="14" r="1.6" fill="currentColor" />
      <circle cx="30" cy="6" r="1.9" fill="currentColor" />
      <circle cx="54" cy="14" r="1.6" fill="currentColor" />
    </svg>
  );
}
