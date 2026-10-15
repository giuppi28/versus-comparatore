import {
  APPLIANCES,
  CLIMATE_ZONE_SMC_PER_SQM,
  FALLBACK_CLIMATE_ZONE,
  GAS_COOKING_BASE_SMC,
  GAS_COOKING_PER_PERSON_SMC,
  GAS_HOT_WATER_PER_PERSON_SMC,
  LUCE_BASE_KWH,
  MAX_PEOPLE,
  MIN_PEOPLE,
  SQM_RANGE_VALUE,
} from "@/config/consumption";
import type { ClimateZone, SqmRange } from "@/lib/data/types";

/**
 * Normalises the household size: floored to an integer and clamped to 1..5
 * ("5+" counts as 5; NaN/invalid falls back to 1).
 */
export function normalizePeople(people: number): number {
  if (!Number.isFinite(people)) return MIN_PEOPLE;
  return Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, Math.floor(people)));
}

export interface LuceEstimateInput {
  people: number;
  /** Selected appliance ids (see APPLIANCES). Unknown ids and duplicates are ignored. */
  appliances: readonly string[];
}

/**
 * Annual electricity estimate in kWh = base(people) + sum(selected appliances),
 * scaldabagno counted per person. All values are integers, so the result is an
 * exact integer (no rounding needed).
 */
export function estimateLuce({ people, appliances }: LuceEstimateInput): number {
  const n = normalizePeople(people);
  const selected = new Set(appliances);
  let total = LUCE_BASE_KWH[n];
  for (const a of APPLIANCES) {
    if (selected.has(a.id)) total += a.kwh + a.kwhPerPerson * n;
  }
  return total;
}

export interface GasEstimateInput {
  people: number;
  /** Selected gas use ids: "cucina" | "riscaldamento" | "acqua_calda". Unknown ids ignored. */
  uses: readonly string[];
  /** Required for riscaldamento; if missing, heating contributes 0 (the UI must ask). */
  sqmRange?: SqmRange | null;
  /** null/undefined (zone unknown) falls back to FALLBACK_CLIMATE_ZONE. */
  climateZone?: ClimateZone | null;
}

/**
 * Annual gas estimate in Smc: cucina 40 + 10/person, acqua calda 70/person,
 * riscaldamento = representative m² of the range × zone coefficient.
 * All coefficients are integers, so the result is an exact integer.
 */
export function estimateGas({ people, uses, sqmRange, climateZone }: GasEstimateInput): number {
  const n = normalizePeople(people);
  const selected = new Set(uses);
  let total = 0;
  if (selected.has("cucina")) total += GAS_COOKING_BASE_SMC + GAS_COOKING_PER_PERSON_SMC * n;
  if (selected.has("acqua_calda")) total += GAS_HOT_WATER_PER_PERSON_SMC * n;
  if (selected.has("riscaldamento") && sqmRange) {
    const zone = climateZone ?? FALLBACK_CLIMATE_ZONE;
    total += SQM_RANGE_VALUE[sqmRange] * CLIMATE_ZONE_SMC_PER_SQM[zone];
  }
  return total;
}
