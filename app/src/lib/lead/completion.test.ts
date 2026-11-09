import { describe, expect, it } from "vitest";
import type { DocumentType, LeadData } from "@/lib/data";
import { resolveIdentityDocument } from "./completion";

const TODAY = "2026-11-09";
const MANUAL = {
  document_number: "CA12345AB",
  document_issuer: "  Comune di Milano ",
  document_expiry: "2030-05-31",
} as const;
const TWO_SIDES: DocumentType[] = ["carta_identita", "patente"];

const run = (d: LeadData, count: number) => {
  const data = { ...d };
  return { fields: resolveIdentityDocument(data, count, TODAY), data };
};

describe("resolveIdentityDocument", () => {
  it("a missing type is refused on document_type, whatever photos or manual data", () => {
    expect(run({ ...MANUAL }, 2).fields).toEqual({ document_type: "required" });
    expect(run({ document_type: null, ...MANUAL }, 0).fields).toEqual({ document_type: "required" });
  });

  describe.each(TWO_SIDES)("%s (2 sides)", (type) => {
    it("photos complete: ok, manual values ignored and stored null", () => {
      const r = run({ document_type: type, ...MANUAL }, 2);
      expect(r.fields).toEqual({});
      expect(r.data).toMatchObject({ document_number: null, document_issuer: null, document_expiry: null });
      expect(run({ document_type: type }, 3).fields).toEqual({});
    });
    it("manual complete without photos: ok, values kept (issuer trimmed)", () => {
      const r = run({ document_type: type, ...MANUAL }, 0);
      expect(r.fields).toEqual({});
      expect(r.data).toMatchObject({ ...MANUAL, document_issuer: "Comune di Milano" });
    });
    it("partial photos + manual complete: ok", () => {
      expect(run({ document_type: type, ...MANUAL }, 1).fields).toEqual({});
    });
    it("partial photos + nothing manual: id_document", () => {
      expect(run({ document_type: type }, 1).fields).toEqual({ id_document: "required" });
      expect(run({ document_type: type }, 0).fields).toEqual({ id_document: "required" });
      expect(run({ document_type: type, document_issuer: "  " }, 1).fields).toEqual({ id_document: "required" });
    });
    it("partial photos + incomplete manual: specific codes", () => {
      expect(run({ document_type: type, document_number: "CA12345AB" }, 1).fields).toEqual({
        document_issuer: "required",
        document_expiry: "required",
      });
      expect(run({ document_type: type, document_issuer: "Comune", document_expiry: "2030-01-01" }, 1).fields).toEqual({
        document_number: "required",
      });
    });
  });

  it("passaporto: 1 photo is enough, manual ignored", () => {
    const r = run({ document_type: "passaporto", ...MANUAL }, 1);
    expect(r.fields).toEqual({});
    expect(r.data.document_number).toBeNull();
    expect(run({ document_type: "passaporto" }, 0).fields).toEqual({ id_document: "required" });
    expect(run({ document_type: "passaporto", ...MANUAL }, 0).fields).toEqual({});
  });

  it("expired manual date is past; today is fine", () => {
    expect(run({ document_type: "patente", ...MANUAL, document_expiry: "2026-11-08" }, 0).fields).toEqual({
      document_expiry: "past",
    });
    expect(run({ document_type: "patente", ...MANUAL, document_expiry: TODAY }, 0).fields).toEqual({});
  });

  it("an expired date is ignored when the photo path is complete", () => {
    expect(run({ document_type: "patente", ...MANUAL, document_expiry: "2020-01-01" }, 2).fields).toEqual({});
  });
});
