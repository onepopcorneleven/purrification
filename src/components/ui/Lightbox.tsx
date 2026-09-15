"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  OverlayCloseBar,
  OverlayCloseIcon,
  OverlayDragHandle,
} from "./OverlayChrome";

type LightboxProps = {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  /** Optional caption shown under the image, above the Close bar — e.g. a
   * diagnosis's mystical name (Phase 23). */
  caption?: string;
};

/** Full-bleed, dark-overlay single-image viewer (Phase 21; fixed in Phase
 * 23) — the shared click-to-expand destination for every image site-wide,
 * opened by `Expandable`, and the "full-screen image" mode reached from
 * `DiagnosisReveal`/`TreatmentReveal`'s expand-image affordance. Originally
 * shipped with no discoverable, thumb-reachable way to close it on mobile
 * (tap-outside/Escape only) — Phase 23 adds the persistent bottom Close bar
 * (`OverlayCloseBar`) as the actual fix, plus the drag-handle hint and
 * secondary top-right icon shared with `TextLightbox`. `.lightbox-fog`
 * reuses the existing `fog-drift` keyframe (`globals.css`) rather than a
 * near-duplicate one; `.image-glow` is the large-image `glow-pulse`
 * variant, both from this phase's motion changes. Kept separate from
 * `Modal.tsx`, which is deliberately small and form-dialog-shaped; this
 * needs a full-bleed shape instead. */
export function Lightbox({ open, onClose, src, alt, caption }: LightboxProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="lightbox-fog animate-fade-in fixed inset-0 z-50 flex flex-col bg-bg-overlay"
      onClick={onClose}
    >
      <OverlayDragHandle />
      <OverlayCloseIcon onClose={onClose} />
      <div
        className="relative min-h-0 flex-1 p-4 sm:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="animate-glow-pulse-lg relative h-full w-full">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="90vw"
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>
      {caption && (
        <p className="px-6 pb-2 text-center font-heading text-sm text-gold-300">
          {caption}
        </p>
      )}
      <OverlayCloseBar onClose={onClose} />
    </div>
  );
}
