import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepository } from "./mock-repository";
import {
  InvalidLogoError,
  LeadNotFoundError,
  OfferNotFoundError,
  SupplierNotFoundError,
  SupplierSlugTakenError,
  type Repository,
} from "../repository";
import type { OfferCreateInput } from "../types";

let repo: Repository;
beforeEach(() => {
  repo = createMockRepository();
});

async function seedLead(over: Record<string, unknown> = {}) {
  return repo.createLead({ privacy_consent: true, ...over });
}

describe("queryLeads", () => {
  it("filters by step_reached and status, newest first", async () => {
    const a = await seedLead({ first_name: "Anna" });
    const b = await seedLead({ first_name: "Bruno" });
    await repo.completeLead(b.token, { first_name: "Bruno" });
    await repo.updateLeadAdmin(b.id, { status: "contacted" });

    expect((await repo.queryLeads()).items.map((l) => l.id)).toEqual([b.id, a.id]);
    expect((await repo.queryLeads({ step_reached: "completed" })).items.map((l) => l.id)).toEqual([b.id]);
    expect((await repo.queryLeads({ step_reached: "page1" })).items.map((l) => l.id)).toEqual([a.id]);
    expect((await repo.queryLeads({ status: "contacted" })).total).toBe(1);
    expect((await repo.queryLeads({ status: "closed" })).total).toBe(0);
    expect((await repo.queryLeads({ step_reached: "completed", status: "new" })).total).toBe(0);
  });

  it("searches case-insensitively across name, company, phone, tax code, POD", async () => {
    const m = await seedLead({ first_name: "Mario", last_name: "Rossi", phone: "3331234567" });
    await seedLead({ company_name: "Bianchi SRL", vat_number: "01234567890", pod: "IT001E12345678" });
    expect((await repo.queryLeads({ search: "MARIO" })).items.map((l) => l.id)).toEqual([m.id]);
    expect((await repo.queryLeads({ search: "mario rossi" })).total).toBe(1);
    expect((await repo.queryLeads({ search: "rossi bianchi" })).total).toBe(0);
    expect((await repo.queryLeads({ search: "333123" })).total).toBe(1);
    expect((await repo.queryLeads({ search: "bianchi" })).total).toBe(1);
    expect((await repo.queryLeads({ search: "it001e" })).total).toBe(1);
    expect((await repo.queryLeads({ search: "   " })).total).toBe(2);
    expect((await repo.queryLeads({ search: "zzz" })).total).toBe(0);
  });

  it("paginates and clamps page size", async () => {
    for (let i = 0; i < 5; i++) await seedLead({ first_name: `L${i}` });
    const p1 = await repo.queryLeads({ pageSize: 2, page: 1 });
    const p3 = await repo.queryLeads({ pageSize: 2, page: 3 });
    const p9 = await repo.queryLeads({ pageSize: 2, page: 9 });
    expect(p1).toMatchObject({ total: 5, page: 1, pageSize: 2 });
    expect(p1.items.map((l) => l.first_name)).toEqual(["L4", "L3"]);
    expect(p3.items.map((l) => l.first_name)).toEqual(["L0"]);
    expect(p9.items).toEqual([]);
    expect(p9.total).toBe(5);
    expect((await repo.queryLeads({ pageSize: 1000 })).pageSize).toBe(100);
    expect((await repo.queryLeads({ pageSize: 0, page: -3 }))).toMatchObject({ pageSize: 1, page: 1 });
    expect((await repo.queryLeads()).pageSize).toBe(25);
  });
});

describe("lead admin updates", () => {
  it("updates status and notes without touching customer data", async () => {
    const l = await seedLead({ first_name: "Anna" });
    const u = await repo.updateLeadAdmin(l.id, { status: "in_progress", notes: "richiamare" });
    expect(u).toMatchObject({ status: "in_progress", notes: "richiamare", first_name: "Anna" });
    expect(await repo.updateLeadAdmin(l.id, { notes: null })).toMatchObject({ notes: null, status: "in_progress" });
    expect((await repo.getLead(l.id))?.status).toBe("in_progress");
    await expect(repo.updateLeadAdmin("nope", { status: "closed" })).rejects.toBeInstanceOf(LeadNotFoundError);
    expect(await repo.getLead("nope")).toBeNull();
  });
});

