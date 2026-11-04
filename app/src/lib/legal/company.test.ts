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
  const EMPTY: CompanyData = {
    ragioneSociale: null,
    sedeLegale: null,
    email: null,
    partitaIva: null,
    rea: null,
    registroImpreseUfficio: null,
    registroImpreseNumero: null,
    capitaleVersato: null,
    socioUnico: null,
  };

  it("has the real KEHILA data and is complete", () => {
    expect(isComplete(COMPANY)).toBe(true);
    expect(companyLines(COMPANY)).toEqual([
      "KEHILA S.r.l.s. · Sede legale Via Umberto 326 B, 95055 San Pietro Clarenza (CT) · P.IVA 06237360877 · REA CT-481759 · info@versuscomparatorelucegas.it",
      "Registro imprese CCIAA Sud Est Sicilia n. 06237360877 · Capitale sociale versato € 1.500,00 · Socio unico",
    ]);
  });

  it("is empty and incomplete when nothing is known", () => {
    expect(isComplete(EMPTY)).toBe(false);
    expect(companyLines(EMPTY)).toEqual([]);
  });

  it("handles partial registro imprese values", () => {
    expect(companyLines({ ...EMPTY, registroImpreseNumero: "1" })).toEqual(["Registro imprese n. 1"]);
    expect(companyLines({ ...EMPTY, registroImpreseUfficio: "Catania" })).toEqual(["Registro imprese CCIAA Catania"]);
  });

  it("is complete only with the four required fields", () => {
    const base = { ...EMPTY, ragioneSociale: "A", sedeLegale: "B", email: "c@d.it", partitaIva: "1" };
    expect(isComplete(base)).toBe(true);
    expect(isComplete({ ...base, partitaIva: null })).toBe(false);
    expect(isComplete({ ...base, email: "  " })).toBe(false);
  });

  it("renders only known values", () => {
    expect(companyLines({ ...EMPTY, ragioneSociale: "Acme", partitaIva: "1" })).toEqual(["Acme · P.IVA 1"]);
  });

  it("renders all values including company-only fields", () => {
    expect(companyLines(FULL)).toEqual([
      "Acme S.r.l. · Sede legale Via Roma 1, 95100 Catania · P.IVA 01234567890 · REA CT-123456 · info@acme.it",
      "Registro imprese CCIAA Catania n. 01234567890 · Capitale sociale versato € 10.000,00 · Socio unico",
    ]);
  });
});
