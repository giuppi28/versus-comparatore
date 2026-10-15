/**
 * Consumption-estimate coefficients, PRD §6 Block F. Single source of truth:
 * change a number here and every estimate follows. No other file hardcodes them.
 */
import type { ClimateZone, SqmRange } from "@/lib/data/types";

/** Household sizes: 1..5; "5+" is stored/handled as 5. */
export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 5;

/** Luce base consumption, kWh/year, by number of people. */
export const LUCE_BASE_KWH: Readonly<Record<number, number>> = {
  1: 900,
  2: 1300,
  3: 1600,
  4: 1900,
  5: 2200,
};

export type ApplianceId =
  | "frigorifero"
  | "forno"
  | "lavastoviglie"
  | "lavatrice"
  | "climatizzatore"
  | "scaldabagno";

export interface ApplianceConfig {
  id: ApplianceId;
  label: string;
  /** kWh/year (flat). */
  kwh: number;
  /** kWh/year per person (added on top of `kwh`, which is 0 for these). */
  kwhPerPerson: number;
}

export const APPLIANCES: readonly ApplianceConfig[] = [
  { id: "frigorifero", label: "Frigorifero", kwh: 300, kwhPerPerson: 0 },
  { id: "forno", label: "Forno", kwh: 150, kwhPerPerson: 0 },
  { id: "lavastoviglie", label: "Lavastoviglie", kwh: 250, kwhPerPerson: 0 },
  { id: "lavatrice", label: "Lavatrice", kwh: 200, kwhPerPerson: 0 },
  { id: "climatizzatore", label: "Climatizzatore", kwh: 500, kwhPerPerson: 0 },
  { id: "scaldabagno", label: "Scaldabagno elettrico", kwh: 0, kwhPerPerson: 600 },
];

export type GasUseId = "cucina" | "riscaldamento" | "acqua_calda";

export const GAS_USES: readonly { id: GasUseId; label: string }[] = [
  { id: "cucina", label: "Cucina" },
  { id: "riscaldamento", label: "Riscaldamento" },
  { id: "acqua_calda", label: "Acqua calda" },
];

/** Cucina: 40 Smc/year + 10 Smc/year per person. */
export const GAS_COOKING_BASE_SMC = 40;
export const GAS_COOKING_PER_PERSON_SMC = 10;
/** Acqua calda: 70 Smc/year per person. */
export const GAS_HOT_WATER_PER_PERSON_SMC = 70;

/** Riscaldamento: representative m² for each range (<60 → 50, 60–90 → 75, 90–120 → 105, >120 → 140). */
export const SQM_RANGE_VALUE: Readonly<Record<SqmRange, number>> = {
  lt60: 50,
  "60_90": 75,
  "90_120": 105,
  gt120: 140,
};

export const SQM_RANGES: readonly { id: SqmRange; label: string; sqm: number }[] = [
  { id: "lt60", label: "Meno di 60 m²", sqm: 50 },
  { id: "60_90", label: "60 – 90 m²", sqm: 75 },
  { id: "90_120", label: "90 – 120 m²", sqm: 105 },
  { id: "gt120", label: "Oltre 120 m²", sqm: 140 },
];

/** Smc per m² per year, by climate zone (DPR 412/93). */
export const CLIMATE_ZONE_SMC_PER_SQM: Readonly<Record<ClimateZone, number>> = {
  A: 2,
  B: 4,
  C: 7,
  D: 10,
  E: 13,
  F: 16,
};

/**
 * Last-resort fallback when neither the comune's zone nor its province capital's zone is
 * known (e.g. unknown province code). Resolution order is: comune zone -> zone of the
 * province capital (PROVINCE_CAPITAL_ZONES) -> this value. Zone E is the most common zone
 * in Italy (northern + inland-central plains), so it keeps the heating estimate near the
 * typical value instead of under-estimating.
 */
export const FALLBACK_CLIMATE_ZONE: ClimateZone = "E";
