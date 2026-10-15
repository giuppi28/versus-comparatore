import type { LeadStatus, LeadStepReached } from "@/lib/data/types";
import { cn } from "@/components/ui";
import { STATUS_LABELS, STEP_LABELS } from "./labels";

const base = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold";

/** Completed leads: solid green. Partial/abandoned leads: grey "Parziale – <step>". */
export function StepBadge({ step }: { step: LeadStepReached }) {
  if (step === "completed") {
    return (
      <span data-testid="step-badge" data-step={step} className={cn(base, "bg-brand-600 text-white")}>
        Completato
      </span>
    );
  }
  return (
    <span
      data-testid="step-badge"
      data-step={step}
      className={cn(base, "border border-line-strong bg-surface-muted text-ink-muted")}
    >
      Parziale – {STEP_LABELS[step]}
    </span>
  );
}

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-warning-soft text-warning",
  contacted: "bg-brand-50 text-brand-800",
  in_progress: "bg-brand-100 text-brand-900",
  closed: "bg-surface-muted text-ink-muted border border-line",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span data-testid="status-badge" data-status={status} className={cn(base, STATUS_TONE[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
