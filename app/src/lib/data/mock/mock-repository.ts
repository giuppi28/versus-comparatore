import { normalizeSearch } from "../normalize";
import {
  assertSafeSvg,
  DEFAULT_COMUNI_LIMIT,
  LeadNotFoundError,
  OfferNotFoundError,
  PrivacyConsentRequiredError,
  SupplierNotFoundError,
  SupplierSlugTakenError,
  type Repository,
} from "../repository";
import type {
  Comune,
  Lead,
  LeadData,
  LeadCompletion,
  Offer,
  OfferInput,
  LeadQuery,
  OfferWithSupplier,
  Settings,
  Supplier,
  SupplierInput,
} from "../types";
import { LEAD_PAGE_SIZE_DEFAULT, LEAD_PAGE_SIZE_MAX } from "../types";
import { MOCK_COMUNI, MOCK_OFFERS, MOCK_SUPPLIERS } from "./data";

export interface MockSeed {
  suppliers?: Supplier[];
  offers?: Offer[];
  comuni?: Comune[];
  settings?: Settings;
}

function emptyLead(id: string, token: string, now: string): Lead {
  return {
    id,
    token,
    created_at: now,
    updated_at: now,
    step_reached: "page1",
    status: "new",
    notes: null,
    commodity: null,
    customer_type: null,
    first_name: null,
    last_name: null,
    phone: null,
    tax_code: null,
    company_name: null,
    vat_number: null,
    housing_title: null,
    comune_istat: null,
    cap: null,
    address: null,
    street_number: null,
    is_resident: null,
    service_type: null,
    current_supplier_luce: null,
    current_supplier_gas: null,
    has_gas: null,
    people: null,
    appliances: [],
    gas_uses: [],
    sqm_range: null,
    estimated_kwh_year: null,
    estimated_smc_year: null,
    manual_consumption: null,
    final_kwh_month: null,
    final_smc_month: null,
    chosen_offer_luce: null,
    chosen_offer_gas: null,
    monthly_cost_shown: null,
    pod: null,
    power_kw: null,
    voltage: null,
    pdr: null,
    privacy_consent: false,
    marketing_consent: null,
  };
}

/** Never let callers overwrite server-managed columns through lead data. */
function sanitize(data: LeadData): LeadData {
  const copy: Record<string, unknown> = { ...data };
  for (const k of ["id", "token", "created_at", "updated_at", "status", "notes"]) delete copy[k];
  return copy as LeadData;
}

const LEAD_SEARCH_FIELDS = [
  "first_name",
  "last_name",
  "company_name",
  "phone",
  "tax_code",
  "vat_number",
  "pod",
  "pdr",
] as const satisfies ReadonlyArray<keyof Lead>;

