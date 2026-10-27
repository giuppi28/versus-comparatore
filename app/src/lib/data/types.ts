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
  /**
   * Special "Fornitore attuale" option (Tutela / Altro fornitore / Non lo so): never has offers,
   * hidden from admin offer-supplier selects and the loading orbit. Use `isRealSupplier`.
   */
  is_placeholder: boolean;
}

/** True for real suppliers (not one of the special dropdown placeholders). */
export function isRealSupplier(s: Pick<Supplier, "is_placeholder">): boolean {
  return !s.is_placeholder;
}

export interface Offer {
  id: string;
  supplier_id: string;
  name: string;
  commodity: Commodity;
  customer_type: OfferCustomerType;
  /** fixed = final price; variable (luce only) = energy_price is the spread over PUN (€/kWh). */
  price_type: "fixed" | "variable";
  /** €/kWh (luce) or €/Smc (gas). */
  energy_price: number;
  /** Other variable costs, €/kWh or €/Smc. */
  other_variable_costs: number;
  /** Always stored monthly (the admin UI converts from yearly). */
  fixed_fee_monthly: number;
  other_fixed_costs_monthly: number;
  /** Null for variable offers. */
  locked_months: number | null;
  activation_cost: number;
  promo_text: string | null;
  /** Ordered bullets; `**word**` renders bold. */
  advantages: string[];
  details: string | null;
  /** Always `featured_audience !== null` (the DB trigger keeps them in sync). */
  featured: boolean;
  /** Payment by IBAN is mandatory for this offer. */
  iban_required: boolean;
  /** Forced-featured audience; null = not featured. */
  featured_audience: "casa" | "business" | "both" | null;
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
/** Identity document type (activation step B, optional). */
export type DocumentType = "carta_identita" | "patente" | "passaporto";
export const DOCUMENT_TYPES: readonly DocumentType[] = ["carta_identita", "patente", "passaporto"];

/**
 * Compact copy of a chosen offer, written into the lead by the DB trigger
 * `offers_snapshot_before_delete` (migration 20261015170000) right before the offer is
 * deleted. Prices are numbers, VAT excluded, same units as `Offer`.
 */
export interface LeadOfferSnapshot {
  offer_id: string;
  supplier_name: string | null;
  offer_name: string;
  commodity: Commodity;
  energy_price: number;
  other_variable_costs: number;
  fixed_fee_monthly: number;
  other_fixed_costs_monthly: number;
  locked_months: number | null;
  /** Present on snapshots taken after migration 20261027100000. */
  price_type?: "fixed" | "variable";
  iban_required?: boolean;
  /** ISO timestamp of the deletion. */
  deleted_at: string;
}

/** Lead columns maintained only by the DB delete triggers (never written by the customer flow). */
export const LEAD_HISTORY_FIELDS = [
  "chosen_offer_luce_snapshot",
  "chosen_offer_gas_snapshot",
  "current_supplier_luce_name",
  "current_supplier_gas_name",
] as const;
export type LeadHistoryField = (typeof LEAD_HISTORY_FIELDS)[number];

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

  // Activation step B, optional (Phase 12, migration 20261023100000). Written through the
  // lead functions; the DB normalizes (IBAN / document number: no spaces, upper case; tax
  // code upper case) and checks formats only. Mod-97, CF check char and name consistency,
  // expiry not in the past are validated by the app.
  /** IBAN for direct debit, e.g. "IT60X0542811101000000123456". */
  iban: string | null;
  /** The bank account holder is not the lead holder (then iban_holder_* are set). */
  iban_holder_different: boolean | null;
  iban_holder_first_name: string | null;
  iban_holder_last_name: string | null;
  /** Codice fiscale of the bank account holder. */
  iban_holder_tax_code: string | null;
  document_type: DocumentType | null;
  document_number: string | null;
  /** ISO date "YYYY-MM-DD". */
  document_expiry: string | null;
  /** Issuing authority (Ente di rilascio). */
  document_issuer: string | null;

