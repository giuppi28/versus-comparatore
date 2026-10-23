import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isStorageLogoPath } from "../logo";
import { normalizeSearch } from "../normalize";
import {
  assertLeadDocument,
  isUuid,
  assertSafeSvg,
  DEFAULT_COMUNI_LIMIT,
  InvalidLeadDocumentError,
  LeadApiSecretError,
  LeadDocumentLimitError,
  LeadDocumentNotFoundError,
  leadDocumentFileName,
  leadDocumentUrlSeconds,
  LeadNotFoundError,
  OfferNotFoundError,
  PlaceholderSupplierError,
  PrivacyConsentRequiredError,
  SupplierHasOffersError,
  SupplierNotFoundError,
  SupplierSlugTakenError,
  SUPPLIER_LOGO_BUCKET,
  type Repository,
} from "../repository";
import type {
  Comune,
  Lead,
  LeadCompletion,
  LeadDocument,
  LeadDocumentMime,
  LeadOfferSnapshot,
  LeadQuery,
  LeadRef,
  Offer,
  OfferWithSupplier,
  Settings,
  Supplier,
} from "../types";
import {
  DEFAULT_CALLBACK_PHONE,
  LEAD_DOCUMENT_BUCKET,
  LEAD_PAGE_SIZE_DEFAULT,
  LEAD_PAGE_SIZE_MAX,
} from "../types";

/**
 * DB CONTRACT this implementation codes against (db-builder must match):
 * - tables: suppliers, offers, comuni, leads, settings (PRD §12)
 * - comuni.name_search: unaccented lowercase name (apostrophes/hyphens as spaces),
 *   used for accent-insensitive search
 * - settings: single row, columns per PRD §12 (notification_email, ...)
 * - rpc create_lead(p_secret text, p_data jsonb)                  -> { id, token }
 * - rpc update_lead(p_secret text, p_token text, p_patch jsonb)   -> void
 * - rpc complete_lead(p_secret text, p_token text, p_data jsonb)  -> { id, token, notification_email }
 *   (a single object or a one-row array are both accepted). p_secret = server-only
 *   lead API secret (env var, see @/lib/lead/secret; migration 20261015140000); the DB raises `invalid_secret`
 *   (SQLSTATE 28000, HTTP 403) before any other check when it does not match.
 * - errors: message containing "lead_not_found" / "privacy_consent_required" / "invalid_secret"
 * - admin methods run on the injected client, which must carry the admin's
 *   session (see getAdminRepository) so RLS `is_admin()` policies apply
 * - Storage: public bucket "supplier-logos" (public read; insert/update/delete
 *   for admins only), objects keyed "<supplier_id>/<timestamp>.svg"
 * - deletions (migration 20261015170000): BEFORE DELETE triggers copy a deleted offer into
 *   leads.chosen_offer_*_snapshot and a deleted supplier's name into
 *   leads.current_supplier_*_name; deleting a placeholder supplier raises
 *   "placeholder_supplier: ..." (P0001); offers.supplier_id is ON DELETE RESTRICT (23001)
 * - Phase 12 (migration 20261023100000):
 *   - leads: iban, iban_holder_*, document_* columns (writable through the lead RPCs)
 *   - settings.callback_phone; rpc get_callback_phone() -> text (anon); complete_lead also
 *     returns callback_phone
 *   - rpc register_lead_document(p_secret, p_token, p_mime_type, p_size_bytes)
 *       -> { id, lead_id, path, bucket, expires_at }   (errors invalid_document /
 *          document_limit_reached / lead_not_found / invalid_secret)
 *   - private bucket "lead-documents": anon may INSERT only the issued path while its
 *     slot is pending (5 min); admin SELECT (signed URLs) + DELETE
 *   - rpc confirm_lead_document(p_secret, p_token, p_document_id)
 *       -> { id, lead_id, mime_type, size_bytes, created_at }   (error document_not_found)
 *   - table lead_documents (admin SELECT only; cascades with the lead)
 * - Phase 12b (migration 20261023110000), customer removal:
 *   - rpc request_lead_document_removal(p_secret, p_token, p_document_id)
 *       -> { id, path, bucket }   (opens a 1-minute removal window on an uploaded document)
 *   - Storage remove([path]) with the anon key: anon SELECT + DELETE allowed only on the
 *     object of an open window of an in-progress lead
 *   - rpc finish_lead_document_removal(p_secret, p_token, p_document_id)
 *       -> { id, removed }   (removed = false: the object still exists, row kept)
 *   - errors document_not_found / lead_not_found / invalid_secret
 */

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface SupabaseRepositoryOptions {
  /**
   * Provides the server-only lead API secret for the lead RPCs, read lazily at call time.
   * Default: the provider registered by the server-only module `@/lib/lead/secret`
   * (imported by the lead API handlers). Never logged, never sent anywhere but the RPC.
   */
  leadSecret?: () => string | undefined;
}

