"use client";

import type { ReactNode } from "react";
import { Card, cn, SelectCard, type SelectCardProps } from "@/components/ui";

/** DOM id of the scroll/focus anchor of a field (see `scrollToField` in Page1Form). */
export const anchorId = (key: string) => `field-${key}`;
export const legendId = (key: string) => `legend-${key}`;
export const errorId = (key: string) => `error-${key}`;

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" data-testid={id} className="mt-2 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

/** One visual block of the page (Card + heading). */
export function Block({
  id,
  title,
  description,
  children,
  testId,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} data-testid={testId}>
      <Card padding="lg" className="flex flex-col gap-6">
        <header>
          <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </header>
        {children}
      </Card>
    </section>
  );
}

/** Group of choices: fieldset + legend + inline error, anchored for scroll-to-error. */
export function FieldGroup({
  fieldKey,
  legend,
  hint,
  error,
  children,
  className,
}: {
  fieldKey: string;
  legend: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      id={anchorId(fieldKey)}
      className={cn("m-0 min-w-0 scroll-mt-6 border-0 p-0", className)}
      aria-describedby={error ? errorId(fieldKey) : undefined}
    >
      <legend id={legendId(fieldKey)} className="mb-3 p-0 text-base font-semibold text-ink">
        {legend}
      </legend>
      {hint && <p className="-mt-2 mb-3 text-sm text-ink-muted">{hint}</p>}
      {children}
      {error && <FieldError id={errorId(fieldKey)}>{error}</FieldError>}
    </fieldset>
  );
}

/** Anchor wrapper for single controls (Input/Select/Autocomplete) so scroll-to-error finds them. */
export function Anchor({ fieldKey, children, className }: { fieldKey: string; children: ReactNode; className?: string }) {
  return (
    <div id={anchorId(fieldKey)} className={cn("scroll-mt-6", className)}>
      {children}
    </div>
  );
}

/**
 * SelectCard wrapped in a div carrying the stable QA data-testid (the UI kit card does not
 * forward DOM attributes). `data-selected` mirrors the state for assertions.
 */
export function Choice({
  testId,
  selected,
  ...card
}: SelectCardProps & { testId: string; selected: boolean }) {
  return (
    <div data-testid={testId} data-selected={selected} className="flex [&>button]:h-auto [&>button]:flex-1">
      <SelectCard {...card} />
    </div>
  );
}

/** Native checkbox with a large hit area and a label (consent, "Conosco il mio consumo"). */
export function CheckboxField({
  id,
  testId,
  checked,
  onChange,
  describedBy,
  invalid,
  children,
}: {
  id: string;
  testId: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  describedBy?: string;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        data-testid={testId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        className={cn(
          "mt-0.5 size-6 shrink-0 cursor-pointer rounded-md border-2 accent-brand-600",
          invalid ? "border-danger" : "border-line-strong",
        )}
      />
      <label htmlFor={id} className="cursor-pointer text-base leading-snug text-ink">
        {children}
      </label>
    </div>
  );
}