/** Lowercased whitespace-separated terms; each must match at least one field. */
function searchTerms(search: string | undefined): string[] {
  return (search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

/** Drops undefined values so partial patches never blank a field. */
function definedOnly<T extends object>(patch: T): T {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as T;
}

/** Fresh, isolated in-memory repository (use in tests). */
export function createMockRepository(seed: MockSeed = {}): Repository {
  const suppliers = structuredClone(seed.suppliers ?? MOCK_SUPPLIERS);
  const offers = structuredClone(seed.offers ?? MOCK_OFFERS);
  const comuni = structuredClone(seed.comuni ?? MOCK_COMUNI);
  let settings: Settings = seed.settings ?? { notification_email: null };
  const leads: Lead[] = [];

  const supplierById = (id: string) => suppliers.find((s) => s.id === id);

  function assertSlugFree(slug: string, exceptId?: string) {
    if (suppliers.some((s) => s.slug === slug && s.id !== exceptId)) throw new SupplierSlugTakenError();
  }

  const bySupplierOrder = (a: Supplier, b: Supplier) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name, "it");

  const byOfferOrder = (a: OfferWithSupplier, b: OfferWithSupplier) =>
    bySupplierOrder(a.supplier, b.supplier) ||
    a.commodity.localeCompare(b.commodity) ||
    a.name.localeCompare(b.name, "it");

  function withSupplier(o: Offer): OfferWithSupplier | null {
    const s = supplierById(o.supplier_id);
    return s ? { ...o, supplier: { ...s } } : null;
  }

  function leadByToken(token: string): Lead {
    const lead = token ? leads.find((l) => l.token === token) : undefined;
    if (!lead) throw new LeadNotFoundError();
    return lead;
  }

  function apply(lead: Lead, data: LeadData) {
    Object.assign(lead, structuredClone(sanitize(data)), {
      updated_at: new Date().toISOString(),
    });
  }

  const repo: Repository = {
    async listActiveSuppliers() {
      return suppliers
        .filter((s) => s.active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({ ...s }));
    },

    async listActiveOffers(commodity, customerType) {
      return offers
        .filter(
          (o) =>
            o.active &&
            o.commodity === commodity &&
            (o.customer_type === customerType || o.customer_type === "both") &&
            supplierById(o.supplier_id)?.active,
        )
        .map(withSupplier)
        .filter((o): o is OfferWithSupplier => o !== null);
    },

    async searchComuni(query, limit = DEFAULT_COMUNI_LIMIT) {
      const q = normalizeSearch(query);
      if (!q || limit <= 0) return [];
      const scored: Array<{ c: Comune; rank: number }> = [];
      for (const c of comuni) {
        const name = normalizeSearch(c.name);
        if (name === q) scored.push({ c, rank: 0 });
        else if (name.startsWith(q)) scored.push({ c, rank: 1 });
        else if (name.split(" ").some((w) => w.startsWith(q))) scored.push({ c, rank: 2 });
        else if (name.includes(q)) scored.push({ c, rank: 3 });
      }
      return scored
        .sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name, "it"))
        .slice(0, limit)
        .map((s) => ({ ...s.c, caps: [...s.c.caps] }));
    },

    async getComune(istat) {
      const c = comuni.find((x) => x.istat_code === istat);
      return c ? { ...c, caps: [...c.caps] } : null;
    },

    async createLead(data) {
      if (data.privacy_consent !== true) throw new PrivacyConsentRequiredError();
      const now = new Date().toISOString();
      const lead = emptyLead(crypto.randomUUID(), crypto.randomUUID(), now);
      leads.push(lead);
      apply(lead, data);
      lead.created_at = now;
      return { id: lead.id, token: lead.token };
    },

    async updateLead(token, patch) {
      apply(leadByToken(token), patch);
    },

    async completeLead(token, data): Promise<LeadCompletion> {
      const lead = leadByToken(token);
      apply(lead, data);
      lead.step_reached = "completed";
      lead.status = "new";
      // Mirrors complete_lead: the settings recipient is returned with the ref.
      return { id: lead.id, token: lead.token, notification_email: settings.notification_email };
    },

    async listLeads() {
      return [...leads]
        .reverse()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((l) => structuredClone(l));
    },

    async queryLeads(query: LeadQuery = {}) {
      const pageSize = Math.min(
        Math.max(Math.floor(query.pageSize ?? LEAD_PAGE_SIZE_DEFAULT), 1),
        LEAD_PAGE_SIZE_MAX,
      );
      const terms = searchTerms(query.search);
      const matching = [...leads]
        .reverse()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .filter(
          (l) =>
            (!query.step_reached || l.step_reached === query.step_reached) &&
            (!query.status || l.status === query.status) &&
            terms.every((t) =>
              LEAD_SEARCH_FIELDS.some((f) => (l[f] ?? "").toString().toLowerCase().includes(t)),
            ),
        );
      const page = Math.max(Math.floor(query.page ?? 1), 1);
      return {
        items: matching.slice((page - 1) * pageSize, page * pageSize).map((l) => structuredClone(l)),
        total: matching.length,
        page,
        pageSize,
      };
    },

    async getLead(id) {
      const l = leads.find((x) => x.id === id);
      return l ? structuredClone(l) : null;
    },

    async updateLeadAdmin(id, patch) {
      const lead = leads.find((x) => x.id === id);
      if (!lead) throw new LeadNotFoundError();
      if (patch.status !== undefined) lead.status = patch.status;
      if (patch.notes !== undefined) lead.notes = patch.notes;
      lead.updated_at = new Date().toISOString();
      return structuredClone(lead);
    },

    async listAllSuppliers() {
      return [...suppliers].sort(bySupplierOrder).map((s) => ({ ...s }));
    },

    async getSupplier(id) {
      const s = supplierById(id);
      return s ? { ...s } : null;
    },

    async createSupplier(input) {
      assertSlugFree(input.slug);
      const created: Supplier = {
        sells_luce: false,
        sells_gas: false,
        show_in_dropdown: true,
        sort_order: 0,
        active: true,
        logo_path: null,
        is_placeholder: false,
        ...input,
        id: crypto.randomUUID(),
      };
      suppliers.push(created);
      return { ...created };
    },

    async updateSupplier(id, patch) {
      const existing = supplierById(id);
      if (!existing) throw new SupplierNotFoundError();
      if (patch.slug !== undefined) assertSlugFree(patch.slug, id);
      Object.assign(existing, definedOnly(patch));
      return { ...existing };
    },

    async saveSupplier(input: SupplierInput) {
      const existing = input.id ? supplierById(input.id) : undefined;
      if (existing) {
        assertSlugFree(input.slug, existing.id);
        Object.assign(existing, input);
        return { ...existing };
      }
      assertSlugFree(input.slug);
      const created: Supplier = { is_placeholder: false, ...input, id: input.id ?? crypto.randomUUID() };
      suppliers.push(created);
      return { ...created };
    },

    async uploadSupplierLogo(supplierId, svg) {
      if (!supplierById(supplierId)) throw new SupplierNotFoundError();
      assertSafeSvg(svg);
      return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
    },

    async listAllOffers() {
      return offers
        .map(withSupplier)
        .filter((o): o is OfferWithSupplier => o !== null)
        .sort(byOfferOrder);
    },

    async getOffer(id) {
      const o = offers.find((x) => x.id === id);
      return o ? withSupplier(structuredClone(o)) : null;
    },

    async createOffer(input) {
      if (!supplierById(input.supplier_id)) throw new SupplierNotFoundError();
      const created: Offer = {
        ...structuredClone(input),
        id: crypto.randomUUID(),
        updated_at: new Date().toISOString(),
      };
      offers.push(created);
      return withSupplier(created)!;
    },

    async updateOffer(id, patch) {
      const existing = offers.find((o) => o.id === id);
      if (!existing) throw new OfferNotFoundError();
      if (patch.supplier_id !== undefined && !supplierById(patch.supplier_id)) {
        throw new SupplierNotFoundError();
      }
      Object.assign(existing, structuredClone(definedOnly(patch)), {
        updated_at: new Date().toISOString(),
      });
      return withSupplier(existing)!;
    },

    async setOfferFlags(id, flags) {
      return repo.updateOffer(id, definedOnly(flags));
    },

    async saveOffer(input: OfferInput) {
      const now = new Date().toISOString();
      const existing = input.id ? offers.find((o) => o.id === input.id) : undefined;
      if (existing) {
        Object.assign(existing, input, { updated_at: now });
        return structuredClone(existing);
      }
      const created: Offer = { ...input, id: input.id ?? crypto.randomUUID(), updated_at: now };
      offers.push(created);
      return structuredClone(created);
    },

    async listUnverifiedActiveOffers() {
      return (await repo.listAllOffers()).filter((o) => o.active && !o.price_verified);
    },

    async getSettings() {
      return { ...settings };
    },

    async updateSettings(patch) {
      settings = { ...settings, ...patch };
      return { ...settings };
    },
  };
  return repo;
}