/*
 * This module is also reachable from client components (via "@/lib/data"), so it must not
 * read the secret env var itself: the server-only `@/lib/lead/secret` registers the reader.
 * Without a registered provider every lead RPC fails closed (LeadApiSecretError "missing").
 */
let registeredLeadSecret: (() => string | undefined) | null = null;

/** Called once by `@/lib/lead/secret` (server only). */
export function registerLeadSecretProvider(provider: () => string | undefined): void {
  registeredLeadSecret = provider;
}

const defaultLeadSecret = () => registeredLeadSecret?.();

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function fail(error: { message: string; code?: string }, ctx?: "supplier" | "offer" | "lead"): never {
  // 23505 unique_violation on suppliers.slug, 23503 foreign_key_violation on offers.supplier_id
  if (error.code === "23505" && ctx === "supplier") throw new SupplierSlugTakenError();
  if (error.code === "23503" && ctx === "offer") throw new SupplierNotFoundError();
  // Lead RPCs: invalid_secret (SQLSTATE 28000) = wrong lead API secret on the server.
  if (ctx === "lead" && (error.code === "28000" || /invalid_secret/i.test(error.message))) throw new LeadApiSecretError("invalid");
  if (/lead_not_found/i.test(error.message)) throw new LeadNotFoundError();
  if (/privacy_consent_required/i.test(error.message)) throw new PrivacyConsentRequiredError();
  if (/document_limit_reached/i.test(error.message)) throw new LeadDocumentLimitError();
  if (/invalid_document/i.test(error.message)) throw new InvalidLeadDocumentError("type");
  if (/document_not_found/i.test(error.message)) throw new LeadDocumentNotFoundError();
  throw new Error(error.message);
}

/** PostgREST / Postgres "relation does not exist" (migration not applied yet). */
function isMissingRelation(error: { code?: string }): boolean {
  return error.code === "PGRST205" || error.code === "42P01";
}

function toSettings(row: Record<string, unknown> | null | undefined): Settings {
  const phone = row?.callback_phone;
  return {
    notification_email: (row?.notification_email as string | null | undefined) ?? null,
    callback_phone: typeof phone === "string" && phone.trim() !== "" ? phone.trim() : DEFAULT_CALLBACK_PHONE,
  };
}

const LEAD_DOCUMENT_COLUMNS = "id, lead_id, mime_type, size_bytes, created_at";

function toLeadDocument(row: unknown): LeadDocument {
  const r = firstRow(row) as Record<string, unknown> | null | undefined;
  if (!r || typeof r.id !== "string" || typeof r.lead_id !== "string") {
    throw new Error("Unexpected response from lead document function");
  }
  return {
    id: r.id,
    lead_id: r.lead_id,
    mime_type: r.mime_type as LeadDocumentMime,
    size_bytes: Number(r.size_bytes),
    created_at: String(r.created_at),
  };
}

/** Errors of a supplier DELETE (trigger / RESTRICT) mapped to typed errors. */
function failSupplierDelete(error: { message: string; code?: string }): never {
  if (/placeholder_supplier/i.test(error.message)) throw new PlaceholderSupplierError();
  // 23001 restrict_violation (ON DELETE RESTRICT); 23503 if the FK is ever NO ACTION.
  if (error.code === "23001" || error.code === "23503") throw new SupplierHasOffersError();
  throw new Error(error.message);
}