  // History kept when the referenced offer / supplier is deleted (DB triggers, Phase 11).
  // Show them when the live chosen_offer_* / current_supplier_* is null.
  /** Copy of the chosen luce offer, written when that offer was deleted. */
  chosen_offer_luce_snapshot: LeadOfferSnapshot | null;
  /** Copy of the chosen gas offer, written when that offer was deleted. */
  chosen_offer_gas_snapshot: LeadOfferSnapshot | null;
  /** Name of the current luce supplier, written when that supplier was deleted. */
  current_supplier_luce_name: string | null;
  /** Name of the current gas supplier, written when that supplier was deleted. */
  current_supplier_gas_name: string | null;
}

/** Fields the customer flow may write (everything except server-managed columns). */
export type LeadData = Partial<
  Omit<Lead, "id" | "token" | "created_at" | "updated_at" | "status" | "notes" | LeadHistoryField>
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
  /** settings.callback_phone (DEFAULT_CALLBACK_PHONE when the DB returns none). */
  callback_phone: string;
}

/** Default "Numero da cui chiamiamo" (settings.callback_phone default in the DB). */
export const DEFAULT_CALLBACK_PHONE = "+39 095 0000000";

/** Global settings (single row). */
export interface Settings {
  notification_email: string | null;
  /**
   * Number the consultant calls from (thank-you page). Always present in the result of
   * getSettings / updateSettings (DEFAULT_CALLBACK_PHONE when unset); optional only so that
   * partial Settings objects stay assignable. DB check: digits, spaces, leading "+", 6–20 chars.
   */
  callback_phone?: string;
}

// ---------------------------------------------------------------------------
// Lead documents (identity document uploads, Phase 12)
// ---------------------------------------------------------------------------

export type LeadDocumentMime = "image/jpeg" | "application/pdf";
export const LEAD_DOCUMENT_MIME_TYPES: readonly LeadDocumentMime[] = ["image/jpeg", "application/pdf"];
/** Max size per file (bucket limit, 5 MiB). */
export const MAX_LEAD_DOCUMENT_BYTES = 5 * 1024 * 1024;
/** Max documents per lead (removed documents free their slot). */
export const MAX_LEAD_DOCUMENTS = 2;
/** Abuse cap: upload slots issued per lead, removed documents included (DB: register_lead_document). */
export const MAX_LEAD_DOCUMENT_SLOTS = 20;
/** Max lifetime of an admin signed URL, in seconds. */
export const LEAD_DOCUMENT_URL_MAX_SECONDS = 300;
/** Private Supabase Storage bucket holding the documents. */
export const LEAD_DOCUMENT_BUCKET = "lead-documents";

/** File handed to Repository.uploadLeadDocument (bytes already read by the server route). */
export interface LeadDocumentFile {
  mime: LeadDocumentMime;
  bytes: Uint8Array;
}

/** An uploaded identity document (metadata only; the bytes stay in private storage). */
export interface LeadDocument {
  id: string;
  lead_id: string;
  mime_type: LeadDocumentMime;
  size_bytes: number;
  created_at: string;
}

export interface LeadDocumentUrlOptions {
  /** Signed URL that downloads the file (Content-Disposition: attachment). Default false (inline preview). */
  download?: boolean;
  /** Lifetime in seconds, clamped to 1..300. Default 300. */
  expiresIn?: number;
}

/** Result of Repository.deleteLeadsAndDocuments. */
export interface LeadDeletion {
  /** Lead rows deleted. */
  deleted: number;
  /**
   * True when the lead rows were deleted but removing their files from Storage failed
   * (orphan files are left in the private bucket under "<lead_id>/"; remove them later).
   */
  documentCleanupFailed: boolean;
}

export type SupplierInput = Omit<Supplier, "id" | "is_placeholder"> & { id?: string; is_placeholder?: boolean };
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
/** Result of Repository.deleteSupplier. */
export interface SupplierDeletion {
  /** Offers of the supplier deleted together with it. */
  deletedOffers: number;
  /**
   * True when the supplier row was deleted but removing its logo from Supabase Storage
   * failed (an orphan file is left in the public bucket; harmless, can be removed later).
   */
  logoCleanupFailed: boolean;
}

/** Quick toggles on the offer list. */
export interface OfferFlags {
  active?: boolean;
  featured?: boolean;
  price_verified?: boolean;
}
