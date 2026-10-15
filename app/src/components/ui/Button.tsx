import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "./cn";
import { SpinnerIcon } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks. */
  loading?: boolean;
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-disabled disabled:text-ink-subtle disabled:hover:bg-disabled",
  secondary:
    "border border-control bg-surface text-ink hover:border-ink disabled:text-ink-subtle disabled:hover:border-control",
  ghost:
    "bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100 disabled:text-ink-subtle disabled:hover:bg-transparent",
  // Destructive actions: white on #b42318 is 6.5:1 (WCAG AA).
  danger:
    "bg-danger text-white hover:bg-[#912018] active:bg-[#7a271a] disabled:bg-disabled disabled:text-ink-subtle disabled:hover:bg-disabled",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-base",
  lg: "min-h-13 px-4 text-base",
};

/**
 * Large buttons (primary AND secondary, so rows like "Indietro" / "Prosegui" match): wide
 * uppercase display label, 14px minimum. Stretch/tracking are tuned so
 * "ATTIVA ONLINE IN 1 MINUTO" stays on one line in the results-card CTA (~220px inner width)
 * and in a full-width button at 390px. md stays normal case.
 */
const largeLabel =
  "heading-wide text-sm font-bold leading-tight tracking-[0.01em] [font-stretch:108%]";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  type = "button",
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control text-center font-semibold transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        size === "lg" && largeLabel,
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <SpinnerIcon />}
      {children}
    </button>
  );
}
