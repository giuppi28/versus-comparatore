import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepository } from "./mock-repository";
import { MOCK_OFFERS, MOCK_SUPPLIERS } from "./data";
import { LeadNotFoundError, PrivacyConsentRequiredError, type Repository } from "../repository";
import { normalizeSearch } from "../normalize";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRealSupplier } from "../types";
import { getDataSource, getRepository, resetRepositoryCache } from "../index";

let repo: Repository;
beforeEach(() => {
  repo = createMockRepository();
});

describe("suppliers", () => {
  it("lists the PRD block E dropdown suppliers in order", async () => {
    const list = await repo.listActiveSuppliers();
    expect(list.slice(0, 11).map((s) => s.name)).toEqual([
      "Enel Energia", "Eni Plenitude", "Edison Energia", "A2A Energia", "Hera Comm", "Iren",
      "Acea Energia", "Sorgenia", "Engie", "E.ON Energia", "Iberdrola",
    ]);
    expect(list.map((s) => s.name)).toContain("Non lo so");
    expect(list.every((s) => s.active)).toBe(true);
  });

  it("flags only tutela / altro-fornitore / non-lo-so as placeholders", async () => {
    const list = await repo.listActiveSuppliers();
    expect(list.filter((s) => s.is_placeholder).map((s) => s.slug)).toEqual(["tutela", "altro-fornitore", "non-lo-so"]);
    expect(list.filter(isRealSupplier)).toHaveLength(15);
    // Placeholders stay in the Page 1 dropdown list.
    expect(list.map((s) => s.slug)).toContain("non-lo-so");
  });

  it("createSupplier / saveSupplier default is_placeholder to false and accept true", async () => {
    const a = await repo.createSupplier({ name: "Nuovo", slug: "nuovo" });
    expect(a.is_placeholder).toBe(false);
    const b = await repo.createSupplier({ name: "Speciale", slug: "speciale", is_placeholder: true });
    expect(b.is_placeholder).toBe(true);
    expect((await repo.updateSupplier(a.id, { is_placeholder: true })).is_placeholder).toBe(true);
    const c = await repo.saveSupplier({
      name: "Salvato", slug: "salvato", logo_path: null, sells_luce: true, sells_gas: true,
      show_in_dropdown: true, sort_order: 1, active: true,
    });
    expect(c.is_placeholder).toBe(false);
  });

  it("hides inactive suppliers from public reads but not from admin", async () => {
    const r = createMockRepository({
      suppliers: MOCK_SUPPLIERS.map((s) => (s.id === "iren" ? { ...s, active: false } : s)),
    });
    expect((await r.listActiveSuppliers()).some((s) => s.id === "iren")).toBe(false);
    expect((await r.listAllSuppliers()).some((s) => s.id === "iren")).toBe(true);
  });
});

