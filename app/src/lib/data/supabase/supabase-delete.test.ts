import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRepository } from "./supabase-repository";
import {
  OfferNotFoundError,
  PlaceholderSupplierError,
  SupplierHasOffersError,
  SupplierNotFoundError,
} from "../repository";

type Result = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null };

/** Chainable, thenable PostgREST-like builder that records every call. */
function builder(result: Result) {
  const calls: Array<[string, unknown[]]> = [];
  const b: Record<string, unknown> = {};
  const chain = (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, args]);
      return b;
    };
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "in", "or", "order", "range", "limit"]) {
    b[m] = chain(m);
  }
  b.single = () => Promise.resolve({ error: null, ...result });
  b.maybeSingle = () => Promise.resolve({ error: null, ...result });
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve({ error: null, ...result }).then(res, rej);
  return { b, calls };
}

function clientFor(results: Result[], storage?: unknown) {
  const queue = [...results];
  const builders: Array<ReturnType<typeof builder> & { table: string }> = [];
  const from = vi.fn((table: string) => {
    const x = builder(queue.shift() ?? {});
    builders.push({ ...x, table });
    return x.b;
  });
  return { client: { from, storage } as unknown as SupabaseClient, from, builders };
}

function storageMock(opts: { list?: Result; remove?: Result } = {}) {
  const list = vi.fn().mockResolvedValue({ data: [], error: null, ...opts.list });
  const remove = vi.fn().mockResolvedValue({ data: [], error: null, ...opts.remove });
  const fromBucket = vi.fn().mockReturnValue({ list, remove });
  return { storage: { from: fromBucket }, fromBucket, list, remove };
}

const SUP = "11111111-1111-4111-8111-111111111111";
const supplierRow = (over: Record<string, unknown> = {}) => ({
  id: SUP, name: "Fornitore", slug: "fornitore", logo_path: null, sells_luce: true, sells_gas: true,
  show_in_dropdown: true, sort_order: 1, active: true, is_placeholder: false, ...over,
});

const names = (b: { calls: Array<[string, unknown[]]> }) => b.calls.map((c) => c[0]);

describe("lead rows", () => {
  it("history fields default to null when the DB has no such columns yet", async () => {
    const { client } = clientFor([{ data: { id: "l1", first_name: "A" } }]);
    const l = await createSupabaseRepository(client).getLead("l1");
    expect(l).toMatchObject({
      id: "l1",
      chosen_offer_luce_snapshot: null,
      chosen_offer_gas_snapshot: null,
      current_supplier_luce_name: null,
      current_supplier_gas_name: null,
    });
  });

  it("maps snapshot objects and supplier names (lists too)", async () => {
    const snap = { offer_id: "o1", offer_name: "X", energy_price: 0.1 };
    const row = { id: "l1", chosen_offer_luce_snapshot: snap, chosen_offer_gas_snapshot: "bad", current_supplier_gas_name: "Enel" };
    const one = clientFor([{ data: row }]);
    expect(await createSupabaseRepository(one.client).getLead("l1")).toMatchObject({
      chosen_offer_luce_snapshot: snap,
      chosen_offer_gas_snapshot: null,
      current_supplier_luce_name: null,
      current_supplier_gas_name: "Enel",
    });
    const list = clientFor([{ data: [row] }]);
    expect((await createSupabaseRepository(list.client).listLeads())[0].chosen_offer_luce_snapshot).toEqual(snap);
    const page = clientFor([{ data: [row], count: 1 }]);
    expect((await createSupabaseRepository(page.client).queryLeads()).items[0].current_supplier_gas_name).toBe("Enel");
  });
});

