"use client";

/**
 * React binding of the customer flow state (flow-state.ts).
 *
 *   <FlowProvider> is mounted once in src/app/(public)/layout.tsx.
 *   const { state, hydrated, update, reset } = useFlow();
 *
 * `hydrated` is false during server rendering and the hydration pass (state = initial);
 * it becomes true once the sessionStorage copy is in use. Screens that redirect when
 * data is missing (e.g. results without Page 1) must wait for `hydrated`.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createFlowStore,
  INITIAL_FLOW_STATE,
  type FlowPatch,
  type FlowState,
  type FlowStore,
} from "./flow-state";

export interface FlowContextValue {
  state: FlowState;
  /** True once the persisted state is loaded (client only). */
  hydrated: boolean;
  /** Shallow merge (activation / chosenOffers merged one level deep); persisted. */
  update: (patch: FlowPatch | ((state: FlowState) => FlowPatch)) => void;
  /** Clears everything (new comparison). Pair with `clearLead()` from client.ts. */
  reset: () => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

const getServerSnapshot = () => INITIAL_FLOW_STATE;
const noopSubscribe = () => () => {};

export function FlowProvider({
  children,
  store: injected,
}: {
  children: ReactNode;
  /** Tests may inject a store (e.g. backed by a fake Storage). */
  store?: FlowStore;
}) {
  const [store] = useState<FlowStore>(() => injected ?? createFlowStore());
  const state = useSyncExternalStore(store.subscribe, store.getState, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const value = useMemo<FlowContextValue>(
    () => ({ state, hydrated, update: store.update, reset: store.reset }),
    [state, hydrated, store],
  );
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside <FlowProvider> (src/app/(public)/layout.tsx)");
  return ctx;
}