describe("offers", () => {
  it("returns only luce offers for luce, only gas for gas", async () => {
    const luce = await repo.listActiveOffers("luce", "casa");
    const gas = await repo.listActiveOffers("gas", "casa");
    expect(luce).toHaveLength(13);
    expect(gas).toHaveLength(11);
    expect(luce.every((o) => o.commodity === "luce")).toBe(true);
    expect(gas.every((o) => o.commodity === "gas")).toBe(true);
  });

  it("joins the supplier and exposes the PRD fields", async () => {
    const [sentra] = (await repo.listActiveOffers("luce", "business")).filter((o) => o.featured && o.supplier_id === "sentra-energia");
    expect(sentra.supplier.name).toBe("Sentra Energia");
    expect(sentra).toMatchObject({
      price_type: "fixed", energy_price: 0.13, other_variable_costs: 0, customer_type: "business",
      fixed_fee_monthly: 0, locked_months: 12, activation_cost: 0, price_verified: true,
      featured_audience: "business", iban_required: false,
    });
    expect(sentra.advantages).toEqual([
      "Prezzo bloccato per **12 mesi**",
      "Tariffa **monoraria**",
      "Attivala online con noi, gratis e in 1 minuto",
      "Puoi revocare il contratto entro 14 giorni",
    ]);
  });

  it("holds Aldo's 42 offers: 13 luce casa, 9 luce business, 11 gas casa, 9 gas business", () => {
    const count = (c: string, t: string) => MOCK_OFFERS.filter((o) => o.commodity === c && o.customer_type === t).length;
    expect([count("luce", "casa"), count("luce", "business"), count("gas", "casa"), count("gas", "business")]).toEqual([13, 9, 11, 9]);
    expect(MOCK_OFFERS).toHaveLength(42);
    expect(new Set(MOCK_OFFERS.map((o) => o.id)).size).toBe(42);
    expect(MOCK_OFFERS.every((o) => o.active && o.price_verified)).toBe(true);
    expect(MOCK_OFFERS.filter((o) => o.price_type === "variable").map((o) => [o.name, o.energy_price, o.iban_required])).toEqual([
      ["Prezzo Variabile Revolution", 0.01, false],
      ["Trend", 0.02, true],
    ]);
    expect(MOCK_OFFERS.filter((o) => o.price_type === "variable").every((o) => o.commodity === "luce" && o.locked_months === null)).toBe(true);
    expect(MOCK_OFFERS.filter((o) => o.iban_required)).toHaveLength(4);
  });

  it("uses the advantage wording of the offers data migration (decision #23)", () => {
    const migration = readFileSync(join(process.cwd(), "supabase/migrations/20261027120000_offers_aldo_2026_10_27.sql"), "utf8");
    for (const line of [
      "Prezzo bloccato per **12 mesi**",
      "Tariffa **monoraria**",
      "Attivala online con noi, gratis e in 1 minuto",
      "Puoi revocare il contratto entro 14 giorni",
    ]) expect(migration).toContain(`'${line}'`);
    for (const o of MOCK_OFFERS) {
      if (o.price_type === "variable") {
        expect(o.advantages).toEqual(["Attivala online con noi, gratis e in 1 minuto", "Puoi revocare il contratto entro 14 giorni"]);
      } else {
        expect(o.advantages).toHaveLength(o.commodity === "luce" ? 4 : 3);
        expect(o.advantages[0]).toBe("Prezzo bloccato per **12 mesi**");
        expect(o.advantages.includes("Tariffa **monoraria**")).toBe(o.commodity === "luce");
      }
    }
  });

  it("forces only 4 offers as featured, all for business, with featured in sync", () => {
    const featured = MOCK_OFFERS.filter((o) => o.featured);
    expect(featured.map((o) => [o.commodity, o.supplier_id])).toEqual([
      ["luce", "sentra-energia"], ["luce", "enel-energia"], ["gas", "sentra-energia"], ["gas", "enegan"],
    ]);
    expect(MOCK_OFFERS.every((o) => o.featured === (o.featured_audience !== null))).toBe(true);
    expect(featured.every((o) => o.featured_audience === "business" && o.customer_type === "business")).toBe(true);
  });

  it("filters by customer type, keeping 'both'", async () => {
    const base = MOCK_OFFERS.find((o) => o.commodity === "luce")!;
    const r = createMockRepository({
      offers: [
        { ...base, id: "casa", customer_type: "casa" },
        { ...base, id: "biz", customer_type: "business" },
        { ...base, id: "both", customer_type: "both" },
      ],
    });
    expect((await r.listActiveOffers("luce", "casa")).map((o) => o.id).sort()).toEqual(["both", "casa"]);
    expect((await r.listActiveOffers("luce", "business")).map((o) => o.id).sort()).toEqual(["biz", "both"]);
  });

  it("excludes inactive offers and offers of inactive suppliers", async () => {
    const [a, b] = MOCK_OFFERS.filter((o) => o.commodity === "luce");
    const r = createMockRepository({
      offers: [{ ...a, active: false }, b],
      suppliers: MOCK_SUPPLIERS.map((s) => (s.id === b.supplier_id ? { ...s, active: false } : s)),
    });
    expect(await r.listActiveOffers("luce", "casa")).toEqual([]);
    expect(await r.listAllOffers()).toHaveLength(2);
  });

  it("saveOffer toggles active and new offers show up", async () => {
    const [first] = await repo.listActiveOffers("gas", "casa");
    const { supplier: _s, ...raw } = first;
    void _s;
    await repo.saveOffer({ ...raw, active: false });
    expect(await repo.listActiveOffers("gas", "casa")).toHaveLength(10);
    const created = await repo.saveOffer({ ...raw, id: undefined, name: "Nuova", active: true });
    expect(created.id).toBeTruthy();
    expect(await repo.listActiveOffers("gas", "casa")).toHaveLength(11);
  });
});

