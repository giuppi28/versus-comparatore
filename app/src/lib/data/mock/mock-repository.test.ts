import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepository } from "./mock-repository";
import { MOCK_OFFERS, MOCK_SUPPLIERS } from "./data";
import { LeadNotFoundError, PrivacyConsentRequiredError, type Repository } from "../repository";
import { normalizeSearch } from "../normalize";
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
    expect(luce).toHaveLength(4);
    expect(gas).toHaveLength(4);
    expect(luce.every((o) => o.commodity === "luce")).toBe(true);
    expect(gas.every((o) => o.commodity === "gas")).toBe(true);
  });

  it("joins the supplier and exposes the PRD fields", async () => {
    const [edison] = (await repo.listActiveOffers("luce", "casa")).filter((o) => o.featured);
    expect(edison.supplier.name).toBe("Edison Energia");
    expect(edison).toMatchObject({
      price_type: "fixed", energy_price: 0.129, other_variable_costs: 0.06,
      fixed_fee_monthly: 9, locked_months: 12, activation_cost: 0, price_verified: false,
    });
    expect(edison.advantages).toEqual([
      "Prezzo **bloccato** 12 mesi",
      "Tariffa **monoraria**",
      "Fino a 60€ di sconto il primo anno",
      "Attivala **online** con noi, **gratis** e in **1 minuto**",
      "Puoi **revocare** il contratto entro 14 giorni",
    ]);
  });

  it("has exactly one featured offer per commodity in the seed", () => {
    expect(MOCK_OFFERS.filter((o) => o.featured && o.commodity === "luce")).toHaveLength(1);
    expect(MOCK_OFFERS.filter((o) => o.featured && o.commodity === "gas")).toHaveLength(1);
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
    expect(await repo.listActiveOffers("gas", "casa")).toHaveLength(3);
    const created = await repo.saveOffer({ ...raw, id: undefined, name: "Nuova", active: true });
    expect(created.id).toBeTruthy();
    expect(await repo.listActiveOffers("gas", "casa")).toHaveLength(4);
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
    expect(done).toEqual(ref);
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
