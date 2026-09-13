"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Lightbox } from "./Lightbox";

type ExpandableProps = {
  /** Accessible name for the overlay click target — required, not optional,
   * since the image underneath is typically decorative (`alt=""`) and this
   * button would otherwise have no accessible name at all (WCAG 4.1.2). */
  label: string;
  /** Full-size image shown in the Lightbox. Passed separately from
   * `children` rather than derived from them — `children` is rendered
   * completely untouched, so this is the one place the full-size source
   * has to be named explicitly (yes, it duplicates the `src` already on the
   * child `<Image>` — see docs/workplan/phase-21-image-enrichment.md's
   * "New shared UI components" section for why that trade is worth it). */
  src: string;
  alt: string;
  className?: string;
  /** Optional caption shown in the Lightbox under the image (Phase 23) —
   * e.g. a diagnosis's mystical name. */
  caption?: string;
  children: ReactNode;
};

/** Children-based click-to-expand overlay (Phase 21) — wraps the host's
 * existing, completely untouched image markup (its own `<Image>` props and
 * CSS keep working exactly as before) and layers a transparent, labeled
 * button on top that opens a shared `Lightbox`. Deliberately does *not*
 * wrap `next/image` itself in a `<button>`: every image site in this app
 * frames its `<Image>` with CSS applied directly to that element
 * (`object-fit`, `aspect-ratio`, grid-item sizing), none of which survives
 * being moved onto a `<button>` — see the phase doc's "Revision history"
 * for the full reasoning. Manages its own `open` state internally, like
 * `Toast`/`Modal` — no lifted state, each instance independent. */
export function Expandable({
  label,
  src,
  alt,
  className,
  caption,
  children,
}: ExpandableProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className} style={{ position: "relative" }}>
      {children}
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className="absolute inset-0 cursor-zoom-in rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
      />
      <Lightbox
        open={open}
        onClose={() => setOpen(false)}
        src={src}
        alt={alt}
        caption={caption}
      />
    </div>
  );
}
