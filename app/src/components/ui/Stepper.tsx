import { cn } from "./cn";
import { CheckIcon } from "./icons";

export interface StepperProps {
  steps: string[];
  /** Zero-based index of the current step. Steps before it are shown as done. */
  current: number;
  className?: string;
  "aria-label"?: string;
}

/** Horizontal step indicator, e.g. "1 Luce ✓ → 2 Gas". */
export function Stepper({
  steps,
  current,
  className,
  "aria-label": ariaLabel = "Avanzamento",
}: StepperProps) {
  return (
    <ol aria-label={ariaLabel} className={cn("flex items-center gap-2", className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <li
            key={step}
            data-state={done ? "done" : isCurrent ? "current" : "todo"}
            aria-current={isCurrent ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                done && "border-brand-600 bg-brand-600 text-white",
                isCurrent && "border-brand-600 bg-brand-50 text-brand-800",
                !done && !isCurrent && "border-line-strong bg-surface text-ink-subtle",
              )}
            >
              {done ? <CheckIcon width={14} height={14} strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                isCurrent || done ? "text-ink" : "text-ink-subtle",
              )}
            >
              {step}
              {done && <span className="sr-only"> (completato)</span>}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn("mx-1 h-0.5 w-6 sm:w-10", done ? "bg-brand-600" : "bg-line-strong")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
