"use client";

import { useEffect } from "react";
import {
  OverlayCloseBar,
  OverlayCloseIcon,
  OverlayDragHandle,
} from "./OverlayChrome";

type TextLightboxProps = {
  open: boolean;
  onClose: () => void;
  heading: string;
  text: string;
};

/** Full-screen, distraction-free reading mode (Phase 23) — a sibling to
 * `Lightbox` sharing its chrome (`OverlayDragHandle`/`OverlayCloseIcon`/
 * `OverlayCloseBar`) but rendering a Cinzel heading + larger-than-body-size
 * EB Garamond copy instead of an image. Opened from `DiagnosisReveal`/
 * `TreatmentReveal`'s "Read in full screen" affordance. Reuses the same
 * `.lightbox-fog` ambient background as `Lightbox`. */
export function TextLightbox({
  open,
  onClose,
  heading,
  text,
}: TextLightboxProps) {
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
        className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center overflow-y-auto px-6 py-16"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-6 text-center font-heading text-2xl text-gold-300">
          {heading}
        </h2>
        <p className="font-body text-xl leading-relaxed text-text-primary">
          {text}
        </p>
      </div>
      <OverlayCloseBar onClose={onClose} />
    </div>
  );
}
