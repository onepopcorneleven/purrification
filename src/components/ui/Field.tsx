import type { InputHTMLAttributes } from "react";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  name: string;
  error?: string;
};

/** Label + input + error text — signup, login, AddCatForm. See
 * docs/design-system.md's component inventory. */
export function Field({ label, name, error, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="font-ui text-sm text-text-secondary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className={`rounded-md border bg-bg-elevated px-3.5 py-2.5 font-ui text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
          error ? "border-error" : "border-border-hairline"
        }`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
