import { describe, expect, it } from "vitest";
import { MOCK_SUPPLIERS } from "@/lib/data/mock/data";
import { parseBillText } from "./parse";

const suppliers = MOCK_SUPPLIERS.map((s) => ({
  slug: s.slug,
  name: s.name,
  is_placeholder: s.is_placeholder,
}));

const LUCE_BILL = `
Fattura n. 2026/0012345 del 12/09/2026
Enel Energia S.p.A. - Mercato libero
Intestatario: ROSSI MARIO
Codice fiscale: RSSMRA85T10A562S
Indirizzo di fornitura: Via Roma 10, 20100 Milano (MI)
Codice POD: IT001E12345678
Potenza impegnata 3 kW  Consumo annuo stimato 2.700 kWh
Numero cliente 1234567890 Codice offerta E-LIGHT
P.IVA Enel Energia 15844561009
Distributore: e-distribuzione S.p.A.
IBAN IT60X0542811101000000123456
Enel Energia, il tuo fornitore di energia.
`;

const GAS_BILL = `
BOLLETTA GAS NATURALE
Eni Plenitude S.p.A. Societa Benefit
Cliente: BIANCHI GIOVANNI  C.F. BNCGNN70A01H501R
Punto di riconsegna (PDR): 00881234567890
Matricola contatore 12345678901234
Consumo annuo 1.200 Smc
Plenitude ti ringrazia.
`;

const DUAL_BILL = `
Edison Energia - Offerta Luce e Gas
Titolare del contratto VERDI LUIGI
codice fiscale VRDLGU80A41F839W
Fornitura LUCE
POD  IT 002 E 87654321
Fornitura GAS
Codice PDR 14 02345678901234
Edison Energia - assistenza clienti
Edison trasparenza
`;

describe("parseBillText", () => {
  it("reads a luce bill", () => {
    expect(parseBillText(LUCE_BILL, suppliers)).toEqual({
      pod: "IT001E12345678",
      taxCode: "RSSMRA85T10A562S",
      supplierSlug: "enel-energia",
    });
  });

  it("reads a gas bill, preferring the labelled PDR over other 14-digit numbers", () => {
    expect(parseBillText(GAS_BILL, suppliers)).toEqual({
      pdr: "00881234567890",
      taxCode: "BNCGNN70A01H501R",
      supplierSlug: "eni-plenitude",
    });
  });

  it("reads a dual bill with spaced POD and a spaced label", () => {
    const parsed = parseBillText(DUAL_BILL, suppliers);
    expect(parsed.pod).toBe("IT002E87654321");
    expect(parsed.pdr).toBe("02345678901234");
    expect(parsed.taxCode).toBe("VRDLGU80A41F839W");
    expect(parsed.supplierSlug).toBe("edison-energia");
  });

  it("normalises a lowercase POD with separators", () => {
    expect(parseBillText("pod: it-001-e-12345678", suppliers).pod).toBe("IT001E12345678");
  });

  it("does not accept a POD with extra digits", () => {
    expect(parseBillText("IT001E123456789", suppliers).pod).toBeUndefined();
  });

  it("uses an unlabelled 14-digit number only when it is the only one", () => {
    expect(parseBillText("Codice 12345678901234 fine", suppliers).pdr).toBe("12345678901234");
    expect(parseBillText("12345678901234 e 22345678901234", suppliers).pdr).toBeUndefined();
  });

  it("does not take digits of an IBAN or longer numbers as PDR", () => {
    const text = "IBAN IT60X0542811101000000123456 Fattura 123456789012345678";
    expect(parseBillText(text, suppliers).pdr).toBeUndefined();
  });

  it("prefers the customer codice fiscale next to its label", () => {
    const text = `Fornitore C.F. BNCGNN70A01H501R
      Cliente Codice fiscale: RSSMRA85T10A562S`;
    expect(parseBillText(text, suppliers).taxCode).toBe("BNCGNN70A01H501R");
    const labelled = `MRTMTT91D08F205J nota
      Codice fiscale RSSMRA85T10A562S`;
    expect(parseBillText(labelled, suppliers).taxCode).toBe("RSSMRA85T10A562S");
  });

  it("ignores 16-char codes with a wrong checksum", () => {
    expect(parseBillText("Codice fiscale RSSMRA85T10A562X", suppliers).taxCode).toBeUndefined();
  });

  it("accepts a P.IVA-only bill without inventing a codice fiscale", () => {
    expect(parseBillText("Codice fiscale 12345678901 P.IVA 12345678901", suppliers)).toEqual({});
  });

  it("maps supplier aliases to slugs", () => {
    expect(parseBillText("Plenitude S.p.A.", suppliers).supplierSlug).toBe("eni-plenitude");
    expect(parseBillText("Aenergy S.p.A. Mercato libero", suppliers).supplierSlug).toBe("asti-energia");
    expect(parseBillText("Asti Energy", suppliers).supplierSlug).toBe("asti-energia");
    expect(parseBillText("E.ON Energia S.p.A.", suppliers).supplierSlug).toBe("eon-energia");
    expect(parseBillText("SENTRA ENERGIA SRL", suppliers).supplierSlug).toBe("sentra-energia");
    expect(parseBillText("Estra Energia", suppliers).supplierSlug).toBe("estra-energia");
    expect(parseBillText("ENEGAN S.p.A.", suppliers).supplierSlug).toBe("enegan");
  });

  it("picks the most frequent supplier, then the first one", () => {
    const frequent = "Il distributore Acea. Enel Energia fattura. Enel Energia assistenza.";
    expect(parseBillText(frequent, suppliers).supplierSlug).toBe("enel-energia");
    expect(parseBillText("Sorgenia e Engie", suppliers).supplierSlug).toBe("sorgenia");
  });

  it("matches whole words only", () => {
    expect(parseBillText("Irene Heracles Acealia", suppliers).supplierSlug).toBeUndefined();
  });

  it("ignores placeholder suppliers", () => {
    const text = "Servizio di Tutela - Altro fornitore - Non lo so";
    expect(parseBillText(text, suppliers).supplierSlug).toBeUndefined();
    const withPlaceholder = [{ slug: "x-test", name: "Fornitore Prova", is_placeholder: true }];
    expect(parseBillText("Fornitore Prova", withPlaceholder)).toEqual({});
  });

  it("returns {} for noise and empty text", () => {
    expect(parseBillText("", suppliers)).toEqual({});
    expect(parseBillText("Lorem ipsum 2026 totale da pagare 123,45 euro", suppliers)).toEqual({});
  });

  it("does not throw on non-string input", () => {
    expect(parseBillText(undefined as unknown as string, suppliers)).toEqual({});
  });
});
