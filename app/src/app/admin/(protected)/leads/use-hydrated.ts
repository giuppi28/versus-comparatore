import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** false during SSR and the hydration pass, true afterwards (no setState-in-effect needed). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
