import { describe, expect, it } from "vitest";
import type { LeadOfferSnapshot } from "@/lib/data/types";
import { chosenOfferView, currentSupplierLabel, deletedOfferTitle, snapshotPriceLines } from "./snapshot";

const snap = (over: Partial<LeadOfferSnapshot> = {}): LeadOfferSnapshot => ({
  offer_id: "o1",
  supplier_name: "Edison Energia",
  offer_name: "Edison Luce Fissa 12",
  commodity: "luce",
  energy_price: 0.129,
  other_variable_costs: 0.06,
  fixed_fee_monthly: 9,
  other_fixed_costs_monthly: 0,
  locked_months: 12,
  deleted_at: "2026-10-15T10:00:00Z",
  ...over,
});

describe("deletedOfferTitle", () => {
  it("shows supplier and offer", () => {
    expect(deletedOfferTitle(snap())).toBe("Offerta eliminata: Edison Energia — Edison Luce Fissa 12");
  });
  it("copes with a missing supplier name", () => {
    expect(deletedOfferTitle(snap({ supplier_name: null }))).toBe(
      "Offerta eliminata: fornitore sconosciuto — Edison Luce Fissa 12",
    );
  });
});

describe("snapshotPriceLines", () => {
  it("formats luce prices in Italian", () => {
    const lines = snapshotPriceLines(snap());
    expect(lines).toEqual([
      "Prezzo energia: 0,1290\u00a0€/kWh",
      "Altri costi variabili: 0,0600\u00a0€/kWh",
      "Quota fissa: 9,00\u00a0€/mese",
      "Vincolo: 12 mesi",
    ]);
  });
  it("uses Smc for gas, shows other fixed costs and singular month", () => {
    const lines = snapshotPriceLines(
      snap({
        commodity: "gas",
        other_fixed_costs_monthly: 2.5,
        locked_months: 1,
      }),
    );
    expect(lines[0]).toBe("Prezzo energia: 0,1290\u00a0€/Smc");
    expect(lines).toContain("Altri costi fissi: 2,50\u00a0€/mese");
    expect(lines.at(-1)).toBe("Vincolo: 1 mese");
  });
});

describe("currentSupplierLabel", () => {
  it("prefers the live supplier name", () => {
    expect(currentSupplierLabel("Enel", "Vecchio")).toBe("Enel");
  });
  it("marks a deleted supplier", () => {
    expect(currentSupplierLabel(null, "Hera Comm")).toBe("Hera Comm (fornitore eliminato)");
  });
  it("is null when nothing is known", () => {
    expect(currentSupplierLabel(null, null)).toBeNull();
  });
});

describe("chosenOfferView", () => {
  it("live offer wins", () => {
    expect(chosenOfferView({ label: "Edison — X", energy_price: 0.1 }, snap())).toEqual({
      kind: "live",
      label: "Edison — X",
      lines: [],
    });
  });
  it("live offer: IBAN-only and variable show the notice and PUN spread", () => {
    const v = chosenOfferView(
      { label: "Iren — V", energy_price: 0.01, price_type: "variable", iban_required: true },
      null,
    );
    expect(v).toEqual({
      kind: "live",
      label: "Iren — V",
      lines: ["Prezzo energia: PUN + 0,01\u00a0€/kWh", "Pagamento con IBAN obbligatorio"],
    });
  });
  it("snapshot: variable shows PUN + spread without the lock line; IBAN notice", () => {
    const lines = snapshotPriceLines(snap({ price_type: "variable", energy_price: 0.0125, locked_months: 12, iban_required: true }));
    expect(lines[0]).toBe("Prezzo energia: PUN + 0,0125\u00a0€/kWh");
    expect(lines.some((l) => l.startsWith("Vincolo"))).toBe(false);
    expect(lines.at(-1)).toBe("Pagamento con IBAN obbligatorio");
  });
  it("falls back to the snapshot when the offer is gone", () => {
    const v = chosenOfferView(null, snap());
    expect(v).toMatchObject({
      kind: "deleted",
      title: "Offerta eliminata: Edison Energia — Edison Luce Fissa 12",
    });
  });
  it("is empty without offer and snapshot, and flags a dangling id", () => {
    expect(chosenOfferView(null, null)).toEqual({ kind: "none" });
    expect(chosenOfferView(null, null, true)).toEqual({
      kind: "live",
      label: "Offerta non più disponibile",
      lines: [],
    });
  });
});
