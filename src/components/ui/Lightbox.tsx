"use client";

import { useEffect } from "react";
import Image from "next/image";

type LightboxProps = {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
};

/** Full-bleed, dark-overlay single-image viewer (Phase 21) — the shared
 * click-to-expand destination for every image site-wide, opened by
 * `Expandable`. Adapted from the Phase 20 `/allimages` debug gallery's
 * single-slide viewer pattern, but generalized: no hardcoded aspect ratio
 * and single-image only (browsing an entire image pool in one lightbox is
 * out of scope — see docs/workplan/phase-21-image-enrichment.md). Kept
 * separate from `Modal.tsx`, which is deliberately small and
 * form-dialog-shaped; this needs a full-bleed shape instead. */
export function Lightbox({ open, onClose, src, alt }: LightboxProps) {
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
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4 sm:p-10"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="90vw"
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
