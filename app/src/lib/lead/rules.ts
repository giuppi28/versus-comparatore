/**
 * Business rules shared by the server-side validation (complete) and the client
 * flow state. Pure functions, safe to import from client and server code.
 * Source: PRD §6 Blocks D/E + Gas, PRD §10 Step B.
 */
import type {
  Commodity,
  LeadCommodity,
  LeadStepReached,
  ServiceType,
} from "@/lib/data/types";

/** Commodities covered by what the customer compares ("dual" = Luce + Gas). */
export function commoditiesOf(commodity: LeadCommodity | null | undefined): Commodity[] {
  if (commodity === "luce") return ["luce"];
  if (commodity === "gas") return ["gas"];
  if (commodity === "dual") return ["luce", "gas"];
  return [];
}

export function includesLuce(commodity: LeadCommodity | null | undefined): boolean {
  return commodity === "luce" || commodity === "dual";
}

export function includesGas(commodity: LeadCommodity | null | undefined): boolean {
  return commodity === "gas" || commodity === "dual";
}

/**
 * Service type that applies to one commodity. PRD §6 Gas: "Hai già il Gas a casa?" = No
 * forces the gas service type to Primo allaccio. Luce always uses the chosen service type.
 */
export function effectiveServiceType(
  commodity: Commodity,
  serviceType: ServiceType | null | undefined,
  hasGas: boolean | null | undefined,
): ServiceType | null {
  if (commodity === "gas" && hasGas === false) return "primo_allaccio";
  return serviceType ?? null;
}

/** PRD §6 Block E: current supplier shown only for Cambio fornitore and Voltura. */
export function needsCurrentSupplier(serviceType: ServiceType | null | undefined): boolean {
  return serviceType === "cambio_fornitore" || serviceType === "voltura";
}

/** PRD §10: POD / PDR not required for Primo allaccio. */
export function needsMeterCode(serviceType: ServiceType | null | undefined): boolean {
  return serviceType !== "primo_allaccio";
}

/** Order of `step_reached`; the customer flow may only move forward. */
export const STEP_ORDER: readonly LeadStepReached[] = [
  "page1",
  "results",
  "offer_chosen",
  "completed",
];

export function stepRank(step: LeadStepReached): number {
  return STEP_ORDER.indexOf(step);
}

/** PRD §10 Step B: Potenza impegnata options (kW). "Altro" is stored as null. */
export const POWER_KW_OPTIONS: readonly number[] = [1.5, 3, 3.5, 4, 4.5, 5, 6, 10, 15];
export const DEFAULT_POWER_KW = 3;
