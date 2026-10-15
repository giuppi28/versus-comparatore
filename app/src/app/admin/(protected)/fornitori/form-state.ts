import type { SupplierField } from "./validation";

export interface SupplierFormState {
  status: "idle" | "success" | "error";
  /** Form-level message (Italian). */
  message?: string;
  /** Extra info after a successful save (e.g. what the sanitizer removed). */
  notice?: string;
  fieldErrors?: Partial<Record<SupplierField, string>>;
  /** Changes on every successful save; used to reset the file input. */
  savedAt?: number;
}

export const INITIAL_SUPPLIER_STATE: SupplierFormState = { status: "idle" };
