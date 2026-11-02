import { describe, expect, it } from "vitest";
import { COMPANY, companyLines, isComplete, type CompanyData } from "./company";

const FULL: CompanyData = {
  ragioneSociale: "Acme S.r.l.",
  sedeLegale: "Via Roma 1, 95100 Catania",
  email: "info@acme.it",
  partitaIva: "01234567890",
  rea: "CT-123456",
  registroImpreseUfficio: "Catania",
  registroImpreseNumero: "01234567890",
  capitaleVersato: "10.000,00",
  socioUnico: true,
};

describe("company data", () => {
  it("is empty and incomplete today", () => {
    expect(isComplete(COMPANY)).toBe(false);
    expect(companyLines(COMPANY)).toEqual([]);
  });

  it("is complete only with the four required fields", () => {
    const base = { ...COMPANY, ragioneSociale: "A", sedeLegale: "B", email: "c@d.it", partitaIva: "1" };
    expect(isComplete(base)).toBe(true);
    expect(isComplete({ ...base, partitaIva: null })).toBe(false);
    expect(isComplete({ ...base, email: "  " })).toBe(false);
  });

  it("renders only known values", () => {
    expect(companyLines({ ...COMPANY, ragioneSociale: "Acme", partitaIva: "1" })).toEqual(["Acme · P.IVA 1"]);
  });

  it("renders all values including company-only fields", () => {
    expect(companyLines(FULL)).toEqual([
      "Acme S.r.l. · Sede legale Via Roma 1, 95100 Catania · P.IVA 01234567890 · REA CT-123456 · info@acme.it",
      "Registro imprese di Catania n. 01234567890 · Capitale sociale versato € 10.000,00 · Socio unico",
    ]);
  });
});
