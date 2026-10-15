/**
 * Pure helpers of the results page (PRD §8). No React, no browser APIs:
 * unit-tested in results-logic.test.ts.
 */
import type { Commodity } from "@/lib/data/types";
import { annualKwh, annualSmc, serviceTypeFor, type FlowState } from "@/lib/lead/flow-state";
import { commoditiesOf, needsCurrentSupplier } from "@/lib/lead/rules";

/** Upper bound of the editable monthly consumption (same bound as the lead API). */
export const MAX_MONTHLY_CONSUMPTION = 1_000_000;

/** Default duration of the loading screen (PRD §7: ~4 s). */
export const DEFAULT_LOADING_MS = 4000;
/** Duration used by `?fast=1` (kept above 0 so the screen is still mounted once). */
export const FAST_LOADING_MS = 250;

/** sessionStorage key holding the signature of the last comparison already "loaded". */
export const LOADED_SIGNATURE_KEY = "versus.results.loaded.v1";

/** Commodities to show, in order (Luce+Gas: luce first, then gas). */
export function stepsFor(state: FlowState): Commodity[] {
  return commoditiesOf(state.commodity);
}

/** Annual consumption coming from Page 1 for `commodity` (null when unknown/invalid). */
export function pageOneAnnual(state: FlowState, commodity: Commodity): number | null {
  const value = commodity === "luce" ? annualKwh(state) : annualSmc(state);
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

/** True when the Page 1 data needed by the results are missing → the page redirects to "/". */
export function isPageOneIncomplete(state: FlowState): boolean {
  if (!state.commodity || !state.customerType) return true;
  return stepsFor(state).some((c) => pageOneAnnual(state, c) == null);
}

/**
 * The customer's current supplier for `commodity` (its offers are excluded), or null.
 * Only meaningful for Cambio fornitore / Voltura (PRD §6 Block E); a stale value left in the
 * state for another service type is ignored.
 */
export function currentSupplierFor(state: FlowState, commodity: Commodity): string | null {
  if (!needsCurrentSupplier(serviceTypeFor(state, commodity))) return null;
  const id = commodity === "luce" ? state.currentSupplierLuce : state.currentSupplierGas;
  return id || null;
}

/** All current suppliers of the comparison (never shown on the loading screen). */
export function currentSupplierIds(state: FlowState): string[] {
  return stepsFor(state)
    .map((c) => currentSupplierFor(state, c))
    .filter((id): id is string => !!id);
}

/**
 * Parses the monthly consumption typed by the customer: a whole number >= 1
 * (spaces and thousands dots ignored). Returns null when invalid.
 */
export function parseMonthlyConsumption(raw: string): number | null {
  const cleaned = raw.trim().replace(/[\s.]/g, "");
  if (!/^\d{1,7}$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= 1 && value <= MAX_MONTHLY_CONSUMPTION ? value : null;
}

/**
 * Loading screen duration. Priority: `?fast=1` → FAST_LOADING_MS, then
 * NEXT_PUBLIC_LOADING_MS (a non-negative number of ms; used by tests), else 4000.
 */
export function resolveLoadingMs(opts: { fast?: string | null; envMs?: string | null }): number {
  if (opts.fast === "1") return FAST_LOADING_MS;
  if (opts.envMs != null && opts.envMs.trim() !== "") {
    const n = Number(opts.envMs);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_LOADING_MS;
}

/**
 * Identifies the comparison (Page 1 inputs that change the offers). When it matches the
 * stored one the loading animation is not replayed (e.g. browser back from /attivazione).
 */
export function loadingSignature(state: FlowState): string {
  return JSON.stringify([
    state.commodity,
    state.customerType,
    state.comune?.istat ?? null,
    pageOneAnnual(state, "luce"),
    pageOneAnnual(state, "gas"),
    currentSupplierFor(state, "luce"),
    currentSupplierFor(state, "gas"),
  ]);
}

/** Cents of a monthly cost (for the data-monthly-cost attribute and for comparisons). */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function unitFor(commodity: Commodity): "kWh" | "Smc" {
  return commodity === "luce" ? "kWh" : "Smc";
}

export function commodityLabel(commodity: Commodity): string {
  return commodity === "luce" ? "Luce" : "Gas";
}
