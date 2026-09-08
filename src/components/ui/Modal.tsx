"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Raised-surface confirmation dialog — brand doc §9: soft glow shadow
 * instead of hard shadow, generous padding. Used for the cat-deletion
 * confirmation, replacing the previous bare `window.confirm`. */
export function Modal({ open, onClose, title, children }: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className="animate-fade-in w-full max-w-sm rounded-lg border border-border-hairline bg-bg-elevated p-6 shadow-glow-purple"
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <h2
            id="modal-title"
            className="mb-3 font-heading text-lg text-text-primary"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
