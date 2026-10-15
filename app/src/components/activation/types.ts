import type { FlowContextValue } from "@/lib/lead/flow-context";
import type { FlowState } from "@/lib/lead/flow-state";
import type { Supplier } from "@/lib/data/types";

/** Props shared by the two steps. */
export interface StepProps {
  state: FlowState;
  update: FlowContextValue["update"];
  /** Error messages to display, by API field name. */
  errorFor: (field: string) => string | undefined;
  /** Marks a field as visited (shows its client-side error). */
  touch: (field: string) => void;
  /** Call on every edit: drops the server error of that field. */
  edited: (field: string) => void;
  onBack: () => void;
}

export interface StepBProps extends StepProps {
  suppliers: readonly Supplier[];
  submitting: boolean;
  /** Turnstile widget slot (rendered just above the buttons). */
  captcha: React.ReactNode;
}
