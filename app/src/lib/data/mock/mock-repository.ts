import { normalizeSearch } from "../normalize";
import {
  assertLeadDocument,
  assertSafeSvg,
  DEFAULT_COMUNI_LIMIT,
  LeadDocumentLimitError,
  LeadDocumentNotFoundError,
  LeadNotFoundError,
  OfferNotFoundError,
  PlaceholderSupplierError,
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
  LeadDocument,
  LeadOfferSnapshot,
  Offer,
  OfferInput,
  LeadQuery,
  OfferWithSupplier,
  Settings,
  Supplier,
  SupplierInput,
} from "../types";
import {
  DEFAULT_CALLBACK_PHONE,
  LEAD_HISTORY_FIELDS,
  LEAD_PAGE_SIZE_DEFAULT,
  LEAD_PAGE_SIZE_MAX,
  MAX_LEAD_DOCUMENT_SLOTS,
  MAX_LEAD_DOCUMENTS,
} from "../types";
import { MOCK_COMUNI, MOCK_OFFERS, MOCK_SUPPLIERS } from "./data";

export interface MockSeed {
  suppliers?: Supplier[];
  offers?: Offer[];
  comuni?: Comune[];
  /** callback_phone defaults to DEFAULT_CALLBACK_PHONE. */
  settings?: Settings;
}

/** In-memory stand-in for the private "lead-documents" bucket + lead_documents table. */
interface MockDocument extends LeadDocument {
  bytes: Uint8Array;
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
    iban: null,
    iban_holder_different: null,
    iban_holder_first_name: null,
    iban_holder_last_name: null,
    iban_holder_tax_code: null,
    document_type: null,
    document_number: null,
    document_expiry: null,
    document_issuer: null,
    chosen_offer_luce_snapshot: null,
    chosen_offer_gas_snapshot: null,
    current_supplier_luce_name: null,
    current_supplier_gas_name: null,
  };
}

