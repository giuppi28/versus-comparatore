import type { ReactNode } from "react";
import { cn } from "./cn";

export interface FieldChromeProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Ids for aria-describedby wiring, derived from the control id. */
export function fieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error` };
}

/** aria-describedby value: error first, then hint. */
export function describedBy(id: string, hint?: string, error?: string) {
  const ids = fieldIds(id);
  return [error ? ids.error : null, hint ? ids.hint : null].filter(Boolean).join(" ") || undefined;
}

/** Shared label + hint + inline error wrapper used by Input, Select and Autocomplete. */
export function FieldChrome({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldChromeProps) {
  const ids = fieldIds(id);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={ids.hint} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={ids.error} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const controlClasses = (invalid: boolean) =>
  cn(
    "min-h-12 w-full rounded-control border bg-surface px-4 text-base text-ink placeholder:text-ink-subtle transition-colors",
    "focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30",
    "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle",
    invalid ? "border-danger" : "border-line-strong",
  );
