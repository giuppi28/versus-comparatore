import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSearch } from "../normalize";
import {
  assertSafeSvg,
  DEFAULT_COMUNI_LIMIT,
  LeadNotFoundError,
  OfferNotFoundError,
  PrivacyConsentRequiredError,
  SupplierNotFoundError,
  SupplierSlugTakenError,
  SUPPLIER_LOGO_BUCKET,
  type Repository,
} from "../repository";
import type {
  Comune,
  Lead,
  LeadQuery,
  LeadRef,
  Offer,
  OfferWithSupplier,
  Supplier,
} from "../types";
import { LEAD_PAGE_SIZE_DEFAULT, LEAD_PAGE_SIZE_MAX } from "../types";

/**
 * DB CONTRACT this implementation codes against (db-builder must match):
 * - tables: suppliers, offers, comuni, leads, settings (PRD §12)
 * - comuni.name_search: unaccented lowercase name (apostrophes/hyphens as spaces),
 *   used for accent-insensitive search
 * - settings: single row, columns per PRD §12 (notification_email, ...)
 * - rpc create_lead(p_data jsonb)            -> { id, token }
 * - rpc update_lead(p_token text, p_patch jsonb) -> void
 * - rpc complete_lead(p_token text, p_data jsonb) -> { id, token }
 *   (a single object or a one-row array are both accepted)
 * - errors: message containing "lead_not_found" / "privacy_consent_required"
 * - admin methods run on the injected client, which must carry the admin's
 *   session (see getAdminRepository) so RLS `is_admin()` policies apply
 * - Storage: public bucket "supplier-logos" (public read; insert/update/delete
 *   for admins only), objects keyed "<supplier_id>/<timestamp>.svg"
 */

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function fail(error: { message: string; code?: string }, ctx?: "supplier" | "offer"): never {
  // 23505 unique_violation on suppliers.slug, 23503 foreign_key_violation on offers.supplier_id
  if (error.code === "23505" && ctx === "supplier") throw new SupplierSlugTakenError();
  if (error.code === "23503" && ctx === "offer") throw new SupplierNotFoundError();
  if (/lead_not_found/i.test(error.message)) throw new LeadNotFoundError();
  if (/privacy_consent_required/i.test(error.message)) throw new PrivacyConsentRequiredError();
  throw new Error(error.message);
}

function toRef(data: unknown): LeadRef {
  const row = Array.isArray(data) ? data[0] : data;
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

export function createSupabaseRepository(client: SupabaseClient): Repository {
  const repo: Repository = {
    async listActiveSuppliers() {
      const { data, error } = await client
        .from("suppliers")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) fail(error);
      return (data ?? []) as Supplier[];
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
      const { data: res, error } = await client.rpc("create_lead", { p_data: data });
      if (error) fail(error);
      return toRef(res);
    },

    async updateLead(token, patch) {
      const { error } = await client.rpc("update_lead", { p_token: token, p_patch: patch });
      if (error) fail(error);
    },

    async completeLead(token, data) {
      const { data: res, error } = await client.rpc("complete_lead", {
        p_token: token,
        p_data: data,
      });
      if (error) fail(error);
      return toRef(res);
    },

    // ---- Admin: require an authenticated admin session on `client` (RLS) ----
    async listLeads() {
      const { data, error } = await client
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) fail(error);
      return (data ?? []) as Lead[];
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
      return { items: (data ?? []) as Lead[], total: count ?? 0, page, pageSize };
    },

    async getLead(id) {
      const { data, error } = await client.from("leads").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return (data as Lead | null) ?? null;
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
      return data as Lead;
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
      return { notification_email: (data?.notification_email as string | null) ?? null };
    },

    async updateSettings(patch) {
      // Single-row table (id = true).
      const { data, error } = await client
        .from("settings")
        .upsert({ id: true, ...definedOnly(patch) })
        .select("*")
        .single();
      if (error) fail(error);
      return { notification_email: (data.notification_email as string | null) ?? null };
    },
  };
  return repo;
}
