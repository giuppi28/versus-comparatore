import { describe, expect, it } from "vitest";
import { INITIAL_FLOW_STATE, type FlowState } from "@/lib/lead/flow-state";
import {
  DEFAULT_LOADING_MS,
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