/** Never let callers overwrite server-managed columns through lead data. */
function sanitize(data: LeadData): LeadData {
  const copy: Record<string, unknown> = { ...data };
  for (const k of ["id", "token", "created_at", "updated_at", "status", "notes", ...LEAD_HISTORY_FIELDS]) {
    delete copy[k];
  }
  // Same normalization as private.apply_lead_patch (migration 20261023100000).
  const compactUpper = (v: unknown) =>
    typeof v === "string" ? v.replace(/\s+/g, "").toUpperCase() || null : v;
  if ("iban" in copy) copy.iban = compactUpper(copy.iban);
  if ("document_number" in copy) copy.document_number = compactUpper(copy.document_number);
  if (typeof copy.iban_holder_tax_code === "string") {
    copy.iban_holder_tax_code = copy.iban_holder_tax_code.trim().toUpperCase() || null;
  }
  if (copy.document_expiry === "") copy.document_expiry = null;
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
  let settings: Settings = { notification_email: null, callback_phone: DEFAULT_CALLBACK_PHONE, ...seed.settings };
  const leads: Lead[] = [];
  const documents: MockDocument[] = [];
  /** Upload slots issued per lead id (removed documents included), like the DB 20-slot cap. */
  const issuedSlots = new Map<string, number>();

  const publicDocument = ({ bytes: _b, ...doc }: MockDocument): LeadDocument => {
    void _b;
    return { ...doc };
  };
  const currentSettings = (): Settings => ({
    ...settings,
    callback_phone: settings.callback_phone || DEFAULT_CALLBACK_PHONE,
  });

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

  /** Mirrors the DB trigger offers_snapshot_before_delete (migration 20261015170000). */
  function snapshotOfferIntoLeads(o: Offer) {
    const snapshot: LeadOfferSnapshot = {
      offer_id: o.id,
      supplier_name: supplierById(o.supplier_id)?.name ?? null,
      offer_name: o.name,
      commodity: o.commodity,
      energy_price: o.energy_price,
      other_variable_costs: o.other_variable_costs,
      fixed_fee_monthly: o.fixed_fee_monthly,
      other_fixed_costs_monthly: o.other_fixed_costs_monthly,
      locked_months: o.locked_months,
      deleted_at: new Date().toISOString(),
    };
    for (const lead of leads) {
      let touched = false;
      for (const side of ["luce", "gas"] as const) {
        const ref = `chosen_offer_${side}` as const;
        const snap = `chosen_offer_${side}_snapshot` as const;
        if (lead[ref] !== o.id) continue;
        // Keep an existing copy of the same offer; replace a stale copy of another one.
        if (lead[snap]?.offer_id !== o.id) lead[snap] = { ...snapshot };
        lead[ref] = null; // ON DELETE SET NULL
        touched = true;
      }
      if (touched) lead.updated_at = new Date().toISOString();
    }
  }

  /** Mirrors the DB trigger suppliers_guard_before_delete (name part). */
  function storeSupplierNameInLeads(s: Supplier) {
    for (const lead of leads) {
      let touched = false;
      for (const side of ["luce", "gas"] as const) {
        const ref = `current_supplier_${side}` as const;
        if (lead[ref] !== s.id) continue;
        lead[`current_supplier_${side}_name`] = s.name;
        lead[ref] = null; // ON DELETE SET NULL
        touched = true;
      }
      if (touched) lead.updated_at = new Date().toISOString();
    }
  }

  function removeOffer(o: Offer) {
    snapshotOfferIntoLeads(o);
    offers.splice(offers.indexOf(o), 1);
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
      // Mirrors complete_lead: the settings recipient + callback number are returned with the ref.
      return {
        id: lead.id,
        token: lead.token,
        notification_email: settings.notification_email,
        callback_phone: currentSettings().callback_phone!,
      };
    },

    async getCallbackPhone() {
      return currentSettings().callback_phone!;
    },

    async uploadLeadDocument(token, file) {
      assertLeadDocument(file);
      const lead = leadByToken(token);
      // Like lock_lead_by_token: completed leads are read-only.
      if (lead.step_reached === "completed") throw new LeadNotFoundError();
      const issued = issuedSlots.get(lead.id) ?? 0;
      if (documents.filter((d) => d.lead_id === lead.id).length >= MAX_LEAD_DOCUMENTS || issued >= MAX_LEAD_DOCUMENT_SLOTS) {
        throw new LeadDocumentLimitError();
      }
      issuedSlots.set(lead.id, issued + 1);
      const doc: MockDocument = {
        id: crypto.randomUUID(),
        lead_id: lead.id,
        mime_type: file.mime,
        size_bytes: file.bytes.length,
        created_at: new Date().toISOString(),
        bytes: new Uint8Array(file.bytes),
      };
      documents.push(doc);
      return publicDocument(doc);
    },

    async removeLeadDocument(token, documentId) {
      const lead = leadByToken(token);
      // Like lock_lead_by_token: completed leads are read-only.
      if (lead.step_reached === "completed") throw new LeadNotFoundError();
      const i = documents.findIndex((d) => d.id === documentId && d.lead_id === lead.id);
      if (i < 0) throw new LeadDocumentNotFoundError();
      documents.splice(i, 1);
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

    async deleteLeads(ids) {
      return (await repo.deleteLeadsAndDocuments(ids)).deleted;
    },

    async deleteLeadsAndDocuments(ids) {
      const wanted = new Set(ids);
      if (wanted.size === 0) return { deleted: 0, documentCleanupFailed: false };
      let deleted = 0;
      for (let i = leads.length - 1; i >= 0; i--) {
        if (wanted.has(leads[i].id)) {
          leads.splice(i, 1);
          deleted++;
        }
      }
      // Rows cascade + files removed from the in-memory "bucket".
      for (let i = documents.length - 1; i >= 0; i--) {
        if (wanted.has(documents[i].lead_id)) documents.splice(i, 1);
      }
      return { deleted, documentCleanupFailed: false };
    },

    async listLeadDocuments(leadId) {
      return documents
        .filter((d) => d.lead_id === leadId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(publicDocument);
    },

    async createLeadDocumentUrl(documentId) {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) throw new LeadDocumentNotFoundError();
      // No signed URLs in memory: the file itself as a data: URL (preview and download).
      return `data:${doc.mime_type};base64,${Buffer.from(doc.bytes).toString("base64")}`;
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

    async countOffersBySupplier(supplierId) {
      return offers.filter((o) => o.supplier_id === supplierId).length;
    },

    async deleteSupplier(id) {
      const s = supplierById(id);
      if (!s) throw new SupplierNotFoundError();
      if (s.is_placeholder) throw new PlaceholderSupplierError();
      const own = offers.filter((o) => o.supplier_id === id);
      for (const o of own) removeOffer(o);
      storeSupplierNameInLeads(s);
      suppliers.splice(suppliers.indexOf(s), 1);
      // Mock logos are data: URLs or /logos/ files: nothing to clean up.
      return { deletedOffers: own.length, logoCleanupFailed: false };
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

    async deleteOffer(id) {
      const o = offers.find((x) => x.id === id);
      if (!o) throw new OfferNotFoundError();
      removeOffer(o);
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
      return currentSettings();
    },

    async updateSettings(patch) {
      settings = { ...settings, ...definedOnly(patch) };
      return currentSettings();
    },
  };
  return repo;
}
