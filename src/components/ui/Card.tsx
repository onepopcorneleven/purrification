import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

/** Raised-surface container — cats dashboard grid, history list items.
 * See docs/design-system.md's component inventory. The inset hairline
 * (`before:`) is a lighter-weight echo of DiagnosisCard's double-border
 * treatment, added in WP3 (docs/design-upgrade-round-2.md) so Card stops
 * being the one primitive that reads as plain-boxed next to it. */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`relative rounded-lg border border-border-hairline bg-bg-raised p-5 before:pointer-events-none before:absolute before:inset-1.5 before:rounded-md before:border before:border-gold-700/30 before:content-[''] ${className ?? ""}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
