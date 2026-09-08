type MarkProps = {
  size?: number;
  className?: string;
};

/** The Purrification icon-only mark — see docs/design/logo-concepts/mark.svg
 * for the standalone source (also shipped as public/icons/favicon.svg).
 * This inline copy lets it scale/inherit crisply inside the page shell. */
export function Mark({ size = 32, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Purrification"
    >
      <circle cx="32" cy="32" r="31" fill="#0d0a12" />
      <circle
        cx="32"
        cy="32"
        r="29.5"
        fill="none"
        stroke="#d4af37"
        strokeWidth="1.4"
      />
      <circle
        cx="32"
        cy="32"
        r="26.5"
        fill="none"
        stroke="#b8933f"
        strokeWidth="0.5"
      />
      <path
        fill="#d4af37"
        d="M16,24 L22,9 L27,22 Z
           M48,24 L42,9 L37,22 Z
           M18,26 C13,35 13,43 20,47 C25,50 39,50 44,47
           C51,43 51,35 46,26 C43,22 38,20 32,20 C26,20 21,22 18,26 Z"
      />
      <circle cx="30" cy="27" r="5" fill="#0d0a12" />
      <circle cx="32.5" cy="26.3" r="4.3" fill="#d4af37" />
    </svg>
  );
}
