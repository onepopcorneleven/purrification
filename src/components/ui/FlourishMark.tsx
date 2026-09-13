type FlourishMarkProps = {
  size?: number;
  className?: string;
};

/** A small curl-and-dot glyph — one of Phase 23's "chapter mark" family
 * (docs/workplan/phase-23-image-experience-redesign.md's "Decorative gold
 * marks"). Used mirrored at all four corners of every `FramedImage` variant,
 * and standalone next to section headings with no adjacent image to frame.
 * Purely decorative — always `aria-hidden`. */
export function FlourishMark({ size = 20, className }: FlourishMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 20c0-8 4-14 12-16"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="3.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
