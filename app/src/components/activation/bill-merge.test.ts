import { describe, expect, it } from "vitest";
import {
  billConflicts,
  dropMismatchedTaxCode,
  buildBillDraft,
  EMPTY_BILL_VALUES,
  hasBillValues,
  planBillMerge,
  type BillValues,
} from "./bill-merge";
import type { Supplier } from "@/lib/data/types";

const v = (o: Partial<BillValues> = {}): BillValues => ({ ...EMPTY_BILL_VALUES, ...o });
const sup = (id: string, o: Partial<Supplier> = {}) =>
  ({ id, slug: id, name: id, sells_luce: true, sells_gas: true, show_in_dropdown: true, ...o }) as Supplier;
const avail = { pod: true, pdr: false, supplierLuce: true, supplierGas: false };

describe("buildBillDraft", () => {
  it("keeps only fields present in the flow and maps the supplier slug to its id", () => {
    const d = buildBillDraft(
      { pod: "IT001E12345678", pdr: "12345678901234", taxCode: "RSSMRA85T10A562S", supplierSlug: "edison" },
      [sup("sup-1", { slug: "edison" })],
      avail,
    );
    expect(d).toEqual(v({ pod: "IT001E12345678", taxCode: "RSSMRA85T10A562S", supplierLuce: "sup-1" }));
  });
  it("ignores a supplier that does not sell the commodity or is not in the dropdown", () => {
    expect(buildBillDraft({ supplierSlug: "x" }, [sup("a", { slug: "x", sells_luce: false })], avail).supplierLuce).toBe("");
    expect(buildBillDraft({ supplierSlug: "x" }, [sup("a", { slug: "x", show_in_dropdown: false })], avail).supplierLuce).toBe("");
  });
  it("nothing found -> no values", () => {
    expect(hasBillValues(buildBillDraft({}, [], avail))).toBe(false);
    expect(hasBillValues(buildBillDraft({ pdr: "12345678901234" }, [], avail))).toBe(false);
  });
});

describe("planBillMerge", () => {
  it("fills empty fields without asking", () => {
    const draft = v({ pod: "IT001E12345678", taxCode: "RSSMRA85T10A562S" });
    expect(billConflicts(draft, v())).toEqual([]);
    expect(planBillMerge(draft, v(), {})).toEqual({ pod: "IT001E12345678", taxCode: "RSSMRA85T10A562S" });
  });
  it("a typed different value is a conflict and is kept unless replace is ticked", () => {
    const draft = v({ pod: "IT001E12345678", taxCode: "RSSMRA85T10A562S" });
    const current = v({ pod: "IT002E87654321" });
    expect(billConflicts(draft, current)).toEqual(["pod"]);
    expect(planBillMerge(draft, current, {})).toEqual({ taxCode: "RSSMRA85T10A562S" });
    expect(planBillMerge(draft, current, { pod: true })).toEqual({ pod: "IT001E12345678", taxCode: "RSSMRA85T10A562S" });
  });
  it("same value is neither a conflict nor a write", () => {
    const x = v({ pod: "IT001E12345678" });
    expect(billConflicts(x, x)).toEqual([]);
    expect(planBillMerge(x, x, { pod: true })).toEqual({});
  });
  it("cancel = nothing written (the caller simply does not call the merge)", () => {
    expect(planBillMerge(v(), v({ pod: "IT001E12345678" }), {})).toEqual({});
  });
});

describe("dropMismatchedTaxCode", () => {
  const draft = v({ pod: "IT001E12345678", taxCode: "RSSMRA85T10A562S" });
  it("keeps a codice fiscale that matches the step-A name", () => {
    expect(dropMismatchedTaxCode(draft, { firstName: "Mario", lastName: "Rossi" })).toEqual(draft);
  });
  it("empties it when the bill holder is someone else, keeping the other values", () => {
    expect(dropMismatchedTaxCode(draft, { firstName: "Anna", lastName: "Bianchi" })).toEqual(
      v({ pod: "IT001E12345678" }),
    );
  });
});