describe("deleteLeads / deleteLeadsAndDocuments", () => {
  it("deletes by id (deduplicated) and returns the deleted count", async () => {
    const { client, builders } = clientFor([{ data: [] }, { data: [{ id: "a" }, { id: "b" }] }], storageMock().storage);
    expect(await createSupabaseRepository(client).deleteLeads(["a", "b", "a"])).toBe(2);
    expect(builders[0].table).toBe("lead_documents");
    expect(names(builders[0])).toEqual(["select", "in"]);
    expect(builders[0].calls[1][1]).toEqual(["lead_id", ["a", "b"]]);
    expect(builders[1].table).toBe("leads");
    expect(names(builders[1])).toEqual(["delete", "in", "select"]);
    expect(builders[1].calls[1][1]).toEqual(["id", ["a", "b"]]);
  });

  it("removes the files of the deleted leads only (pending slots included), after the rows", async () => {
    const st = storageMock();
    const docs = [
      { lead_id: "a", object_path: "a/1.jpg" },
      { lead_id: "a", object_path: "a/2.pdf" },
      { lead_id: "b", object_path: "b/1.pdf" }, // b not deleted (e.g. not visible) -> file kept
    ];
    const { client, builders } = clientFor([{ data: docs }, { data: [{ id: "a" }] }], st.storage);
    expect(await createSupabaseRepository(client).deleteLeadsAndDocuments(["a", "b"])).toEqual({
      deleted: 1,
      documentCleanupFailed: false,
    });
    expect(builders.map((b) => b.table)).toEqual(["lead_documents", "leads"]);
    expect(st.fromBucket).toHaveBeenCalledWith("lead-documents");
    expect(st.remove).toHaveBeenCalledTimes(1);
    expect(st.remove).toHaveBeenCalledWith(["a/1.jpg", "a/2.pdf"]);
  });

  it("no documents: no storage call", async () => {
    const st = storageMock();
    const { client } = clientFor([{ data: [] }, { data: [{ id: "a" }] }], st.storage);
    expect(await createSupabaseRepository(client).deleteLeadsAndDocuments(["a"])).toEqual({
      deleted: 1,
      documentCleanupFailed: false,
    });
    expect(st.fromBucket).not.toHaveBeenCalled();
  });

  it("storage failure (error or throw) is a warning, the rows stay deleted", async () => {
    const docs = [{ lead_id: "a", object_path: "a/1.jpg" }];
    const failing = storageMock({ remove: { data: null, error: { message: "boom" } } });
    const one = clientFor([{ data: docs }, { data: [{ id: "a" }] }], failing.storage);
    expect(await createSupabaseRepository(one.client).deleteLeadsAndDocuments(["a"])).toEqual({
      deleted: 1,
      documentCleanupFailed: true,
    });
    const throwing = storageMock();
    throwing.remove.mockRejectedValue(new Error("network"));
    const two = clientFor([{ data: docs }, { data: [{ id: "a" }] }], throwing.storage);
    expect(await createSupabaseRepository(two.client).deleteLeads(["a"])).toBe(1);
  });

  it("chunks the storage removal by 1000 paths", async () => {
    const st = storageMock();
    const ids = Array.from({ length: 2 }, (_, i) => `l${i}`);
    const docs = Array.from({ length: 1001 }, (_, i) => ({ lead_id: ids[i % 2], object_path: `${ids[i % 2]}/${i}.pdf` }));
    const { client } = clientFor([{ data: docs }, { data: ids.map((id) => ({ id })) }], st.storage);
    await createSupabaseRepository(client).deleteLeadsAndDocuments(ids);
    expect(st.remove).toHaveBeenCalledTimes(2);
    expect((st.remove.mock.calls[0][0] as string[]).length).toBe(1000);
    expect((st.remove.mock.calls[1][0] as string[]).length).toBe(1);
  });

  it("works before the documents migration (missing table) and aborts on other read errors", async () => {
    const missing = clientFor([{ data: null, error: { message: "no table", code: "PGRST205" } }, { data: [{ id: "a" }] }]);
    expect(await createSupabaseRepository(missing.client).deleteLeads(["a"])).toBe(1);
    const denied = clientFor([{ data: null, error: { message: "permission denied", code: "42501" } }]);
    await expect(createSupabaseRepository(denied.client).deleteLeads(["a"])).rejects.toThrow("permission denied");
    expect(denied.builders).toHaveLength(1); // no lead row deleted
  });

  it("empty array: 0 without any query", async () => {
    const { client, from } = clientFor([]);
    expect(await createSupabaseRepository(client).deleteLeads([])).toBe(0);
    expect(await createSupabaseRepository(client).deleteLeadsAndDocuments([])).toEqual({
      deleted: 0,
      documentCleanupFailed: false,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("surfaces lead delete errors", async () => {
    const { client } = clientFor([{ data: [] }, { data: null, error: { message: "permission denied", code: "42501" } }]);
    await expect(createSupabaseRepository(client).deleteLeads(["a"])).rejects.toThrow("permission denied");
  });
});

describe("deleteOffer", () => {
  it("deletes by id", async () => {
    const { client, builders } = clientFor([{ data: [{ id: "o1" }] }]);
    await createSupabaseRepository(client).deleteOffer("o1");
    expect(builders[0].table).toBe("offers");
    expect(names(builders[0])).toEqual(["delete", "eq", "select"]);
    expect(builders[0].calls[1][1]).toEqual(["id", "o1"]);
  });

  it("no row deleted -> OfferNotFoundError; DB error surfaced", async () => {
    const none = clientFor([{ data: [] }]);
    await expect(createSupabaseRepository(none.client).deleteOffer("x")).rejects.toBeInstanceOf(OfferNotFoundError);
    const err = clientFor([{ data: null, error: { message: "boom" } }]);
    await expect(createSupabaseRepository(err.client).deleteOffer("x")).rejects.toThrow("boom");
  });
});

describe("countOffersBySupplier", () => {
  it("head count on offers.supplier_id", async () => {
    const { client, builders } = clientFor([{ data: null, count: 3 }]);
    expect(await createSupabaseRepository(client).countOffersBySupplier(SUP)).toBe(3);
    expect(builders[0].table).toBe("offers");
    expect(builders[0].calls[0]).toEqual(["select", ["id", { count: "exact", head: true }]]);
    expect(builders[0].calls[1]).toEqual(["eq", ["supplier_id", SUP]]);
  });
});

describe("deleteSupplier", () => {
  it("deletes the offers first, then the supplier; /logos/ files are left alone", async () => {
    const st = storageMock();
    const { client, builders } = clientFor(
      [{ data: supplierRow({ logo_path: "/logos/fornitore.svg" }) }, { data: [{ id: "o1" }, { id: "o2" }] }, { data: [{ id: SUP }] }],
      st.storage,
    );
    expect(await createSupabaseRepository(client).deleteSupplier(SUP)).toEqual({ deletedOffers: 2, logoCleanupFailed: false });
    expect(builders.map((b) => b.table)).toEqual(["suppliers", "offers", "suppliers"]);
    expect(names(builders[1])).toEqual(["delete", "eq", "select"]);
    expect(builders[1].calls[1][1]).toEqual(["supplier_id", SUP]);
    expect(names(builders[2])).toEqual(["delete", "eq", "select"]);
    expect(builders[2].calls[1][1]).toEqual(["id", SUP]);
    expect(st.fromBucket).not.toHaveBeenCalled();
  });

  it("removes the Storage logo objects of the supplier (current + earlier uploads)", async () => {
    const st = storageMock({
      list: { data: [{ id: "f1", name: "100.svg" }, { id: "f2", name: "200.svg" }, { id: null, name: "sub" }] },
    });
    const { client } = clientFor(
      [{ data: supplierRow({ logo_path: `${SUP}/200.svg` }) }, { data: [] }, { data: [{ id: SUP }] }],
      st.storage,
    );
    expect(await createSupabaseRepository(client).deleteSupplier(SUP)).toEqual({ deletedOffers: 0, logoCleanupFailed: false });
    expect(st.fromBucket).toHaveBeenCalledWith("supplier-logos");
    expect(st.list).toHaveBeenCalledWith(SUP, { limit: 1000 });
    expect(st.remove).toHaveBeenCalledTimes(1);
    expect([...st.remove.mock.calls[0][0]].sort()).toEqual([`${SUP}/100.svg`, `${SUP}/200.svg`]);
  });

  it("never removes a Storage object outside the supplier's own folder", async () => {
    const st = storageMock();
    const { client } = clientFor(
      [{ data: supplierRow({ logo_path: "other-supplier/1.svg" }) }, { data: [] }, { data: [{ id: SUP }] }],
      st.storage,
    );
    expect(await createSupabaseRepository(client).deleteSupplier(SUP)).toEqual({ deletedOffers: 0, logoCleanupFailed: false });
    expect(st.remove).not.toHaveBeenCalled();
  });

  it("a failed logo removal does not undo the deletion: logoCleanupFailed = true", async () => {
    const st = storageMock({ remove: { data: null, error: { message: "denied" } } });
    const { client } = clientFor(
      [{ data: supplierRow({ logo_path: `${SUP}/1.svg` }) }, { data: [] }, { data: [{ id: SUP }] }],
      st.storage,
    );
    expect(await createSupabaseRepository(client).deleteSupplier(SUP)).toEqual({ deletedOffers: 0, logoCleanupFailed: true });

    const throwing = { from: () => ({ list: () => Promise.reject(new Error("network")), remove: vi.fn() }) };
    const t = clientFor([{ data: supplierRow({ logo_path: `${SUP}/1.svg` }) }, { data: [] }, { data: [{ id: SUP }] }], throwing);
    expect(await createSupabaseRepository(t.client).deleteSupplier(SUP)).toEqual({ deletedOffers: 0, logoCleanupFailed: true });
  });

  it("rejects placeholders before touching any offer", async () => {
    const { client, builders } = clientFor([{ data: supplierRow({ is_placeholder: true }) }]);
    const err = await createSupabaseRepository(client).deleteSupplier(SUP).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PlaceholderSupplierError);
    expect((err as PlaceholderSupplierError).code).toBe("placeholder_supplier");
    expect(builders).toHaveLength(1);
    expect(names(builders[0])).not.toContain("delete");
  });

  it("unknown supplier -> SupplierNotFoundError without deleting anything", async () => {
    const { client, builders } = clientFor([{ data: null }]);
    await expect(createSupabaseRepository(client).deleteSupplier(SUP)).rejects.toBeInstanceOf(SupplierNotFoundError);
    expect(builders).toHaveLength(1);
  });

  it("offer delete error stops before the supplier delete", async () => {
    const { client, builders } = clientFor([{ data: supplierRow() }, { data: null, error: { message: "offers boom" } }]);
    await expect(createSupabaseRepository(client).deleteSupplier(SUP)).rejects.toThrow("offers boom");
    expect(builders).toHaveLength(2);
  });

  it("surfaces a failed supplier delete with typed errors", async () => {
    const cases: Array<[Result, unknown]> = [
      [{ data: null, error: { message: 'update or delete on table "suppliers" violates RESTRICT setting', code: "23001" } }, SupplierHasOffersError],
      [{ data: null, error: { message: "fk", code: "23503" } }, SupplierHasOffersError],
      [{ data: null, error: { message: 'placeholder_supplier: "Non lo so" is a placeholder supplier', code: "P0001" } }, PlaceholderSupplierError],
      [{ data: [] }, SupplierNotFoundError],
    ];
    for (const [res, type] of cases) {
      const { client } = clientFor([{ data: supplierRow() }, { data: [] }, res]);
      await expect(createSupabaseRepository(client).deleteSupplier(SUP)).rejects.toBeInstanceOf(type as never);
    }
    const generic = clientFor([{ data: supplierRow() }, { data: [] }, { data: null, error: { message: "network down" } }]);
    await expect(createSupabaseRepository(generic.client).deleteSupplier(SUP)).rejects.toThrow("network down");
  });
});
