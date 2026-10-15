/**
 * Domain types, exactly per PRD §12 (data model).
 * Column names are snake_case so they map 1:1 to the Supabase tables.
 */

export type Commodity = "luce" | "gas";
export type OfferCustomerType = "casa" | "business" | "both";
export type LeadCustomerType = "casa" | "business";
/** What the customer wants to compare (Page 1, Block A). "dual" = Luce + Gas. */
export type LeadCommodity = "luce" | "gas" | "dual";
export type ClimateZone = "A" | "B" | "C" | "D" | "E" | "F";

export interface Supplier {
  id: string;
  name: string;
  slug: string;
  /** Storage path of the SVG logo, null = text fallback. */
  logo_path: string | null;
  sells_luce: boolean;
  sells_gas: boolean;
  /** Listed in the "Fornitore attuale" dropdown (Page 1, Block E). */
  show_in_dropdown: boolean;
  sort_order: number;
  active: boolean;
}

export interface Offer {
  id: string;
  supplier_id: string;
  name: string;
  commodity: Commodity;
  customer_type: OfferCustomerType;
  /** v1: fixed price only. */
  price_type: "fixed";
  /** €/kWh (luce) or €/Smc (gas). */
  energy_price: number;
  /** Other variable costs, €/kWh or €/Smc. */
  other_variable_costs: number;
  /** Always stored monthly (the admin UI converts from yearly). */
  fixed_fee_monthly: number;
  other_fixed_costs_monthly: number;
  locked_months: number;
  activation_cost: number;
  promo_text: string | null;
  /** Ordered bullets; `**word**` renders bold. */
  advantages: string[];
  details: string | null;
  featured: boolean;
  active: boolean;
  /** Internal: Aldo verified the prices. Go-live blocked until all active offers are verified. */
  price_verified: boolean;
  updated_at: string;
}

/** Offer joined with its supplier (what the results page needs). */
export type OfferWithSupplier = Offer & { supplier: Supplier };

export interface Comune {
  istat_code: string;
  name: string;
  province_code: string;
  province_name: string;
  region: string;
  caps: string[];
  /** Official zone (DPR 412/93). null = zone unknown (flagged in the dataset). */
  climate_zone: ClimateZone | null;
}

export type LeadStepReached = "page1" | "results" | "offer_chosen" | "completed";
export type LeadStatus = "new" | "contacted" | "in_progress" | "closed";
export type ServiceType = "cambio_fornitore" | "subentro" | "voltura" | "primo_allaccio";
export type HousingTitle = "proprietario" | "inquilino" | "usufruttuario" | "altro";
export type SqmRange = "lt60" | "60_90" | "90_120" | "gt120";
export type Voltage = 220 | 380;

/**
 * `current_supplier_*` hold a suppliers.id (including the special rows
 * "Servizio di Tutela / Tutele Graduali", "Altro fornitore", "Non lo so").
 */
export interface Lead {
  id: string;
  /** Secret per-session token; the only capability needed to update the lead. */
  token: string;
  created_at: string;
  updated_at: string;
  step_reached: LeadStepReached;
  status: LeadStatus;
  notes: string | null;

  commodity: LeadCommodity | null;
  customer_type: LeadCustomerType | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  tax_code: string | null;
  company_name: string | null;
  vat_number: string | null;
  housing_title: HousingTitle | null;

  comune_istat: string | null;
  cap: string | null;
  address: string | null;
  street_number: string | null;
  is_resident: boolean | null;

  service_type: ServiceType | null;
  current_supplier_luce: string | null;
  current_supplier_gas: string | null;
  has_gas: boolean | null;

  people: number | null;
  appliances: string[];
  gas_uses: string[];
  sqm_range: SqmRange | null;
  estimated_kwh_year: number | null;
  estimated_smc_year: number | null;
  manual_consumption: boolean | null;
  final_kwh_month: number | null;
  final_smc_month: number | null;

  chosen_offer_luce: string | null;
  chosen_offer_gas: string | null;
  monthly_cost_shown: number | null;

  pod: string | null;
  power_kw: number | null;
  voltage: Voltage | null;
  pdr: string | null;

  privacy_consent: boolean;
  marketing_consent: boolean | null;
}

/** Fields the customer flow may write (everything except server-managed columns). */
export type LeadData = Partial<
  Omit<Lead, "id" | "token" | "created_at" | "updated_at" | "status" | "notes">
>;

/** Reference returned by create/complete: the row id and the secret token. */
export interface LeadRef {
  id: string;
  token: string;
}

/**
 * Returned by completeLead: the lead ref plus the new-lead notification recipient
 * (settings.notification_email, returned by the complete_lead RPC; may be null).
 */
export interface LeadCompletion extends LeadRef {
  notification_email: string | null;
}

/** Global settings (single row). */
export interface Settings {
  notification_email: string | null;
}

export type SupplierInput = Omit<Supplier, "id"> & { id?: string };
export type OfferInput = Omit<Offer, "id" | "updated_at"> & { id?: string };

// ---------------------------------------------------------------------------
// Admin API types
// ---------------------------------------------------------------------------

export const LEAD_PAGE_SIZE_DEFAULT = 25;
export const LEAD_PAGE_SIZE_MAX = 100;

/** Filters for the admin lead list. All optional; combined with AND. */
export interface LeadQuery {
  step_reached?: LeadStepReached;
  status?: LeadStatus;
  /**
   * Case/accent-insensitive search on first/last name, company name, phone,
   * tax code, VAT number and POD/PDR.
   */
  search?: string;
  /** 1-based page number (default 1). */
  page?: number;
  /** Rows per page (default 25, max 100). */
  pageSize?: number;
}

export interface LeadPage {
  items: Lead[];
  /** Total rows matching the filters (across all pages). */
  total: number;
  page: number;
  pageSize: number;
}

/** Admin-editable lead fields (everything else is customer data, read-only). */
export interface LeadAdminPatch {
  status?: LeadStatus;
  notes?: string | null;
}

/** Fields of a supplier the admin can change (id is the key). */
export type SupplierPatch = Partial<Omit<Supplier, "id">>;
/** New supplier: slug and name required, flags default to the values below. */
export type SupplierCreateInput = Pick<Supplier, "name" | "slug"> &
  Partial<Omit<Supplier, "id" | "name" | "slug">>;

export type OfferCreateInput = Omit<Offer, "id" | "updated_at">;
export type OfferPatch = Partial<OfferCreateInput>;
/** Quick toggles on the offer list. */
export interface OfferFlags {
  active?: boolean;
  featured?: boolean;
  price_verified?: boolean;
}
