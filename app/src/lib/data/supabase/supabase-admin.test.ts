import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRepository } from "./supabase-repository";
import {
  InvalidLogoError,
  LeadNotFoundError,
  OfferNotFoundError,
  SupplierNotFoundError,
  SupplierSlugTakenError,
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
  for (const m of ["select", "insert", "update", "upsert", "eq", "or", "order", "range", "limit"]) b[m] = chain(m);
  b.single = () => Promise.resolve({ error: null, ...result });
  b.maybeSingle = () => Promise.resolve({ error: null, ...result });
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve({ error: null, ...result }).then(res, rej);
  return { b, calls };
}

function clientFor(results: Result[], storage?: unknown) {
  const queue = [...results];
  const builders: ReturnType<typeof builder>[] = [];
  const from = vi.fn((table: string) => {
    void table;
    const x = builder(queue.shift() ?? {});
    builders.push(x);
    return x.b;
  });
  return { client: { from, storage } as unknown as SupabaseClient, from, builders };
}

const supplierRow = {
  id: "s1", name: "A", slug: "a", logo_path: null, sells_luce: true, sells_gas: false,
  show_in_dropdown: true, sort_order: 1, active: true, created_at: "x", updated_at: "y",
};

describe("supabase repository admin", () => {
  it("maps supplier rows (drops DB-only columns) and orders", async () => {
    const { client, builders } = clientFor([{ data: [supplierRow] }]);
    const list = await createSupabaseRepository(client).listAllSuppliers();
    expect(list[0]).not.toHaveProperty("created_at");
    expect(list[0].slug).toBe("a");
    expect(builders[0].calls.map((c) => c[0])).toEqual(["select", "order", "order"]);
  });

  it("maps unique violation on slug and missing rows", async () => {
    const dup = clientFor([{ data: null, error: { message: "dup", code: "23505" } }]);
    await expect(
      createSupabaseRepository(dup.client).createSupplier({ name: "A", slug: "a" }),
    ).rejects.toBeInstanceOf(SupplierSlugTakenError);

    const missing = clientFor([{ data: null }]);
    await expect(createSupabaseRepository(missing.client).updateSupplier("x", { name: "B" })).rejects.toBeInstanceOf(
      SupplierNotFoundError,
    );

    const fk = clientFor([{ data: null, error: { message: "fk", code: "23503" } }]);
    await expect(
      createSupabaseRepository(fk.client).createOffer({} as never),
    ).rejects.toBeInstanceOf(SupplierNotFoundError);

    const noOffer = clientFor([{ data: null }]);
    await expect(createSupabaseRepository(noOffer.client).updateOffer("x", { active: true })).rejects.toBeInstanceOf(
      OfferNotFoundError,
    );

    const noLead = clientFor([{ data: null }]);
    await expect(createSupabaseRepository(noLead.client).updateLeadAdmin("x", { status: "closed" })).rejects.toBeInstanceOf(
      LeadNotFoundError,
    );
  });

  it("updateOffer sends only defined fields", async () => {
    const row = { id: "o1", supplier_id: "s1", name: "N", supplier: supplierRow, created_at: "c" };
    const { client, builders } = clientFor([{ data: row }]);
    const out = await createSupabaseRepository(client).setOfferFlags("o1", { active: false, featured: undefined });
    expect(builders[0].calls.find((c) => c[0] === "update")?.[1]).toEqual([{ active: false }]);
    expect(out).not.toHaveProperty("created_at");
    expect(out.supplier.slug).toBe("a");
  });

  it("listUnverifiedActiveOffers filters on active and price_verified", async () => {
    const { client, builders } = clientFor([{ data: [] }]);
    await createSupabaseRepository(client).listUnverifiedActiveOffers();
    const eqs = builders[0].calls.filter((c) => c[0] === "eq").map((c) => c[1]);
    expect(eqs).toEqual([["active", true], ["price_verified", false]]);
  });

  it("queryLeads builds filters, one OR per search term, sanitizes input, paginates", async () => {
    const { client, builders } = clientFor([{ data: [{ id: "l1" }], count: 41 }]);
    const page = await createSupabaseRepository(client).queryLeads({
      step_reached: "completed",
      status: "new",
      search: 'Mario  Ro%ss,i()"',
      page: 2,
      pageSize: 10,
    });
    expect(page).toMatchObject({ total: 41, page: 2, pageSize: 10 });
    const calls = builders[0].calls;
    expect(calls.find((c) => c[0] === "select")?.[1]).toEqual(["*", { count: "exact" }]);
    expect(calls.filter((c) => c[0] === "eq").map((c) => c[1])).toEqual([
      ["step_reached", "completed"],
      ["status", "new"],
    ]);
    const ors = calls.filter((c) => c[0] === "or").map((c) => c[1][0] as string);
    // "Mario  Ro%ss,i()\"" -> terms: mario, ro, ss, i
    expect(ors).toHaveLength(4);
    expect(ors[0]).toContain('first_name.ilike."%mario%"');
    for (const o of ors) expect(o).not.toMatch(/[()]|%[^"]*%[^"]*%/); // no injected syntax / wildcards
    expect(calls.find((c) => c[0] === "range")?.[1]).toEqual([10, 19]);
  });

  it("uploadSupplierLogo validates, uploads to the supplier-logos bucket and returns the object path", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const fromBucket = vi.fn().mockReturnValue({ upload });
    const { client } = clientFor([{ data: supplierRow }], { from: fromBucket });
    const repo = createSupabaseRepository(client);
    const path = await repo.uploadSupplierLogo("s1", '<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(path).toMatch(/^s1\/\d+\.svg$/);
    expect(fromBucket).toHaveBeenCalledWith("supplier-logos");
    expect(upload.mock.calls[0][0]).toBe(path);
    expect(upload.mock.calls[0][2]).toMatchObject({ contentType: "image/svg+xml", upsert: false });

    await expect(repo.uploadSupplierLogo("s1", "<svg><script/></svg>")).rejects.toBeInstanceOf(InvalidLogoError);
    expect(upload).toHaveBeenCalledTimes(1);

    const unknown = clientFor([{ data: null }], { from: fromBucket });
    await expect(
      createSupabaseRepository(unknown.client).uploadSupplierLogo("nope", "<svg/>"),
    ).rejects.toBeInstanceOf(SupplierNotFoundError);
  });

  it("settings: single-row upsert, null when empty", async () => {
    const empty = clientFor([{ data: null }]);
    expect(await createSupabaseRepository(empty.client).getSettings()).toEqual({ notification_email: null });
    const upd = clientFor([{ data: { id: true, notification_email: "a@b.it", updated_at: "z" } }]);
    expect(await createSupabaseRepository(upd.client).updateSettings({ notification_email: "a@b.it" })).toEqual({
      notification_email: "a@b.it",
    });
    expect(upd.builders[0].calls.find((c) => c[0] === "upsert")?.[1]).toEqual([{ id: true, notification_email: "a@b.it" }]);
  });
});
