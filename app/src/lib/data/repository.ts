import type {
  Commodity,
  Comune,
  Lead,
  LeadCustomerType,
  LeadData,
  LeadRef,
  LeadStatus,
  Offer,
  OfferInput,
  OfferWithSupplier,
  Settings,
  Supplier,
  SupplierInput,
} from "./types";

export class LeadNotFoundError extends Error {
  constructor() {
    super("Lead not found for the given token");
    this.name = "LeadNotFoundError";
  }
}

export class PrivacyConsentRequiredError extends Error {
  constructor() {
    super("privacy_consent must be true before a lead is stored");
    this.name = "PrivacyConsentRequiredError";
  }
}

/** Data-access contract. Two implementations: mock (in-memory) and Supabase. */
export interface Repository {
  // ---- Public reads (anon, RLS: active rows only) ----
  listActiveSuppliers(): Promise<Supplier[]>;
  /**
   * Active offers of `commodity` visible to `customerType`
   * (customer_type === customerType or "both"), with their supplier.
   */
  listActiveOffers(
    commodity: Commodity,
    customerType: LeadCustomerType,
  ): Promise<OfferWithSupplier[]>;
  /** Case/accent-insensitive search on the comune name. */
  searchComuni(query: string, limit?: number): Promise<Comune[]>;
  getComune(istat: string): Promise<Comune | null>;

  // ---- Lead lifecycle (token-based; never reads leads back to anon) ----
  /** Requires data.privacy_consent === true. Returns the new row id + secret token. */
  createLead(data: LeadData): Promise<LeadRef>;
  /** Updates only the lead owning `token`. */
  updateLead(token: string, patch: LeadData): Promise<void>;
  /** Final submit: writes `data`, sets step_reached = completed, status = new. */
  completeLead(token: string, data: LeadData): Promise<LeadRef>;

  // ---- Admin (needs an authenticated admin session; stubs for later agents) ----
  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  updateLeadAdmin(id: string, patch: { status?: LeadStatus; notes?: string | null }): Promise<Lead>;
  listAllSuppliers(): Promise<Supplier[]>;
  saveSupplier(input: SupplierInput): Promise<Supplier>;
  listAllOffers(): Promise<OfferWithSupplier[]>;
  saveOffer(input: OfferInput): Promise<Offer>;
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
}

export const DEFAULT_COMUNI_LIMIT = 10;
