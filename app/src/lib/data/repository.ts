import type {
  Commodity,
  Comune,
  Lead,
  LeadAdminPatch,
  LeadCustomerType,
  LeadData,
  LeadPage,
  LeadQuery,
  LeadCompletion,
  LeadDeletion,
  LeadDocument,
  LeadDocumentFile,
  LeadDocumentMime,
  LeadDocumentUrlOptions,
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
  SupplierDeletion,
  SupplierInput,
  SupplierPatch,
} from "./types";
import { LEAD_DOCUMENT_MIME_TYPES, LEAD_DOCUMENT_URL_MAX_SECONDS, MAX_LEAD_DOCUMENT_BYTES } from "./types";

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

/**
 * The server-only lead API secret (see @/lib/lead/secret) is missing (supabase mode) or was rejected by the DB
 * (`invalid_secret`). Always a server misconfiguration, never a client fault.
 * The message never contains the secret.
 */
export class LeadApiSecretError extends Error {
  constructor(readonly reason: "missing" | "invalid") {
    super(
      reason === "missing"
        ? "Lead API secret is not configured on the server"
        : "Lead API secret was rejected by the database (invalid_secret)",
    );
    this.name = "LeadApiSecretError";
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

/**
 * Placeholder suppliers (Tutela / Altro fornitore / Non lo so) can never be deleted.
 * Thrown by deleteSupplier before anything is touched; the DB trigger
 * `suppliers_guard_before_delete` raises `placeholder_supplier: ...` as well.
 */
export class PlaceholderSupplierError extends Error {
  readonly code = "placeholder_supplier" as const;
  constructor() {
    super("Placeholder suppliers cannot be deleted");
    this.name = "PlaceholderSupplierError";
  }
}

/**
 * The supplier still has offers, so the DB refused the delete (offers.supplier_id is
 * ON DELETE RESTRICT), e.g. an offer was created between the two steps of deleteSupplier.
 * Its other offers may already be deleted.
 */
export class SupplierHasOffersError extends Error {
  readonly code = "supplier_has_offers" as const;
  constructor() {
    super("The supplier still has offers and was not deleted");
    this.name = "SupplierHasOffersError";
  }
}

/** Rejected SVG (not an SVG, too big, or contains active content). */
export class InvalidLogoError extends Error {
  constructor(reason: string) {
    super(`Invalid logo: ${reason}`);
    this.name = "InvalidLogoError";
  }
}

/** Rejected identity document: type not JPEG/PDF, empty or > 5 MiB, or bytes not matching the type. */
export class InvalidLeadDocumentError extends Error {
  readonly code = "invalid_document" as const;
  constructor(readonly reason: "type" | "size" | "content") {
    super(`Invalid document: ${reason}`);
    this.name = "InvalidLeadDocumentError";
  }
}

/** The lead already has MAX_LEAD_DOCUMENTS documents (or too many upload attempts). */
export class LeadDocumentLimitError extends Error {
  readonly code = "document_limit_reached" as const;
  constructor() {
    super("Maximum number of documents reached for this lead");
    this.name = "LeadDocumentLimitError";
  }
}

/** Admin: no document with this id (or not visible to the session). */
export class LeadDocumentNotFoundError extends Error {
  constructor() {
    super("Document not found");
    this.name = "LeadDocumentNotFoundError";
  }
}

/** Mime type from the magic bytes: JPEG `FF D8 FF`, PDF `%PDF-`; null otherwise. */
export function detectLeadDocumentMime(bytes: Uint8Array): LeadDocumentMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

/**
 * Defence in depth for uploadLeadDocument (the route validates first): allowed type,
 * 1 byte..5 MiB, magic bytes matching the declared type. Throws InvalidLeadDocumentError.
 */
export function assertLeadDocument(file: LeadDocumentFile): void {
  if (!file || !LEAD_DOCUMENT_MIME_TYPES.includes(file.mime)) throw new InvalidLeadDocumentError("type");
  // ArrayBuffer.isView, not instanceof: byte arrays may come from another realm.
  const bytes = file.bytes as Uint8Array | undefined;
  if (!bytes || !ArrayBuffer.isView(bytes) || bytes.BYTES_PER_ELEMENT !== 1 || bytes.length === 0 || bytes.length > MAX_LEAD_DOCUMENT_BYTES) {
    throw new InvalidLeadDocumentError("size");
  }
  if (detectLeadDocumentMime(file.bytes) !== file.mime) throw new InvalidLeadDocumentError("content");
}

/** Signed-URL lifetime: default and upper bound 300 s, at least 1 s. */
export function leadDocumentUrlSeconds(options?: LeadDocumentUrlOptions): number {
  const raw = options?.expiresIn;
  if (raw === undefined || !Number.isFinite(raw)) return LEAD_DOCUMENT_URL_MAX_SECONDS;
  return Math.min(Math.max(Math.floor(raw), 1), LEAD_DOCUMENT_URL_MAX_SECONDS);
}

/** Download file name for a document, e.g. "documento-1a2b3c4d.pdf". */
export function leadDocumentFileName(doc: Pick<LeadDocument, "id" | "mime_type">): string {
  return `documento-${doc.id.slice(0, 8)}.${doc.mime_type === "application/pdf" ? "pdf" : "jpg"}`;
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
  /**
   * Final submit: writes `data`, sets step_reached = completed, status = new.
   * Also returns settings.notification_email (null when not set).
   */
  completeLead(token: string, data: LeadData): Promise<LeadCompletion>;

  // ---- Public (no session, no secret) ----
  /**
   * settings.callback_phone for the thank-you page (the only settings value readable
   * publicly). Never throws: DEFAULT_CALLBACK_PHONE when unavailable.
   */
  getCallbackPhone(): Promise<string>;

  // ---- Lead documents (server route bound to the lead token cookie) ----
  /**
   * Stores an identity document for the IN-PROGRESS lead owning `token`
   * (Supabase: register slot -> upload to the private bucket -> confirm; see README
   * "Lead documents"). Validates type, size and magic bytes again (assertLeadDocument).
   * Throws InvalidLeadDocumentError, LeadDocumentLimitError (max 2 per lead),
   * LeadNotFoundError (unknown/completed lead), LeadApiSecretError, or a generic Error
   * (storage failure).
   */
  uploadLeadDocument(token: string, file: LeadDocumentFile): Promise<LeadDocument>;

  // ---- Admin (authenticated admin session; get it via getAdminRepository()) ----

  // Leads
  /** All leads, newest first (unpaginated; prefer queryLeads). */
  listLeads(): Promise<Lead[]>;
  /** Filtered + paginated list, newest first. */
  queryLeads(query?: LeadQuery): Promise<LeadPage>;
  getLead(id: string): Promise<Lead | null>;
  /** Updates status / internal notes. Throws LeadNotFoundError. */
  updateLeadAdmin(id: string, patch: LeadAdminPatch): Promise<Lead>;
  /**
   * Permanently deletes the leads with these ids; returns how many were deleted
   * (unknown ids are ignored, duplicates counted once). Empty array: 0, no query.
   * Id validation (UUID, max 200 per call) belongs to the server action.
   */
  deleteLeads(ids: string[]): Promise<number>;
  /**
   * Same as deleteLeads (which delegates here), plus the outcome of the document-file
   * cleanup: the leads' files are removed from Storage after the rows are deleted; a
   * storage failure does not undo the deletion and is reported as documentCleanupFailed.
   */
  deleteLeadsAndDocuments(ids: string[]): Promise<LeadDeletion>;
  /** Uploaded identity documents of the lead, oldest first ([] when none). */
  listLeadDocuments(leadId: string): Promise<LeadDocument[]>;
  /**
   * Short-lived URL of a document (Supabase: signed URL, <= 300 s; `download: true` adds
   * Content-Disposition attachment with leadDocumentFileName). Mock: a data: URL.
   * Throws LeadDocumentNotFoundError.
   */
  createLeadDocumentUrl(documentId: string, options?: LeadDocumentUrlOptions): Promise<string>;

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
  /** Number of offers (active or not) of the supplier, for the delete confirmation. */
  countOffersBySupplier(supplierId: string): Promise<number>;
  /**
   * Permanently deletes the supplier AND all its offers (offers first, so the DB trigger
   * stores a snapshot of each in the leads that chose it; then the supplier, whose name is
   * stored in the leads that had it as current supplier).
   * If logo_path is a Supabase Storage object, the supplier's logo objects
   * ("<supplier_id>/...") are removed too; "/logos/..." files are left alone.
   * Throws SupplierNotFoundError, PlaceholderSupplierError (checked before touching any
   * offer), SupplierHasOffersError (offer added concurrently), or a generic Error.
   */
  deleteSupplier(id: string): Promise<SupplierDeletion>;

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
  /**
   * Permanently deletes the offer. Leads that chose it keep a copy in
   * chosen_offer_*_snapshot (DB trigger) and their chosen_offer_* becomes null.
   * Throws OfferNotFoundError.
   */
  deleteOffer(id: string): Promise<void>;
  /** Upsert (create when no id). Kept for bulk/test use; admin UI uses create/update. */
  saveOffer(input: OfferInput): Promise<Offer>;
  /** Go-live checklist: active offers (of active suppliers or not) with price_verified = false. */
  listUnverifiedActiveOffers(): Promise<OfferWithSupplier[]>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
}

export const DEFAULT_COMUNI_LIMIT = 10;