describe("suppliers admin", () => {
  it("creates with defaults, rejects duplicate slugs, updates flags", async () => {
    const s = await repo.createSupplier({ name: "Nuovo Fornitore", slug: "nuovo-fornitore" });
    expect(s).toMatchObject({
      sells_luce: false, sells_gas: false, show_in_dropdown: true, active: true, sort_order: 0, logo_path: null,
    });
    expect(await repo.getSupplier(s.id)).toEqual(s);
    await expect(repo.createSupplier({ name: "x", slug: "nuovo-fornitore" })).rejects.toBeInstanceOf(
      SupplierSlugTakenError,
    );

    const u = await repo.updateSupplier(s.id, { sells_luce: true, active: false, sort_order: 99, show_in_dropdown: false });
    expect(u).toMatchObject({ sells_luce: true, active: false, sort_order: 99, show_in_dropdown: false, name: "Nuovo Fornitore" });
    expect((await repo.listAllSuppliers()).some((x) => x.id === s.id)).toBe(true);
    expect((await repo.listActiveSuppliers()).some((x) => x.id === s.id)).toBe(false);

    const other = (await repo.listAllSuppliers()).find((x) => x.id !== s.id)!;
    await expect(repo.updateSupplier(s.id, { slug: other.slug })).rejects.toBeInstanceOf(SupplierSlugTakenError);
    await expect(repo.updateSupplier(s.id, { slug: s.slug })).resolves.toBeTruthy();
    await expect(repo.updateSupplier("nope", { name: "x" })).rejects.toBeInstanceOf(SupplierNotFoundError);
    expect(await repo.getSupplier("nope")).toBeNull();
  });

  it("ignores undefined patch values", async () => {
    const s = (await repo.listAllSuppliers())[0];
    const u = await repo.updateSupplier(s.id, { name: undefined, active: s.active });
    expect(u.name).toBe(s.name);
  });

  it("uploads a logo as data URL and rejects unsafe or invalid SVG", async () => {
    const s = (await repo.listAllSuppliers())[0];
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>';
    const path = await repo.uploadSupplierLogo(s.id, svg);
    expect(path.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(Buffer.from(path.split(",")[1], "base64").toString()).toBe(svg);
    const updated = await repo.updateSupplier(s.id, { logo_path: path });
    expect(updated.logo_path).toBe(path);

    for (const bad of [
      "<html></html>",
      "<svg><script>alert(1)</script></svg>",
      '<svg onload="x()"></svg>',
      '<svg><a href="javascript:alert(1)"/></svg>',
      '<svg><image href="https://evil.example/x.png"/></svg>',
      "<svg><foreignObject/></svg>",
      `<svg>${"a".repeat(300_000)}</svg>`,
    ]) {
      await expect(repo.uploadSupplierLogo(s.id, bad)).rejects.toBeInstanceOf(InvalidLogoError);
    }
    await expect(repo.uploadSupplierLogo("nope", svg)).rejects.toBeInstanceOf(SupplierNotFoundError);
  });
});

describe("offers admin", () => {
  async function newOfferInput(over: Partial<OfferCreateInput> = {}): Promise<OfferCreateInput> {
    const [first] = await repo.listAllOffers();
    const { supplier: _s, id: _i, updated_at: _u, ...rest } = first;
    void _s; void _i; void _u;
    return { ...rest, ...over };
  }

  it("lists all offers including inactive, with supplier, in a stable order", async () => {
    const all = await repo.listAllOffers();
    expect(all.length).toBeGreaterThanOrEqual(8);
    expect(all.every((o) => o.supplier?.id === o.supplier_id)).toBe(true);
    const target = all[0];
    await repo.setOfferFlags(target.id, { active: false, featured: true });
    expect((await repo.listAllOffers()).map((o) => o.id)).toEqual(all.map((o) => o.id));
  });

  it("creates, reads, and fully updates an offer", async () => {
    const input = await newOfferInput({ name: "Creata da admin", advantages: ["**Uno**", "Due"], promo_text: null });
    const created = await repo.createOffer(input);
    expect(created.id).toBeTruthy();
    expect(created.supplier.id).toBe(input.supplier_id);
    expect(await repo.getOffer(created.id)).toEqual(created);

    const u = await repo.updateOffer(created.id, {
      name: "Rinominata",
      energy_price: 0.123,
      locked_months: 24,
      advantages: ["Solo uno"],
      promo_text: "Promo",
    });
    expect(u).toMatchObject({ name: "Rinominata", energy_price: 0.123, locked_months: 24, advantages: ["Solo uno"], promo_text: "Promo" });
    expect(u.updated_at >= created.updated_at).toBe(true);
    expect(u.fixed_fee_monthly).toBe(created.fixed_fee_monthly);
  });

  it("validates supplier references and unknown ids", async () => {
    const input = await newOfferInput();
    await expect(repo.createOffer({ ...input, supplier_id: "nope" })).rejects.toBeInstanceOf(SupplierNotFoundError);
    const [o] = await repo.listAllOffers();
    await expect(repo.updateOffer(o.id, { supplier_id: "nope" })).rejects.toBeInstanceOf(SupplierNotFoundError);
    await expect(repo.updateOffer("nope", { name: "x" })).rejects.toBeInstanceOf(OfferNotFoundError);
    await expect(repo.setOfferFlags("nope", { active: true })).rejects.toBeInstanceOf(OfferNotFoundError);
    expect(await repo.getOffer("nope")).toBeNull();
  });

  it("deactivate removes the offer from public results; reactivate restores it", async () => {
    const [first] = await repo.listActiveOffers("luce", "casa");
    const before = (await repo.listActiveOffers("luce", "casa")).length;
    await repo.setOfferFlags(first.id, { active: false });
    const during = await repo.listActiveOffers("luce", "casa");
    expect(during.map((o) => o.id)).not.toContain(first.id);
    expect(during).toHaveLength(before - 1);
    await repo.setOfferFlags(first.id, { active: true });
    expect(await repo.listActiveOffers("luce", "casa")).toHaveLength(before);
  });

  it("featured is visible on public reads", async () => {
    const list = await repo.listActiveOffers("gas", "casa");
    const target = list.find((o) => !o.featured)!;
    await repo.setOfferFlags(target.id, { featured: true });
    expect((await repo.listActiveOffers("gas", "casa")).find((o) => o.id === target.id)?.featured).toBe(true);
    await repo.setOfferFlags(target.id, { featured: false });
    expect((await repo.listActiveOffers("gas", "casa")).find((o) => o.id === target.id)?.featured).toBe(false);
  });

  it("listUnverifiedActiveOffers follows active and price_verified", async () => {
    const all = await repo.listAllOffers();
    // Aldo's 42 offers are all verified (decision #23): flip some to unverified first.
    expect(await repo.listUnverifiedActiveOffers()).toEqual([]);
    for (const o of all.slice(0, 3)) await repo.setOfferFlags(o.id, { price_verified: false });
    const unverified = await repo.listUnverifiedActiveOffers();
    expect(unverified.length).toBe(3);

    for (const o of unverified) await repo.setOfferFlags(o.id, { price_verified: true });
    expect(await repo.listUnverifiedActiveOffers()).toEqual([]);

    const o = all[0];
    await repo.setOfferFlags(o.id, { price_verified: false, active: false });
    expect(await repo.listUnverifiedActiveOffers()).toEqual([]); // inactive offers do not block go-live
    await repo.setOfferFlags(o.id, { active: true });
    expect((await repo.listUnverifiedActiveOffers()).map((x) => x.id)).toEqual([o.id]);
  });

  it("flags with undefined values change nothing", async () => {
    const [o] = await repo.listAllOffers();
    const u = await repo.setOfferFlags(o.id, { active: undefined });
    expect(u.active).toBe(o.active);
  });
});

describe("settings", () => {
  it("reads and updates notification_email", async () => {
    const phone = "+39 095 0000000";
    expect(await repo.getSettings()).toEqual({ notification_email: null, callback_phone: phone });
    expect(await repo.updateSettings({ notification_email: "aldo@example.it" })).toEqual({
      notification_email: "aldo@example.it",
      callback_phone: phone,
    });
    expect((await repo.getSettings()).notification_email).toBe("aldo@example.it");
    expect(await repo.updateSettings({ notification_email: null })).toEqual({ notification_email: null, callback_phone: phone });
  });

  it("reads and updates callback_phone (public getter, completion result)", async () => {
    expect(await repo.getCallbackPhone()).toBe("+39 095 0000000");
    expect(await repo.updateSettings({ callback_phone: "+39 02 1234567" })).toMatchObject({ callback_phone: "+39 02 1234567" });
    // undefined in a patch changes nothing
    expect(await repo.updateSettings({ callback_phone: undefined })).toMatchObject({ callback_phone: "+39 02 1234567" });
    expect(await repo.getCallbackPhone()).toBe("+39 02 1234567");
    const ref = await repo.createLead({ privacy_consent: true });
    expect((await repo.completeLead(ref.token, {})).callback_phone).toBe("+39 02 1234567");
  });
});
