"use client";

/**
 * Current activation step (A / B), persisted in sessionStorage next to the flow state so a
 * refresh mid-step keeps it. Exposed as an external store (no setState-in-effect, no
 * hydration mismatch: the server snapshot is always "A").
 */
import { useSyncExternalStore } from "react";
import { getSessionStorage } from "@/lib/lead/flow-state";
import type { ActivationStep } from "./logic";

export const ACTIVATION_STEP_KEY = "versus.activation.step.v1";

const listeners = new Set<() => void>();

function read(): ActivationStep {
  try {
    return getSessionStorage()?.getItem(ACTIVATION_STEP_KEY) === "B" ? "B" : "A";
  } catch {
    return "A";
  }
}

// Fallback when sessionStorage is unavailable: keep the step in memory.
let memoryStep: ActivationStep | null = null;

function getSnapshot(): ActivationStep {
  const storage = getSessionStorage();
  return storage ? read() : (memoryStep ?? "A");
}

export function setActivationStep(step: ActivationStep): void {
  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.setItem(ACTIVATION_STEP_KEY, step);
    } catch {
      memoryStep = step;
    }
  } else {
    memoryStep = step;
  }
  listeners.forEach((l) => l());
}

export function clearActivationStep(): void {
  memoryStep = null;
  try {
    getSessionStorage()?.removeItem(ACTIVATION_STEP_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActivationStep(): ActivationStep {
  return useSyncExternalStore(subscribe, getSnapshot, () => "A" as ActivationStep);
}
