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
  LeadData,
  LeadRef,
  Offer,
  OfferInput,
  OfferWithSupplier,
  Settings,
  Supplier,
  SupplierInput,
} from "../types";
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

/** Fresh, isolated in-memory repository (use in tests). */
export function createMockRepository(seed: MockSeed = {}): Repository {
  const suppliers = structuredClone(seed.suppliers ?? MOCK_SUPPLIERS);
  const offers = structuredClone(seed.offers ?? MOCK_OFFERS);
  const comuni = structuredClone(seed.comuni ?? MOCK_COMUNI);
  let settings: Settings = seed.settings ?? { notification_email: null };
  const leads: Lead[] = [];

  const supplierById = (id: string) => suppliers.find((s) => s.id === id);

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

  return {
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

    async completeLead(token, data): Promise<LeadRef> {
      const lead = leadByToken(token);
      apply(lead, data);
      lead.step_reached = "completed";
      lead.status = "new";
      return { id: lead.id, token: lead.token };
    },

    async listLeads() {
      return leads
        .map((l) => structuredClone(l))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
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
      return suppliers.map((s) => ({ ...s })).sort((a, b) => a.sort_order - b.sort_order);
    },

    async saveSupplier(input: SupplierInput) {
      const existing = input.id ? supplierById(input.id) : undefined;
      if (existing) {
        Object.assign(existing, input);
        return { ...existing };
      }
      const created: Supplier = { ...input, id: input.id ?? crypto.randomUUID() };
      suppliers.push(created);
      return { ...created };
    },

    async listAllOffers() {
      return offers.map(withSupplier).filter((o): o is OfferWithSupplier => o !== null);
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

    async getSettings() {
      return { ...settings };
    },

    async updateSettings(patch) {
      settings = { ...settings, ...patch };
      return { ...settings };
    },
  };
}