function firstRow(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

function toRef(data: unknown): LeadRef {
  const row = firstRow(data);
  if (
    !row ||
    typeof row !== "object" ||
    typeof (row as LeadRef).id !== "string" ||
    typeof (row as LeadRef).token !== "string"
  ) {
    throw new Error("Unexpected response from lead function");
  }
  return { id: (row as LeadRef).id, token: (row as LeadRef).token };
}

function toCompletion(data: unknown): LeadCompletion {
  const ref = toRef(data);
  const row = firstRow(data) as { notification_email?: unknown; callback_phone?: unknown };
  const email = row.notification_email;
  const phone = row.callback_phone;
  return {
    ...ref,
    notification_email: typeof email === "string" && email.trim() !== "" ? email.trim() : null,
    callback_phone: typeof phone === "string" && phone.trim() !== "" ? phone.trim() : DEFAULT_CALLBACK_PHONE,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Lead row -> Lead. The history columns (migration 20261015170000) and the Phase 12
 * columns (migration 20261023100000) default to null, so the app also works against a DB
 * where those migrations are not applied yet.
 */
function toLead(row: unknown): Lead {
  const r = row as Record<string, unknown>;
  const snapshot = (v: unknown) => (isObject(v) ? (v as unknown as LeadOfferSnapshot) : null);
  const text = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
  return {
    ...(r as unknown as Lead),
    iban: text(r.iban),
    iban_holder_different: bool(r.iban_holder_different),
    iban_holder_first_name: text(r.iban_holder_first_name),
    iban_holder_last_name: text(r.iban_holder_last_name),
    iban_holder_tax_code: text(r.iban_holder_tax_code),
    document_type: text(r.document_type) as Lead["document_type"],
    document_number: text(r.document_number),
    document_expiry: text(r.document_expiry),
    document_issuer: text(r.document_issuer),
    chosen_offer_luce_snapshot: snapshot(r.chosen_offer_luce_snapshot),
    chosen_offer_gas_snapshot: snapshot(r.chosen_offer_gas_snapshot),
    current_supplier_luce_name: text(r.current_supplier_luce_name),
    current_supplier_gas_name: text(r.current_supplier_gas_name),
  };
}

/** Escape LIKE wildcards in user input. */
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function toSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    logo_path: (row.logo_path as string | null) ?? null,
    sells_luce: row.sells_luce as boolean,
    sells_gas: row.sells_gas as boolean,
    show_in_dropdown: row.show_in_dropdown as boolean,
    sort_order: row.sort_order as number,
    active: row.active as boolean,
    is_placeholder: (row.is_placeholder as boolean | undefined) ?? false,
  };
}

/** Drops DB-only columns (created_at) and normalises the joined supplier. */
function toOffer(row: Record<string, unknown>): Offer {
  const { created_at: _c, supplier: _s, ...rest } = row;
  void _c;
  void _s;
  return rest as unknown as Offer;
}

function toOfferWithSupplier(row: Record<string, unknown>): OfferWithSupplier {
  return { ...toOffer(row), supplier: toSupplier(row.supplier as Record<string, unknown>) };
}

function definedOnly<T extends object>(patch: T): T {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as T;
}

const LEAD_SEARCH_COLUMNS = [
  "first_name",
  "last_name",
  "company_name",
  "phone",
  "tax_code",
  "vat_number",
  "pod",
  "pdr",
];

const OFFER_SELECT = "*, supplier:suppliers(*)";

function stripComune(row: Comune & { name_search?: string }): Comune {
  return {
    istat_code: row.istat_code,
    name: row.name,
    province_code: row.province_code,
    province_name: row.province_name,
    region: row.region,
    caps: row.caps ?? [],
    climate_zone: row.climate_zone ?? null,
  };
}

export function createSupabaseRepository(
  client: SupabaseClient,
  options: SupabaseRepositoryOptions = {},
): Repository {
  const readLeadSecret = options.leadSecret ?? defaultLeadSecret;
  /** Fails closed: without the secret no lead RPC is attempted. */
  function leadSecret(): string {
    const secret = readLeadSecret()?.trim();
    if (!secret) throw new LeadApiSecretError("missing");
    return secret;
  }

  /**
   * Removes the supplier's logo objects: every object in its "<supplier_id>/" folder
   * (current and earlier uploads) plus `logoPath` when it lives in that folder. A storage
   * path outside the supplier's own folder is never removed (it could be shared).
   * Returns false when the removal failed.
   */
  async function removeSupplierLogoObjects(supplierId: string, logoPath: string): Promise<boolean> {
    const bucket = client.storage.from(SUPPLIER_LOGO_BUCKET);
    const folder = `${supplierId}/`;
    const paths = new Set<string>();
    const normalized = logoPath.replace(/^\/+/, "");
    if (normalized.startsWith(folder)) paths.add(normalized);
    const listed = await bucket.list(supplierId, { limit: 1000 });
    if (!listed.error) {
      for (const f of listed.data ?? []) {
        // Folder placeholders have no id; only files are removed.
        if (f.id && f.name) paths.add(`${folder}${f.name}`);
      }
    }
    if (paths.size === 0) return !listed.error;
    const removed = await bucket.remove([...paths]);
    return !removed.error && !listed.error;
  }

  /** Removes document objects (chunks of 1000 = Storage API limit). False on any failure. */
  async function removeDocumentObjects(paths: string[]): Promise<boolean> {
    const bucket = client.storage.from(LEAD_DOCUMENT_BUCKET);
    let ok = true;
    for (let i = 0; i < paths.length; i += 1000) {
      try {
        const res = await bucket.remove(paths.slice(i, i + 1000));
        if (res.error) ok = false;
      } catch {
        ok = false;
      }
    }
    return ok;
  }

  const repo: Repository = {
    async listActiveSuppliers() {
      const { data, error } = await client
        .from("suppliers")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) fail(error);
      return (data ?? []).map(toSupplier);
    },

    async listActiveOffers(commodity, customerType) {
      const { data, error } = await client
        .from("offers")
        .select("*, supplier:suppliers(*)")
        .eq("active", true)
        .eq("commodity", commodity)
        .in("customer_type", [customerType, "both"]);
      if (error) fail(error);
      return ((data ?? []) as unknown as OfferWithSupplier[]).filter((o) => o.supplier?.active);
    },

    async searchComuni(query, limit = DEFAULT_COMUNI_LIMIT) {
      const q = normalizeSearch(query);
      if (!q || limit <= 0) return [];
      const like = escapeLike(q);
      // Fetch a wider window, then rank prefix matches first (same order as the mock).
      const { data, error } = await client
        .from("comuni")
        .select("*")
        .ilike("name_search", `%${like}%`)
        .order("name")
        .limit(Math.max(limit * 5, 50));
      if (error) fail(error);
      const rows = (data ?? []) as Array<Comune & { name_search?: string }>;
      const rank = (r: Comune & { name_search?: string }) => {
        const n = r.name_search ?? normalizeSearch(r.name);
        if (n === q) return 0;
        if (n.startsWith(q)) return 1;
        if (n.split(" ").some((w) => w.startsWith(q))) return 2;
        return 3;
      };
      return rows
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "it"))
        .slice(0, limit)
        .map(stripComune);
    },

    async getComune(istat) {
      const { data, error } = await client
        .from("comuni")
        .select("*")
        .eq("istat_code", istat)
        .maybeSingle();
      if (error) fail(error);
      return data ? stripComune(data as Comune) : null;
    },

    async createLead(data) {
      if (data.privacy_consent !== true) throw new PrivacyConsentRequiredError();
      const { data: res, error } = await client.rpc("create_lead", {
        p_secret: leadSecret(),
        p_data: data,
      });
      if (error) fail(error, "lead");
      return toRef(res);
    },

    async updateLead(token, patch) {
      const { error } = await client.rpc("update_lead", {
        p_secret: leadSecret(),
        p_token: token,
        p_patch: patch,
      });
      if (error) fail(error, "lead");
    },

    async completeLead(token, data) {
      const { data: res, error } = await client.rpc("complete_lead", {
        p_secret: leadSecret(),
        p_token: token,
        p_data: data,
      });
      if (error) fail(error, "lead");
      return toCompletion(res);
    },

    async getCallbackPhone() {
      try {
        const { data, error } = await client.rpc("get_callback_phone");
        if (error) return DEFAULT_CALLBACK_PHONE;
        const value = firstRow(data);
        return typeof value === "string" && value.trim() !== "" ? value.trim() : DEFAULT_CALLBACK_PHONE;
      } catch {
        return DEFAULT_CALLBACK_PHONE;
      }
    },

    async uploadLeadDocument(token, file) {
      assertLeadDocument(file);
      const secret = leadSecret();
      // 1. One-time upload slot (checks secret, in-progress lead, type, size, max 2).
      const reg = await client.rpc("register_lead_document", {
        p_secret: secret,
        p_token: token,
        p_mime_type: file.mime,
        p_size_bytes: file.bytes.length,
      });
      if (reg.error) fail(reg.error, "lead");
      const slot = firstRow(reg.data) as { id?: unknown; path?: unknown } | null;
      if (!slot || typeof slot.id !== "string" || typeof slot.path !== "string") {
        throw new Error("Unexpected response from register_lead_document");
      }
      // 2. Bytes to exactly that path (anon INSERT policy; never overwrites).
      const up = await client.storage
        .from(LEAD_DOCUMENT_BUCKET)
        .upload(slot.path, file.bytes, { contentType: file.mime, upsert: false });
      if (up.error) throw new Error(`Document upload failed: ${up.error.message}`);
      // 3. Close the slot.
      const conf = await client.rpc("confirm_lead_document", {
        p_secret: secret,
        p_token: token,
        p_document_id: slot.id,
      });
      if (conf.error) fail(conf.error, "lead");
      return toLeadDocument(conf.data);
    },

    async removeLeadDocument(token, documentId) {
      // A malformed id would fail the uuid cast (22P02): same as an unknown document.
      if (!isUuid(documentId)) throw new LeadDocumentNotFoundError();
      const secret = leadSecret();
      const args = { p_secret: secret, p_token: token, p_document_id: documentId };
      // 1. Removal window on exactly this document (secret, in-progress lead, own document).
      const req = await client.rpc("request_lead_document_removal", args);
      if (req.error) fail(req.error, "lead");
      const target = firstRow(req.data) as { path?: unknown } | null;
      if (!target || typeof target.path !== "string") {
        throw new Error("Unexpected response from request_lead_document_removal");
      }
      // 2. The object (Storage API: Supabase forbids SQL deletes on storage.objects).
      let storageError: string | null = null;
      try {
        const rm = await client.storage.from(LEAD_DOCUMENT_BUCKET).remove([target.path]);
        if (rm.error) storageError = rm.error.message;
      } catch (err) {
        storageError = err instanceof Error ? err.message : "unknown error";
      }
      // 3. Always finish: deletes the row only if the object is really gone, otherwise keeps
      //    it and closes the window (retry-safe in both cases).
      const fin = await client.rpc("finish_lead_document_removal", args);
      if (fin.error) fail(fin.error, "lead");
      const done = firstRow(fin.data) as { removed?: unknown } | null;
      if (!done || done.removed !== true) {
        throw new Error(`Document removal failed: ${storageError ?? "object still present"}`);
      }
    },

    // ---- Admin: require an authenticated admin session on `client` (RLS) ----
    async listLeads() {
      const { data, error } = await client
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) fail(error);
      return (data ?? []).map(toLead);
    },

    async queryLeads(query: LeadQuery = {}) {
      const pageSize = Math.min(
        Math.max(Math.floor(query.pageSize ?? LEAD_PAGE_SIZE_DEFAULT), 1),
        LEAD_PAGE_SIZE_MAX,
      );
      const page = Math.max(Math.floor(query.page ?? 1), 1);
      // Every term must match at least one column (AND of ORs); wildcard and
      // PostgREST syntax characters are stripped from the user input.
      const terms = (query.search ?? "")
        .replace(/[%_\\,()"*:]/g, " ")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = <Q extends { eq: any; or: any }>(q: Q): Q => {
        let out = q;
        if (query.step_reached) out = out.eq("step_reached", query.step_reached);
        if (query.status) out = out.eq("status", query.status);
        for (const t of terms) {
          out = out.or(LEAD_SEARCH_COLUMNS.map((c) => `${c}.ilike."%${t}%"`).join(","));
        }
        return out;
      };
      const { data, count, error } = await filtered(
        client.from("leads").select("*", { count: "exact" }),
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) {
        // Page past the end: PostgREST answers PGRST103 (416). Return an empty page with the real total.
        if ((error as { code?: string }).code === "PGRST103") {
          const head = await filtered(client.from("leads").select("id", { count: "exact", head: true }));
          if (head.error) fail(head.error);
          return { items: [], total: head.count ?? 0, page, pageSize };
        }
        fail(error);
      }
      return { items: (data ?? []).map(toLead), total: count ?? 0, page, pageSize };
    },

    async getLead(id) {
      const { data, error } = await client.from("leads").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? toLead(data) : null;
    },

    async updateLeadAdmin(id, patch) {
      if (Object.keys(definedOnly(patch)).length === 0) {
        const current = await repo.getLead(id);
        if (!current) throw new LeadNotFoundError();
        return current;
      }
      const { data, error } = await client
        .from("leads")
        .update(definedOnly(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) fail(error);
      if (!data) throw new LeadNotFoundError();
      return toLead(data);
    },

    async deleteLeads(ids) {
      return (await repo.deleteLeadsAndDocuments(ids)).deleted;
    },

    async deleteLeadsAndDocuments(ids) {
      const unique = [...new Set(ids)];
      if (unique.length === 0) return { deleted: 0, documentCleanupFailed: false };
      // 1. Every object path ever issued for these leads (pending slots too: an upload may
      //    have succeeded without confirmation). Read BEFORE the rows cascade away; a read
      //    failure aborts so no file is ever orphaned silently.
      let docs: Array<{ lead_id: string; object_path: string }> = [];
      const docRes = await client.from("lead_documents").select("lead_id, object_path").in("lead_id", unique);
      if (docRes.error) {
        if (!isMissingRelation(docRes.error)) fail(docRes.error);
      } else {
        docs = (docRes.data ?? []) as typeof docs;
      }
      // 2. The rows (lead_documents cascade).
      const { data, error } = await client.from("leads").delete().in("id", unique).select("id");
      if (error) fail(error);
      const deletedIds = new Set(((data ?? []) as Array<{ id: string }>).map((r) => r.id));
      // 3. The files of the deleted leads (Supabase forbids SQL deletes on storage.objects).
      const paths = docs.filter((d) => deletedIds.has(d.lead_id)).map((d) => d.object_path);
      const documentCleanupFailed = paths.length > 0 && !(await removeDocumentObjects(paths));
      return { deleted: deletedIds.size, documentCleanupFailed };
    },

    async listLeadDocuments(leadId) {
      const { data, error } = await client
        .from("lead_documents")
        .select(LEAD_DOCUMENT_COLUMNS)
        .eq("lead_id", leadId)
        .eq("status", "uploaded")
        .order("created_at");
      if (error) {
        if (isMissingRelation(error)) return [];
        fail(error);
      }
      return ((data ?? []) as unknown[]).map(toLeadDocument);
    },

    async createLeadDocumentUrl(documentId, options) {
      const { data, error } = await client
        .from("lead_documents")
        .select("id, object_path, mime_type")
        .eq("id", documentId)
        .eq("status", "uploaded")
        .maybeSingle();
      if (error) {
        // Malformed uuid (22P02) or missing table: same as not found.
        if (isMissingRelation(error) || error.code === "22P02") throw new LeadDocumentNotFoundError();
        fail(error);
      }
      if (!data) throw new LeadDocumentNotFoundError();
      const row = data as { id: string; object_path: string; mime_type: LeadDocumentMime };
      const signed = await client.storage
        .from(LEAD_DOCUMENT_BUCKET)
        .createSignedUrl(
          row.object_path,
          leadDocumentUrlSeconds(options),
          options?.download ? { download: leadDocumentFileName(row) } : undefined,
        );
      if (signed.error || !signed.data?.signedUrl) {
        throw new Error(`Signed URL failed: ${signed.error?.message ?? "no URL"}`);
      }
      return signed.data.signedUrl;
    },

    async listAllSuppliers() {
      const { data, error } = await client
        .from("suppliers")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) fail(error);
      return (data ?? []).map(toSupplier);
    },

    async getSupplier(id) {
      const { data, error } = await client.from("suppliers").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? toSupplier(data) : null;
    },

    async createSupplier(input) {
      const { data, error } = await client
        .from("suppliers")
        .insert(definedOnly(input))
        .select("*")
        .single();
      if (error) fail(error, "supplier");
      return toSupplier(data);
    },

    async updateSupplier(id, patch) {
      if (Object.keys(definedOnly(patch)).length === 0) {
        const current = await repo.getSupplier(id);
        if (!current) throw new SupplierNotFoundError();
        return current;
      }
      const { data, error } = await client
        .from("suppliers")
        .update(definedOnly(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) fail(error, "supplier");
      if (!data) throw new SupplierNotFoundError();
      return toSupplier(data);
    },

    async saveSupplier(input) {
      const { data, error } = await client
        .from("suppliers")
        .upsert(definedOnly(input))
        .select("*")
        .single();
      if (error) fail(error, "supplier");
      return toSupplier(data);
    },

    async uploadSupplierLogo(supplierId, svg) {
      assertSafeSvg(svg);
      if (!(await repo.getSupplier(supplierId))) throw new SupplierNotFoundError();
      // A fresh key per upload: public CDN URLs are cached, overwriting would show stale logos.
      const path = `${supplierId}/${Date.now()}.svg`;
      const { error } = await client.storage
        .from(SUPPLIER_LOGO_BUCKET)
        .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
          contentType: "image/svg+xml",
          cacheControl: "31536000",
          upsert: false,
        });
      if (error) throw new Error(error.message);
      return path;
    },

    async countOffersBySupplier(supplierId) {
      const { count, error } = await client
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId);
      if (error) fail(error);
      return count ?? 0;
    },

    async deleteSupplier(id) {
      const supplier = await repo.getSupplier(id);
      if (!supplier) throw new SupplierNotFoundError();
      // Checked before any offer is touched (the DB trigger rejects it as well).
      if (supplier.is_placeholder) throw new PlaceholderSupplierError();

      // 1. Its offers (ON DELETE RESTRICT): the offer trigger snapshots them into the leads.
      const offersRes = await client.from("offers").delete().eq("supplier_id", id).select("id");
      if (offersRes.error) fail(offersRes.error);
      const deletedOffers = (offersRes.data ?? []).length;

      // 2. The supplier itself; a failure here is surfaced, never swallowed.
      const supRes = await client.from("suppliers").delete().eq("id", id).select("id");
      if (supRes.error) failSupplierDelete(supRes.error);
      if ((supRes.data ?? []).length === 0) throw new SupplierNotFoundError();

      // 3. Logo objects in Storage ("<supplier_id>/..."). "/logos/..." files are left alone.
      let logoCleanupFailed = false;
      if (isStorageLogoPath(supplier.logo_path)) {
        try {
          logoCleanupFailed = !(await removeSupplierLogoObjects(id, supplier.logo_path!.trim()));
        } catch {
          logoCleanupFailed = true;
        }
      }
      return { deletedOffers, logoCleanupFailed };
    },

    async listAllOffers() {
      const { data, error } = await client.from("offers").select(OFFER_SELECT);
      if (error) fail(error);
      return (data ?? []).map(toOfferWithSupplier).sort(
        (a, b) =>
          a.supplier.sort_order - b.supplier.sort_order ||
          a.supplier.name.localeCompare(b.supplier.name, "it") ||
          a.commodity.localeCompare(b.commodity) ||
          a.name.localeCompare(b.name, "it"),
      );
    },

    async getOffer(id) {
      const { data, error } = await client
        .from("offers")
        .select(OFFER_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) fail(error);
      return data ? toOfferWithSupplier(data) : null;
    },

    async createOffer(input) {
      const { data, error } = await client
        .from("offers")
        .insert(input)
        .select(OFFER_SELECT)
        .single();
      if (error) fail(error, "offer");
      return toOfferWithSupplier(data);
    },

    async updateOffer(id, patch) {
      if (Object.keys(definedOnly(patch)).length === 0) {
        const current = await repo.getOffer(id);
        if (!current) throw new OfferNotFoundError();
        return current;
      }
      const { data, error } = await client
        .from("offers")
        .update(definedOnly(patch))
        .eq("id", id)
        .select(OFFER_SELECT)
        .maybeSingle();
      if (error) fail(error, "offer");
      if (!data) throw new OfferNotFoundError();
      return toOfferWithSupplier(data);
    },

    async setOfferFlags(id, flags) {
      return repo.updateOffer(id, flags);
    },

    async deleteOffer(id) {
      const { data, error } = await client.from("offers").delete().eq("id", id).select("id");
      if (error) fail(error);
      if ((data ?? []).length === 0) throw new OfferNotFoundError();
    },

    async saveOffer(input) {
      const { data, error } = await client.from("offers").upsert(input).select("*").single();
      if (error) fail(error, "offer");
      return toOffer(data);
    },

    async listUnverifiedActiveOffers() {
      const { data, error } = await client
        .from("offers")
        .select(OFFER_SELECT)
        .eq("active", true)
        .eq("price_verified", false);
      if (error) fail(error);
      return (data ?? []).map(toOfferWithSupplier);
    },

    async getSettings() {
      const { data, error } = await client.from("settings").select("*").limit(1).maybeSingle();
      if (error) fail(error);
      return toSettings(data);
    },

    async updateSettings(patch) {
      // Single-row table (id = true).
      const { data, error } = await client
        .from("settings")
        .upsert({ id: true, ...definedOnly(patch) })
        .select("*")
        .single();
      if (error) fail(error);
      return toSettings(data);
    },
  };
  return repo;
}
