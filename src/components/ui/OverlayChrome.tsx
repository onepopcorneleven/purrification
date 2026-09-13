/** Shared chrome for the two full-screen overlay modes (Phase 23) —
 * `Lightbox` (image) and `TextLightbox` (text) render identical exit
 * affordances around different content: a decorative drag-handle hint, a
 * secondary icon-only close button top-right, and a persistent, large,
 * labeled "Close" bar at the bottom — the actual fix for `Lightbox`'s
 * original "no discoverable, thumb-reachable way to close it" bug (see
 * docs/workplan/phase-23-image-experience-redesign.md). Kept as three
 * small pieces rather than one wrapping component so each overlay still
 * owns its own content area and root `<div role="dialog">` between them. */

export function OverlayDragHandle() {
  return (
    <div className="flex justify-center pt-3" aria-hidden="true">
      <span className="h-1 w-10 rounded-full bg-border-hairline-strong" />
    </div>
  );
}

export function OverlayCloseIcon({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border-hairline bg-bg-elevated/80 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1 1L15 15M15 1L1 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** The actual bug fix: a persistent, ≥52px-tall, visibly-labeled Close
 * button that never requires guessing "tap outside" or knowing about
 * Escape — see the accessibility notes in the phase doc. */
export function OverlayCloseBar({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex justify-center px-6 py-5"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className="flex min-h-[52px] w-full max-w-xs items-center justify-center rounded-full border border-gold-500 bg-bg-elevated font-ui text-base text-gold-300 shadow-glow-gold-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
      >
        Close
      </button>
    </div>
  );
}
