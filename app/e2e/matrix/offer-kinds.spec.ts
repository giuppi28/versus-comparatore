/**
 * Phase 14 offer kinds through the whole customer flow (Page 1 -> results -> modal -> activation ->
 * thank-you -> admin lead), against Aldo's 42 offers:
 *   - variable luce offers ("Varia con il PUN", no lock, total cost not computable, cost saved as null),
 *   - IBAN-required offers (notice on card and modal, IBAN mandatory on step B, stored on the lead),
 *   - forced-featured offers per audience (business luce: Sentra + Enel, business gas: Sentra + Enegan),
 *     including the exclusion of a forced offer's supplier,
 *   - dual comparisons mixing the kinds (any variable offer => total "Varia con il PUN").
 * The generic matrix (flow-matrix.spec.ts) rotates through the offer positions; these cases pin the
 * specific offers so every kind is always covered on desktop and mobile.
 */
import { MOCK_OFFERS } from "../../src/lib/data/mock/data";
import type { MatrixCase } from "./cases";
import { MATRIX } from "./cases";
import { runCase } from "./flow";
import { expect, test } from "./fixtures";

function offerId(commodity: "luce" | "gas", customer: "casa" | "business", supplier: string, price: number, name?: string): string {
  const hit = MOCK_OFFERS.filter(
    (o) =>
      o.commodity === commodity &&
      o.customer_type === customer &&
      o.supplier_id === supplier &&
      o.energy_price === price &&
      (!name || o.name === name),
  );
  if (hit.length !== 1) throw new Error(`offer ${commodity}/${customer}/${supplier}/${price}/${name ?? ""}: ${hit.length} matches`);
  return hit[0].id;
}

const find = (pred: (c: MatrixCase) => boolean) => {
  const c = MATRIX.find(pred);
  if (!c) throw new Error("matrix base case not found");
  return c;
};

const luceCasa = find((c) => c.commodity === "luce" && c.customer === "casa" && c.service === "cambio_fornitore" && !c.manual);
const luceBiz = find((c) => c.commodity === "luce" && c.customer === "business" && c.service === "cambio_fornitore");
const gasCasa = find((c) => c.commodity === "gas" && c.customer === "casa" && c.service === "cambio_fornitore" && c.hasGas === true && !c.manual);
const gasBiz = find((c) => c.commodity === "gas" && c.customer === "business" && c.service === "cambio_fornitore");
const dualCasa = find((c) => c.commodity === "dual" && c.customer === "casa" && c.service === "cambio_fornitore" && c.hasGas === true && !c.manual);
const dualBiz = find((c) => c.commodity === "dual" && c.customer === "business" && c.service === "cambio_fornitore");

const IREN_FISSO_IBAN = offerId("luce", "casa", "iren", 0.13);
const IREN_VARIABILE = offerId("luce", "casa", "iren", 0.01);
const ENI_TREND_VARIABILE_IBAN = offerId("luce", "casa", "eni-plenitude", 0.02);
const SENTRA_ANNO_SICURO = offerId("luce", "casa", "sentra-energia", 0.11);
const SENTRA_LUCE_BIZ = offerId("luce", "business", "sentra-energia", 0.13);
const ENEL_LUCE_BIZ = offerId("luce", "business", "enel-energia", 0.14);
const ASTI_LUCE_BIZ = offerId("luce", "business", "asti-energia", 0.16);
const IREN_GAS_IBAN = offerId("gas", "casa", "iren", 0.34);
const ENI_TREND_GAS_IBAN = offerId("gas", "casa", "eni-plenitude", 0.36);
const SENTRA_GAS_CASA = offerId("gas", "casa", "sentra-energia", 0.34);
const SENTRA_GAS_BIZ = offerId("gas", "business", "sentra-energia", 0.39);
const ENEGAN_GAS_BIZ = offerId("gas", "business", "enegan", 0.4);
const ASTI_GAS_BIZ = offerId("gas", "business", "asti-energia", 0.7);

interface Kind {
  label: string;
  base: MatrixCase;
  over: Partial<MatrixCase>;
}

