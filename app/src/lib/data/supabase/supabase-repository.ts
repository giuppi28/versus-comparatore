import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSearch } from "../normalize";
import {
  DEFAULT_COMUNI_LIMIT,
  LeadNotFoundError,
  PrivacyConsentRequiredError,
  type Repository,
} from "../repository";
import type {
  Comune,
  Lead,
  LeadRef,
  Offer,
  OfferWithSupplier,
  Settings,
  Supplier,
} from "../types";

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

function fail(error: { message: string }): never {
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
  return {
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

    async getLead(id) {
      const { data, error } = await client.from("leads").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return (data as Lead | null) ?? null;
    },

    async updateLeadAdmin(id, patch) {
      const { data, error } = await client
        .from("leads")
        .update(patch)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) fail(error);
      if (!data) throw new LeadNotFoundError();
      return data as Lead;
    },

    async listAllSuppliers() {
      const { data, error } = await client.from("suppliers").select("*").order("sort_order");
      if (error) fail(error);
      return (data ?? []) as Supplier[];
    },

    async saveSupplier(input) {
      const { data, error } = await client.from("suppliers").upsert(input).select("*").single();
      if (error) fail(error);
      return data as Supplier;
    },

    async listAllOffers() {
      const { data, error } = await client
        .from("offers")
        .select("*, supplier:suppliers(*)")
        .order("updated_at", { ascending: false });
      if (error) fail(error);
      return (data ?? []) as unknown as OfferWithSupplier[];
    },

    async saveOffer(input) {
      const { data, error } = await client.from("offers").upsert(input).select("*").single();
      if (error) fail(error);
      return data as Offer;
    },

    async getSettings() {
      const { data, error } = await client.from("settings").select("*").limit(1).maybeSingle();
      if (error) fail(error);
      return { notification_email: null, ...(data ?? {}) } as Settings;
    },

    async updateSettings(patch) {
      const current = await this.getSettings();
      const { data, error } = await client
        .from("settings")
        .upsert({ ...current, ...patch })
        .select("*")
        .single();
      if (error) fail(error);
      return data as Settings;
    },
  };
}
