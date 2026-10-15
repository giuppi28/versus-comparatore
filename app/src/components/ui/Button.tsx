import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "./cn";
import { SpinnerIcon } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "ghost";
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
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-200 disabled:text-brand-900/70",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink disabled:text-ink-subtle disabled:hover:border-line-strong",
  ghost:
    "bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100 disabled:text-ink-subtle disabled:hover:bg-transparent",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-base",
  lg: "min-h-13 px-6 text-base",
};

/** Main CTA (primary + lg): wide uppercase display label, like the VERSUS headings. */
const mainCta =
  "heading-wide px-4 text-[12.5px] font-semibold leading-tight tracking-[0.04em] [font-stretch:110%]";

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
        variant === "primary" && size === "lg" && mainCta,
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
