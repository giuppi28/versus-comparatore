import { CheckIcon, cn } from "@/components/ui";
import type { Commodity } from "@/lib/data/types";

export interface DualStepIndicatorProps {
  active: Commodity;
  luceDone: boolean;
  gasDone: boolean;
}

/** Luce + Gas progress: "1 Luce ✓ → 2 Gas" (PRD §8). */
export function DualStepIndicator({ active, luceDone, gasDone }: DualStepIndicatorProps) {
  return (
    <ol
      data-testid="dual-step-indicator"
      data-active={active}
      aria-label="Avanzamento: prima Luce, poi Gas"
      className="flex items-center gap-2 text-sm font-semibold"
    >
      <Step n={1} label="Luce" active={active === "luce"} done={luceDone} />
      <li aria-hidden="true" className="text-ink-subtle">
        →
      </li>
      <Step n={2} label="Gas" active={active === "gas"} done={gasDone} />
    </ol>
  );
}

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <li
      aria-current={active ? "step" : undefined}
      data-done={done ? "true" : "false"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
        active ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface text-ink-muted",
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full text-xs",
          active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-800",
        )}
      >
        {n}
      </span>
      {label}
      {done && (
        <>
          <CheckIcon width={16} height={16} aria-hidden="true" />
          <span className="sr-only">(scelta fatta)</span>
        </>
      )}
    </li>
  );
}
