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
 * suggests a "glowing candle" motif rather than a generic toast bar; here
 * that's a small gold glow-dot rather than a literal candle illustration. */
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
              className={`h-1.5 w-1.5 rounded-full ${
                toast.variant === "error"
                  ? "bg-error"
                  : "bg-gold-500 shadow-glow-gold-md"
              }`}
            />
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
