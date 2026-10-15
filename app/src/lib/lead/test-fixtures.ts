/** Shared fixtures for the lead API tests (not imported by app code). */
import type { LeadCompleteData, LeadCreateData } from "./schemas";

export const LUCE_OFFER_ID = "offer-edison-luce-fissa-12";
export const GAS_OFFER_ID = "offer-plenitude-gas-fisso-12";
export const MILANO_ISTAT = "015146";
/** Mario Rossi, valid check character. */
export const VALID_CF = "RSSMRA85T10A562S";
export const VALID_PIVA = "12345678903";
export const VALID_POD = "IT001E12345678";
export const VALID_PDR = "12345678901234";

export function page1Data(overrides: Partial<LeadCreateData> = {}): LeadCreateData {
  return {
    commodity: "luce",
    customer_type: "casa",
    first_name: "Mario",
    last_name: "Rossi",
    phone: "333 123 4567",
    comune_istat: MILANO_ISTAT,
    privacy_consent: true,
    ...overrides,
  };
}

/** A complete Luce / Casa / Cambio fornitore submission. */
export function completeData(overrides: Partial<LeadCompleteData> = {}): LeadCompleteData {
  return {
    commodity: "luce",
    customer_type: "casa",
    service_type: "cambio_fornitore",
    first_name: "Mario",
    last_name: "Rossi",
    phone: "3331234567",
    comune_istat: MILANO_ISTAT,
    current_supplier_luce: "enel-energia",
    people: 2,
    appliances: ["frigorifero"],
    estimated_kwh_year: 1600,
    manual_consumption: false,
    final_kwh_month: 133,
    chosen_offer_luce: LUCE_OFFER_ID,
    monthly_cost_shown: 50.12,
    tax_code: VALID_CF,
    housing_title: "proprietario",
    cap: "20121",
    address: "Via Roma",
    street_number: "1",
    is_resident: true,
    pod: VALID_POD,
    power_kw: 3,
    voltage: 220,
    ...overrides,
  };
}
