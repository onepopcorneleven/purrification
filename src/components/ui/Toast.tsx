"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

/** App-wide toast host — mounted once in the root layout. Brand doc §9
 * suggests a "glowing candle" motif rather than a generic toast bar; a
 * small flickering flame glyph (see .toast-flame in globals.css) replaced
 * the plain gold dot this originally shipped with (WP3,
 * docs/design-upgrade-round-2.md). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, AUTO_DISMISS_MS);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`animate-fade-in pointer-events-auto flex items-center gap-2 rounded-full border bg-bg-elevated px-4 py-2.5 font-ui text-sm shadow-glow-gold-sm ${
              toast.variant === "error"
                ? "border-error text-error-text"
                : "border-gold-500 text-text-primary"
            }`}
          >
            <span
              aria-hidden
              className={`toast-flame ${toast.variant === "error" ? "toast-flame--error" : ""}`}
            >
              <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
                <path
                  d="M6 0C6 0 1.5 5.5 1.5 9.2C1.5 11.9 3.5 14 6 14C8.5 14 10.5 11.9 10.5 9.2C10.5 5.5 6 0 6 0Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
