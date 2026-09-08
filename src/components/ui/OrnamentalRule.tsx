type OrnamentalRuleProps = {
  className?: string;
};

/** A hairline rule with a centered gold diamond — the "engraved certificate"
 * accent from docs/design-upgrade-round-2.md's WP1, replacing the plain
 * border-b/border-t hairlines PageShell's header/footer used before. Purely
 * decorative. */
export function OrnamentalRule({ className }: OrnamentalRuleProps) {
  return (
    <div
      className={`relative h-px w-full bg-border-hairline ${className ?? ""}`.trim()}
      aria-hidden="true"
    >
      <span className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-gold-500 bg-bg-base" />
    </div>
  );
}
