import type {
  Commodity,
  Comune,
  Lead,
  LeadAdminPatch,
  LeadCustomerType,
  LeadData,
  LeadPage,
  LeadQuery,
  LeadRef,
  Offer,
  OfferCreateInput,
  OfferFlags,
  OfferInput,
  OfferPatch,
  OfferWithSupplier,
  Settings,
  Supplier,
  SupplierCreateInput,
  SupplierInput,
  SupplierPatch,
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

export class SupplierNotFoundError extends Error {
  constructor() {
    super("Supplier not found");
    this.name = "SupplierNotFoundError";
  }
}

export class OfferNotFoundError extends Error {
  constructor() {
    super("Offer not found");
    this.name = "OfferNotFoundError";
  }
}

export class SupplierSlugTakenError extends Error {
  constructor() {
    super("Another supplier already uses this slug");
    this.name = "SupplierSlugTakenError";
  }
}

/** Rejected SVG (not an SVG, too big, or contains active content). */
export class InvalidLogoError extends Error {
  constructor(reason: string) {
    super(`Invalid logo: ${reason}`);
    this.name = "InvalidLogoError";
  }
}

/** Max accepted logo size in bytes (after sanitizing). */
export const MAX_LOGO_BYTES = 200_000;
/** Public Supabase Storage bucket holding the supplier logos. */
export const SUPPLIER_LOGO_BUCKET = "supplier-logos";

/**
 * Defence in depth for uploadSupplierLogo: the admin UI must sanitize the SVG
 * first (PRD §4.7); this only REJECTS input that still carries active content.
 */
export function assertSafeSvg(svg: string): void {
  if (typeof svg !== "string" || !/<svg[\s>/]/i.test(svg)) throw new InvalidLogoError("not an SVG");
  if (new TextEncoder().encode(svg).length > MAX_LOGO_BYTES) throw new InvalidLogoError("too large");
  if (
    /<script|<foreignObject|<iframe|<object|<embed|<!ENTITY|\son[a-z]+\s*=|javascript:|(?:href|src)\s*=\s*["']?\s*(?:https?:|\/\/)/i.test(
      svg,
    )
  ) {
    throw new InvalidLogoError("contains scripts, event handlers or external references");
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

  // ---- Admin (authenticated admin session; get it via getAdminRepository()) ----

  // Leads
  /** All leads, newest first (unpaginated; prefer queryLeads). */
  listLeads(): Promise<Lead[]>;
  /** Filtered + paginated list, newest first. */
  queryLeads(query?: LeadQuery): Promise<LeadPage>;
  getLead(id: string): Promise<Lead | null>;
  /** Updates status / internal notes. Throws LeadNotFoundError. */
  updateLeadAdmin(id: string, patch: LeadAdminPatch): Promise<Lead>;

  // Suppliers
  /** All suppliers including inactive ones, ordered by sort_order. */
  listAllSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | null>;
  /** Throws SupplierSlugTakenError. Defaults: flags false, show_in_dropdown true, active true. */
  createSupplier(input: SupplierCreateInput): Promise<Supplier>;
  /** Throws SupplierNotFoundError / SupplierSlugTakenError. */
  updateSupplier(id: string, patch: SupplierPatch): Promise<Supplier>;
  /** Upsert (create when no id). Kept for bulk/test use; admin UI uses create/update. */
  saveSupplier(input: SupplierInput): Promise<Supplier>;
  /**
   * Stores an already-sanitized SVG for the supplier and returns the new
   * logo_path (does NOT write it on the supplier row: pass it to updateSupplier).
   * Mock: a data: URL. Supabase: object path in the public "supplier-logos" bucket.
   * Throws InvalidLogoError (defence in depth) / SupplierNotFoundError.
   */
  uploadSupplierLogo(supplierId: string, svg: string): Promise<string>;

  // Offers
  /** All offers (active and inactive) with supplier, ordered by supplier, commodity, name. */
  listAllOffers(): Promise<OfferWithSupplier[]>;
  getOffer(id: string): Promise<OfferWithSupplier | null>;
  /** Throws SupplierNotFoundError when supplier_id does not exist. */
  createOffer(input: OfferCreateInput): Promise<OfferWithSupplier>;
  /** Throws OfferNotFoundError / SupplierNotFoundError. */
  updateOffer(id: string, patch: OfferPatch): Promise<OfferWithSupplier>;
  /** Quick toggles (active / featured / price_verified). Throws OfferNotFoundError. */
  setOfferFlags(id: string, flags: OfferFlags): Promise<OfferWithSupplier>;
  /** Upsert (create when no id). Kept for bulk/test use; admin UI uses create/update. */
  saveOffer(input: OfferInput): Promise<Offer>;
  /** Go-live checklist: active offers (of active suppliers or not) with price_verified = false. */
  listUnverifiedActiveOffers(): Promise<OfferWithSupplier[]>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
}

export const DEFAULT_COMUNI_LIMIT = 10;
