import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

/** Raised-surface container — cats dashboard grid, history list items.
 * See docs/design-system.md's component inventory. */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border-hairline bg-bg-raised p-5 ${className ?? ""}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