const KINDS: Kind[] = [
  // ---- luce casa ----
  { label: "luce casa | fixed, cheapest (badge, no IBAN)", base: luceCasa, over: { pickLuceId: SENTRA_ANNO_SICURO } },
  { label: "luce casa | fixed + IBAN required", base: luceCasa, over: { pickLuceId: IREN_FISSO_IBAN } },
  { label: "luce casa | variable (Iren)", base: luceCasa, over: { pickLuceId: IREN_VARIABILE } },
  { label: "luce casa | variable + IBAN required (Eni Trend)", base: luceCasa, over: { pickLuceId: ENI_TREND_VARIABILE_IBAN } },
  {
    label: "luce casa | current supplier Eni Plenitude: its variable IBAN offer is not offered, Iren variable still is",
    base: luceCasa,
    over: { supplierLuce: "eni-plenitude", pickLuceId: IREN_VARIABILE },
  },
  // ---- luce business ----
  { label: "luce business | forced Sentra", base: luceBiz, over: { pickLuceId: SENTRA_LUCE_BIZ } },
  { label: "luce business | forced Enel", base: luceBiz, over: { pickLuceId: ENEL_LUCE_BIZ } },
  { label: "luce business | not forced (Asti)", base: luceBiz, over: { pickLuceId: ASTI_LUCE_BIZ } },
  {
    label: "luce business | current supplier Sentra (forced offer excluded): Enel stays the only forced one",
    base: luceBiz,
    over: { supplierLuce: "sentra-energia", pickLuceId: ENEL_LUCE_BIZ },
  },
  // ---- gas casa ----
  { label: "gas casa | fixed + IBAN required (Iren)", base: gasCasa, over: { pickGasId: IREN_GAS_IBAN } },
  { label: "gas casa | fixed + IBAN required (Eni Trend)", base: gasCasa, over: { supplierGas: "iren", pickGasId: ENI_TREND_GAS_IBAN } },
  { label: "gas casa | fixed, no IBAN (Sentra)", base: gasCasa, over: { pickGasId: SENTRA_GAS_CASA } },
  // ---- gas business ----
  { label: "gas business | forced Sentra", base: gasBiz, over: { pickGasId: SENTRA_GAS_BIZ } },
  { label: "gas business | forced Enegan", base: gasBiz, over: { pickGasId: ENEGAN_GAS_BIZ } },
  {
    label: "gas business | current supplier Enegan (forced offer excluded): Sentra stays the only forced one",
    base: gasBiz,
    over: { supplierGas: "enegan", pickGasId: SENTRA_GAS_BIZ },
  },
  { label: "gas business | not forced (Asti)", base: gasBiz, over: { pickGasId: ASTI_GAS_BIZ } },
  // ---- luce + gas ----
  {
    label: "dual casa | luce variable + gas IBAN required: total 'Varia con il PUN'",
    base: dualCasa,
    over: { pickLuceId: IREN_VARIABILE, pickGasId: IREN_GAS_IBAN },
  },
  {
    label: "dual casa | luce variable + IBAN required, gas fixed",
    base: dualCasa,
    over: { pickLuceId: ENI_TREND_VARIABILE_IBAN, pickGasId: SENTRA_GAS_CASA, supplierLuce: "edison-energia", supplierGas: "iren" },
  },
  {
    label: "dual casa | both fixed, only luce needs IBAN",
    base: dualCasa,
    over: { pickLuceId: IREN_FISSO_IBAN, pickGasId: SENTRA_GAS_CASA, supplierGas: "iren" },
  },
  {
    label: "dual business | forced luce + forced gas",
    base: dualBiz,
    over: { pickLuceId: SENTRA_LUCE_BIZ, pickGasId: ENEGAN_GAS_BIZ, supplierLuce: "edison-energia", supplierGas: "eni-plenitude" },
  },
];

test.describe("offer kinds: variable, IBAN-required, forced-featured", () => {
  for (const k of KINDS) {
    const c: MatrixCase = { ...k.base, ...k.over, id: k.label, mobile: true };
    test(k.label, { tag: "@mobile" }, async ({ page, admin }) => {
      await runCase(page, admin, c);
    });
  }

  test("the kinds really exist in the data (guards against a silently shrunken matrix)", () => {
    const luce = MOCK_OFFERS.filter((o) => o.commodity === "luce");
    expect(luce.filter((o) => o.price_type === "variable")).toHaveLength(2);
    expect(MOCK_OFFERS.filter((o) => o.iban_required)).toHaveLength(4);
    expect(MOCK_OFFERS.filter((o) => o.featured_audience === "business")).toHaveLength(4);
    expect(MOCK_OFFERS).toHaveLength(42);
  });
});
