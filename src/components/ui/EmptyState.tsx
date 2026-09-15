import type { ReactNode } from "react";
import Image from "next/image";
import { Expandable } from "./Expandable";
import { FlourishMark } from "./FlourishMark";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Show the shared "waiting" illustration (an unlit candle and an empty
   * crystal ball — docs/design-upgrade-round-2.md's WP2) above the title.
   * Both current callers (zero-cats, zero-history) want it; kept optional
   * rather than baked in, since a future bare/inline usage might not. */
  illustrated?: boolean;
};

/** Zero-cats / zero-history placeholder. See docs/design-system.md's
 * component inventory. */
export function EmptyState({
  title,
  description,
  action,
  illustrated,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-hairline px-6 py-12 text-center">
      {illustrated && (
        <Expandable
          label="View larger image"
          src="/images/pages/empty-vessel.png"
          alt=""
          className="mb-1 h-24 w-24"
        >
          <Image
            src="/images/pages/empty-vessel.png"
            alt=""
            width={200}
            height={200}
            sizes="96px"
            className="h-full w-full rounded-full object-cover shadow-glow-gold-sm"
          />
        </Expandable>
      )}
      <h3 className="flex items-center gap-2 font-heading text-xl text-text-primary">
        <FlourishMark size={18} className="text-gold-500" />
        {title}
      </h3>
      {description && (
        <p className="max-w-prose text-sm text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