describe("comuni", () => {
  it("covers climate zones A-F", async () => {
    const zones = await Promise.all(
      ["Lampedusa", "Reggio di Calabria", "Napoli", "Roma", "Milano", "Belluno"].map(
        async (q) => (await repo.searchComuni(q))[0].climate_zone,
      ),
    );
    expect(zones).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("matches the DB dataset: ISTAT codes, Aosta/Bolzano zone E, one comune with unknown zone", async () => {
    expect((await repo.getComune("084020"))?.name).toBe("Lampedusa e Linosa");
    expect((await repo.getComune("025016"))?.name).toBe("Cortina d'Ampezzo");
    expect((await repo.searchComuni("Aosta"))[0].climate_zone).toBe("E");
    expect((await repo.searchComuni("Bolzano"))[0].climate_zone).toBe("E");
    expect((await repo.searchComuni("Belluno"))[0].climate_zone).toBe("F");
    expect((await repo.getComune("025074"))?.climate_zone).toBeNull();
  });

  it("searches case-insensitively", async () => {
    expect((await repo.searchComuni("MILANO"))[0].name).toBe("Milano");
    expect((await repo.searchComuni("milano"))[0].name).toBe("Milano");
  });

  it("searches accent-insensitively in both directions", async () => {
    expect((await repo.searchComuni("forli"))[0].name).toBe("Forlì");
    expect((await repo.searchComuni("FORLÌ"))[0].name).toBe("Forlì");
  });

  it("ignores apostrophes", async () => {
    expect((await repo.searchComuni("laquila"))[0]?.name).toBeUndefined();
    expect((await repo.searchComuni("l'aquila"))[0].name).toBe("L'Aquila");
    expect((await repo.searchComuni("L Aquila"))[0].name).toBe("L'Aquila");
    expect((await repo.searchComuni("ampezzo"))[0].name).toBe("Cortina d'Ampezzo");
  });

  it("ranks prefix matches first and respects limit", async () => {
    const res = await repo.searchComuni("re");
    expect(res[0].name.toLowerCase().startsWith("re")).toBe(true);
    expect(await repo.searchComuni("a", 3)).toHaveLength(3);
    expect(await repo.searchComuni("zzzz")).toEqual([]);
    expect(await repo.searchComuni("   ")).toEqual([]);
  });

  it("getComune by ISTAT code", async () => {
    expect((await repo.getComune("015146"))?.name).toBe("Milano");
    expect(await repo.getComune("000000")).toBeNull();
  });

  it("normalizeSearch", () => {
    expect(normalizeSearch("  Forlì-Cesena ")).toBe("forli cesena");
  });
});

describe("lead lifecycle", () => {
  it("requires privacy consent", async () => {
    await expect(repo.createLead({ first_name: "Mario" })).rejects.toBeInstanceOf(
      PrivacyConsentRequiredError,
    );
    await expect(repo.createLead({ privacy_consent: false })).rejects.toBeInstanceOf(
      PrivacyConsentRequiredError,
    );
  });

  it("create -> update -> complete on the same record", async () => {
    const ref = await repo.createLead({
      privacy_consent: true, commodity: "dual", customer_type: "casa", first_name: "Mario",
    });
    expect(ref.id).toBeTruthy();
    expect(ref.token).toBeTruthy();
    let lead = (await repo.getLead(ref.id))!;
    expect(lead).toMatchObject({ step_reached: "page1", status: "new", first_name: "Mario", privacy_consent: true });

    await repo.updateLead(ref.token, { step_reached: "results", estimated_kwh_year: 2700 });
    lead = (await repo.getLead(ref.id))!;
    expect(lead).toMatchObject({ step_reached: "results", estimated_kwh_year: 2700, first_name: "Mario" });

    const done = await repo.completeLead(ref.token, { tax_code: "RSSMRA80A01H501U", pod: "IT001E12345678" });
    expect(done).toEqual({ ...ref, notification_email: null, callback_phone: "+39 095 0000000" });
    await repo.updateSettings({ notification_email: "aldo@azienda.it" });
    expect((await repo.completeLead(ref.token, {})).notification_email).toBe("aldo@azienda.it");
    lead = (await repo.getLead(ref.id))!;
    expect(lead).toMatchObject({ step_reached: "completed", status: "new", tax_code: "RSSMRA80A01H501U" });
    expect(await repo.listLeads()).toHaveLength(1);
  });

  it("a token only touches its own lead", async () => {
    const a = await repo.createLead({ privacy_consent: true, first_name: "A" });
    const b = await repo.createLead({ privacy_consent: true, first_name: "B" });
    await repo.updateLead(a.token, { first_name: "A2" });
    expect((await repo.getLead(a.id))?.first_name).toBe("A2");
    expect((await repo.getLead(b.id))?.first_name).toBe("B");
  });

  it("rejects unknown tokens", async () => {
    await expect(repo.updateLead("nope", {})).rejects.toBeInstanceOf(LeadNotFoundError);
    await expect(repo.completeLead("", {})).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it("cannot overwrite server-managed columns through lead data", async () => {
    const ref = await repo.createLead({ privacy_consent: true });
    await repo.updateLead(ref.token, {
      status: "closed", id: "x", token: "y", notes: "hack",
    } as never);
    const lead = (await repo.getLead(ref.id))!;
    expect(lead).toMatchObject({ id: ref.id, token: ref.token, status: "new", notes: null });
  });

  it("admin can change status and notes; settings persist", async () => {
    const ref = await repo.createLead({ privacy_consent: true });
    const updated = await repo.updateLeadAdmin(ref.id, { status: "contacted", notes: "richiamato" });
    expect(updated).toMatchObject({ status: "contacted", notes: "richiamato" });
    await expect(repo.updateLeadAdmin("missing", { status: "closed" })).rejects.toBeInstanceOf(LeadNotFoundError);
    await repo.updateSettings({ notification_email: "aldo@example.com" });
    expect((await repo.getSettings()).notification_email).toBe("aldo@example.com");
  });

  it("repositories are isolated from each other", async () => {
    await repo.createLead({ privacy_consent: true });
    expect(await createMockRepository().listLeads()).toHaveLength(0);
  });
});

describe("getRepository switch", () => {
  const original = process.env.NEXT_PUBLIC_DATA_SOURCE;
  beforeEach(() => resetRepositoryCache());

  it("defaults to mock and caches the instance", () => {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    expect(getDataSource()).toBe("mock");
    expect(getRepository()).toBe(getRepository());
    process.env.NEXT_PUBLIC_DATA_SOURCE = original;
  });

  it("rejects unknown values and missing supabase env", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "postgres";
    expect(() => getRepository()).toThrow(/Invalid NEXT_PUBLIC_DATA_SOURCE/);
    process.env.NEXT_PUBLIC_DATA_SOURCE = "supabase";
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getRepository()).toThrow(/requires NEXT_PUBLIC_SUPABASE_URL/);
    if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_DATA_SOURCE = original;
  });

  it("builds a supabase repository when configured", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    const r = getRepository();
    expect(typeof r.createLead).toBe("function");
    process.env.NEXT_PUBLIC_DATA_SOURCE = original;
  });
});
