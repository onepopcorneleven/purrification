import NextLink from "next/link";
import type { ComponentProps } from "react";

type TextLinkProps = ComponentProps<typeof NextLink>;

/** Inline text link with the shared focus-visible ring — accessibility
 * rule in docs/design-system.md ("a visible ring...on every interactive
 * element...buttons, links, form inputs"), which plain `<Link>` usages
 * don't get for free. No color/hover styling of its own — that's up to
 * the caller via `className`, same as `Button`'s variants. */
export function TextLink({ className, ...props }: TextLinkProps) {
  return (
    <NextLink
      className={`rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base ${className ?? ""}`.trim()}
      {...props}
    />
  );
}
