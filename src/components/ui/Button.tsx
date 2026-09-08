import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 " +
  "font-ui font-medium text-sm transition-shadow duration-300 ease-dreamy " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold-500 text-text-on-gold shadow-glow-gold-sm hover:shadow-glow-gold-md",
  secondary: "border border-gold-500 text-gold-300 hover:shadow-glow-gold-sm",
  danger:
    "border border-error text-error-text hover:bg-error-hover hover:text-text-primary",
};

type ButtonProps = {
  variant?: Variant;
  href?: string;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

/** Shared button/link primitive — see docs/design-system.md's component
 * inventory. Renders a `<Link>` when `href` is given, a `<button>` otherwise. */
export function Button({
  variant = "primary",
  href,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${className ?? ""}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
