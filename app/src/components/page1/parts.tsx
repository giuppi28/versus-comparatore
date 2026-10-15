"use client";

import { useEffect, useState, type ReactNode } from "react";
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
          <h2 id={`${id}-title`} className="heading-section">
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
  hideLegend = false,
  hint,
  error,
  children,
  className,
}: {
  fieldKey: string;
  legend: string;
  /** Visually hides the legend (kept as the accessible name) when the block title asks the same question. */
  hideLegend?: boolean;
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
      <legend
        id={legendId(fieldKey)}
        className={hideLegend ? "sr-only" : "mb-3 p-0 text-base font-semibold text-ink"}
      >
        {legend}
      </legend>
      {hint && <p className={cn("mb-3 text-sm text-ink-muted", !hideLegend && "-mt-2")}>{hint}</p>}
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
          invalid ? "border-danger" : "border-control",
        )}
      />
      <label htmlFor={id} className="cursor-pointer text-base leading-snug text-ink">
        {children}
      </label>
    </div>
  );
}

/** Duration of the Block E reveal (ms); keep in sync with `duration-[220ms]` below. */
const REVEAL_MS = 220;

/**
 * Animated show/hide of a form block (opacity + small translate + height via grid-template-rows
 * 0fr -> 1fr, 220 ms ease-out). The content stays mounted until the exit animation is over and
 * keeps the last rendered children while closing. The negative top margin of the collapsed state
 * cancels the parent's flex gap so nothing jumps when the block is mounted / unmounted.
 * `prefers-reduced-motion` removes the transition (also enforced by globals.css).
 * Never scrolls the page.
 */
export function Reveal({ open, children, testId }: { open: boolean; children: ReactNode; testId?: string }) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const [kept, setKept] = useState<ReactNode>(children);

  // Derived state (set during render): remember the latest content while open, mount on open.
  if (open && kept !== children) setKept(children);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      if (expanded) return;
      // Two frames: the collapsed state must be painted before the transition starts.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setExpanded(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    const timer = setTimeout(() => {
      setMounted(false);
      setExpanded(false);
    }, REVEAL_MS + 30);
    return () => clearTimeout(timer);
  }, [open, expanded]);

  if (!mounted) return null;
  const visible = open && expanded;
  return (
    <div
      data-testid={testId}
      data-state={visible ? "open" : "closed"}
      inert={!visible}
      className={cn(
        "grid transition-[grid-template-rows,opacity,transform,margin] duration-[220ms] ease-out motion-reduce:transition-none",
        visible ? "mt-0 translate-y-0 grid-rows-[1fr] opacity-100" : "-mt-6 -translate-y-2 grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="-mx-1 min-h-0 overflow-hidden px-1">
        <div className="pb-1">{open ? children : kept}</div>
      </div>
    </div>
  );
}
