export interface Distributor {
  code: string;
  name: string;
}

/**
 * POD prefix ("IT" + 3 digits) -> distributor.
 * - IT001 e-distribuzione: certain.
 * - IT002, IT011, IT012, IT020: consistent across several secondary sources (Switcho, Segugio,
 *   Selectra); no official ARERA list found. To confirm (see QUESTIONS.md).
 */
export const POD_DISTRIBUTORS: Record<string, string> = {
  IT001: "e-distribuzione",
  IT002: "areti",
  IT011: "inrete",
  IT012: "unareti",
  IT020: "ireti",
};

/**
 * PDR first 4 digits -> distributor. Intentionally EMPTY: no reliable source found
 * (Italgas "0088" comes from a single source and is only listed in QUESTIONS.md).
 */
export const PDR_DISTRIBUTORS: Record<string, string> = {};

/** ISTAT codes used by the comune/distributor consistency warning. */
export const COMUNE_ROMA = "058091";
export const COMUNE_FORMELLO = "058038";
export const COMUNE_MILANO = "015146";
