import type { ClimateZone } from "@/lib/data/types";

/** One municipality as returned by GET /api/comuni?q= (shape used by the Page 1 autocomplete). */
export interface ComuneSuggestion {
  /** ISTAT code (6 digits). */
  istat: string;
  name: string;
  /** Province code, e.g. "MI". */
  province: string;
  provinceName: string;
  caps: string[];
  climateZone: ClimateZone | null;
}

export interface ComuniResponse {
  comuni: ComuneSuggestion[];
}

export const COMUNI_MAX_RESULTS = 10;
export const COMUNI_MIN_QUERY_LENGTH = 2;
export const COMUNI_MAX_QUERY_LENGTH = 80;
