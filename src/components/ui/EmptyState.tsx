import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Zero-cats / zero-history placeholder. See docs/design-system.md's
 * component inventory. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-hairline px-6 py-12 text-center">
      <h3 className="font-heading text-xl text-text-primary">{title}</h3>
      {description && (
        <p className="max-w-prose text-sm text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
