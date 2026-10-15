import { describe, expect, it } from "vitest";
import { MOCK_OFFERS, MOCK_SUPPLIERS } from "@/lib/data";
import type { OfferWithSupplier } from "@/lib/data/types";
import { INITIAL_FLOW_STATE, type FlowState } from "@/lib/lead/flow-state";
import {
  DEFAULT_LOADING_MS,
  buildLoadingSuppliers,
  buildOrbitSuppliers,
  FAST_LOADING_MS,
  currentSupplierFor,
  currentSupplierIds,
  isPageOneIncomplete,
  loadingSignature,
  parseMonthlyConsumption,
  resolveLoadingMs,
  stepsFor,
  toCents,
} from "./results-logic";

const base = (patch: Partial<FlowState> = {}): FlowState => ({ ...INITIAL_FLOW_STATE, ...patch });

describe("stepsFor", () => {
  it("maps the commodity to the ordered steps", () => {
    expect(stepsFor(base({ commodity: "luce" }))).toEqual(["luce"]);
    expect(stepsFor(base({ commodity: "gas" }))).toEqual(["gas"]);
    expect(stepsFor(base({ commodity: "dual" }))).toEqual(["luce", "gas"]);
    expect(stepsFor(base())).toEqual([]);
  });
});

describe("isPageOneIncomplete", () => {
  it("is incomplete without commodity / customer type / consumption", () => {
    expect(isPageOneIncomplete(base())).toBe(true);
    expect(isPageOneIncomplete(base({ commodity: "luce" }))).toBe(true);
    expect(isPageOneIncomplete(base({ commodity: "luce", customerType: "casa" }))).toBe(true);
  });
  it("is complete with the annual estimate of every commodity", () => {
    expect(isPageOneIncomplete(base({ commodity: "luce", customerType: "casa", estimatedKwhYear: 2700 }))).toBe(false);
    expect(isPageOneIncomplete(base({ commodity: "gas", customerType: "casa", estimatedSmcYear: 700 }))).toBe(false);
    expect(
      isPageOneIncomplete(base({ commodity: "dual", customerType: "casa", estimatedKwhYear: 2700 })),
    ).toBe(true);
    expect(
      isPageOneIncomplete(
        base({ commodity: "dual", customerType: "business", manualConsumption: true, manualKwhYear: 9000, manualSmcYear: 4000 }),
      ),
    ).toBe(false);
  });
  it("rejects zero / negative consumption", () => {
    expect(isPageOneIncomplete(base({ commodity: "luce", customerType: "casa", estimatedKwhYear: 0 }))).toBe(true);
  });
});

describe("currentSupplierFor", () => {
  const dual = base({
    commodity: "dual",
    serviceType: "cambio_fornitore",
    currentSupplierLuce: "edison-energia",
    currentSupplierGas: "eni-plenitude",
  });
  it("returns the supplier per commodity for Cambio fornitore / Voltura", () => {
    expect(currentSupplierFor(dual, "luce")).toBe("edison-energia");
    expect(currentSupplierFor(dual, "gas")).toBe("eni-plenitude");
    expect(currentSupplierFor({ ...dual, serviceType: "voltura" }, "luce")).toBe("edison-energia");
    expect(currentSupplierIds(dual)).toEqual(["edison-energia", "eni-plenitude"]);
  });
  it("ignores stale suppliers for other service types", () => {
    expect(currentSupplierFor({ ...dual, serviceType: "subentro" }, "luce")).toBeNull();
    expect(currentSupplierFor({ ...dual, serviceType: "primo_allaccio" }, "luce")).toBeNull();
  });
  it("gas without an existing gas contract is Primo allaccio: no gas supplier", () => {
    expect(currentSupplierFor({ ...dual, hasGas: false }, "gas")).toBeNull();
    expect(currentSupplierFor({ ...dual, hasGas: false }, "luce")).toBe("edison-energia");
  });
});

describe("parseMonthlyConsumption", () => {
  it("accepts whole numbers from 1 to 1,000,000", () => {
    expect(parseMonthlyConsumption("250")).toBe(250);
    expect(parseMonthlyConsumption(" 1 ")).toBe(1);
    expect(parseMonthlyConsumption("1.000")).toBe(1000);
    expect(parseMonthlyConsumption("1000000")).toBe(1_000_000);
  });
  it("rejects everything else", () => {
    for (const raw of ["", "0", "-5", "abc", "12,5", "1000001", "12345678", "1e3"]) {
      expect(parseMonthlyConsumption(raw)).toBeNull();
    }
  });
});

describe("resolveLoadingMs", () => {
  it("defaults to 4 s, honours ?fast=1 and the env override", () => {
    expect(resolveLoadingMs({})).toBe(DEFAULT_LOADING_MS);
    expect(resolveLoadingMs({ fast: "1" })).toBe(FAST_LOADING_MS);
    expect(resolveLoadingMs({ fast: "0" })).toBe(DEFAULT_LOADING_MS);
    expect(resolveLoadingMs({ envMs: "1500" })).toBe(1500);
    expect(resolveLoadingMs({ envMs: "0" })).toBe(0);
    expect(resolveLoadingMs({ envMs: "nope" })).toBe(DEFAULT_LOADING_MS);
    expect(resolveLoadingMs({ envMs: "-3" })).toBe(DEFAULT_LOADING_MS);
    expect(resolveLoadingMs({ fast: "1", envMs: "9000" })).toBe(FAST_LOADING_MS);
  });
});

