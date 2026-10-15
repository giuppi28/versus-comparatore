import type { ReactNode } from "react";
import { cn } from "./cn";

export interface FieldGroupProps {
  /** Group name: always the accessible name of the fieldset, even when visually hidden. */
  legend: string;
  /**
   * Visually hides the legend (`sr-only`) while it stays the group's accessible name. Use when a
   * visible block title already asks the question.
   */
  hideLegend?: boolean;
  /** Optional id placed on the <legend> (for aria-labelledby on a SelectCardGroup). */
  legendId?: string;
  hint?: string;
  error?: string;
  /** Id placed on the error paragraph (also wired to the fieldset's aria-describedby). */
  errorId?: string;
  id?: string;
  className?: string;
  children: ReactNode;
}

/** Fieldset + legend + optional hint and inline error for groups of choices. */
export function FieldGroup({
  legend,
  hideLegend = false,
  legendId,
  hint,
  error,
  errorId,
  id,
  className,
  children,
}: FieldGroupProps) {
  return (
    <fieldset
      id={id}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
      aria-describedby={error && errorId ? errorId : undefined}
    >
      <legend
        id={legendId}
        className={hideLegend ? "sr-only" : "mb-3 p-0 text-base font-semibold text-ink"}
      >
        {legend}
      </legend>
      {hint && <p className={cn("mb-3 text-sm text-ink-muted", !hideLegend && "-mt-2")}>{hint}</p>}
      {children}
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