describe("loadingSignature", () => {
  const s = base({ commodity: "luce", customerType: "casa", estimatedKwhYear: 2700 });
  it("is stable for the same comparison and changes with Page 1 inputs", () => {
    expect(loadingSignature(s)).toBe(loadingSignature({ ...s, firstName: "Mario" }));
    expect(loadingSignature(s)).not.toBe(loadingSignature({ ...s, estimatedKwhYear: 3000 }));
    expect(loadingSignature(s)).not.toBe(loadingSignature({ ...s, customerType: "business" }));
  });
});

describe("toCents", () => {
  it("rounds to cents", () => {
    expect(toCents(54.5)).toBe(5450);
    expect(toCents(54.504)).toBe(5450);
    expect(toCents(54.506)).toBe(5451);
  });
});

describe("buildOrbitSuppliers", () => {
  const withSupplier = (o: (typeof MOCK_OFFERS)[number]): OfferWithSupplier => ({
    ...o,
    supplier: MOCK_SUPPLIERS.find((s) => s.id === o.supplier_id)!,
  });
  const real = MOCK_OFFERS.filter((o) => o.commodity === "luce").map(withSupplier);
  const placeholder = MOCK_SUPPLIERS.find((s) => s.is_placeholder)!;
  const fakeOffer: OfferWithSupplier = { ...real[0], id: "x-placeholder", supplier_id: placeholder.id, supplier: placeholder };

  it("excludes placeholder suppliers and de-duplicates the rest", () => {
    const list = buildOrbitSuppliers({ luce: [...real, fakeOffer], gas: [] }, ["luce", "gas"], () => null);
    expect(list.map((s) => s.id)).not.toContain(placeholder.id);
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
    expect(list.every((s) => MOCK_SUPPLIERS.find((m) => m.id === s.id)?.is_placeholder === false)).toBe(true);
  });

  it("only looks at the requested steps and tolerates missing offers", () => {
    expect(buildOrbitSuppliers({ luce: real }, ["gas"], () => null)).toEqual([]);
    expect(buildOrbitSuppliers(null, ["luce"], () => null)).toEqual([]);
  });

  it("uses the logo resolver", () => {
    const [first] = buildOrbitSuppliers({ luce: real }, ["luce"], () => "/x.svg");
    expect(first.logoUrl).toBe("/x.svg");
  });
});

describe("buildLoadingSuppliers", () => {
  const logoSrc = (s: { logo_path: string | null }) => s.logo_path;
  const realWithLogo = MOCK_SUPPLIERS.filter((s) => s.active && !s.is_placeholder && s.logo_path);

  it("lists every active real supplier with a logo, regardless of offers", () => {
    const list = buildLoadingSuppliers(MOCK_SUPPLIERS, [], logoSrc);
    expect(list.map((s) => s.id)).toEqual(realWithLogo.map((s) => s.id));
    expect(list.length).toBeGreaterThan(3);
  });

  it("drops placeholders", () => {
    const placeholders = MOCK_SUPPLIERS.filter((s) => s.is_placeholder);
    expect(placeholders.length).toBeGreaterThan(0);
    // even with a logo they stay out
    const withLogo = placeholders.map((s) => ({ ...s, logo_path: "/x.svg" }));
    const ids = buildLoadingSuppliers([...MOCK_SUPPLIERS, ...withLogo], [], logoSrc).map((s) => s.id);
    for (const p of placeholders) expect(ids).not.toContain(p.id);
  });

  it("drops inactive suppliers and suppliers without a logo", () => {
    const [a, b, c] = realWithLogo;
    const list = buildLoadingSuppliers(
      [{ ...a, active: false }, { ...b, logo_path: null }, c],
      [],
      logoSrc,
    );
    expect(list.map((s) => s.id)).toEqual([c.id]);
  });

  it("excludes the current supplier(s): one for luce, both for luce+gas", () => {
    const [a, b, c] = realWithLogo;
    expect(buildLoadingSuppliers(MOCK_SUPPLIERS, [a.id], logoSrc).map((s) => s.id)).not.toContain(a.id);
    const both = buildLoadingSuppliers(MOCK_SUPPLIERS, [a.id, b.id], logoSrc).map((s) => s.id);
    expect(both).not.toContain(a.id);
    expect(both).not.toContain(b.id);
    expect(both).toContain(c.id);
    expect(both).toHaveLength(realWithLogo.length - 2);
  });

  it("has no duplicates and tolerates null input", () => {
    const [a] = realWithLogo;
    const list = buildLoadingSuppliers([a, a, a], [], logoSrc);
    expect(list).toHaveLength(1);
    expect(buildLoadingSuppliers(null, [], logoSrc)).toEqual([]);
  });

  it("uses the logo resolver output", () => {
    const [first] = buildLoadingSuppliers(MOCK_SUPPLIERS, [], () => "/y.svg");
    expect(first.logoUrl).toBe("/y.svg");
  });
});
