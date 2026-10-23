import { describe, expect, it } from "vitest";
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_FILES,
  normalizeIban,
  normalizePdr,
  normalizePod,
  pdrDistributor,
  podDistributor,
  podDistributorComuneWarning,
  POD_MESSAGES,
  PDR_MESSAGES,
  sniffDocumentType,
  validateIban,
  validatePdr,
  validatePod,
} from "./index";

describe("IBAN", () => {
  it("normalizes", () => {
    expect(normalizeIban("it60 x054.2811-1010 0000 0123 456")).toBe("IT60X0542811101000000123456");
  });
  it("accepts valid IBANs", () => {
    expect(validateIban("IT60 X054 2811 1010 0000 0123 456")).toEqual({ ok: true, value: "IT60X0542811101000000123456" });
    expect(validateIban("DE89370400440532013000").ok).toBe(true);
    expect(validateIban("GB82WEST12345698765432").ok).toBe(true);
  });
  it("rejects errors", () => {
    expect(validateIban("")).toEqual({ ok: false, error: "empty" });
    expect(validateIban("IT60X054281110100000012345!")).toEqual({ ok: false, error: "format" });
    expect(validateIban("XX60X0542811101000000123456")).toEqual({ ok: false, error: "country" });
    expect(validateIban("IT60X054281110100000012345")).toEqual({ ok: false, error: "length" });
    expect(validateIban("IT61X0542811101000000123456")).toEqual({ ok: false, error: "checksum" });
  });
});

describe("POD/PDR normalization and cross-detection", () => {
  it("strips dots", () => {
    expect(normalizePod("it001.e1234.5678")).toBe("IT001E12345678");
    expect(normalizePdr("1234.5678 901234")).toBe("12345678901234");
  });
  it("PDR in POD field", () => {
    for (const v of ["12345678901234", "IT12345678901234"]) {
      const r = validatePod(v);
      expect(r).toEqual({ ok: false, error: "looksLikePdr" });
    }
    expect(POD_MESSAGES.looksLikePdr).toBe("Sembra un codice PDR (gas): qui serve il POD della luce, che inizia con IT.");
  });
  it("POD in PDR field", () => {
    expect(validatePdr("IT001E12345678")).toEqual({ ok: false, error: "looksLikePod" });
    expect(PDR_MESSAGES.looksLikePod).toBe("Sembra un codice POD (luce): qui serve il PDR del gas, 14 cifre.");
  });
});

describe("distributors", () => {
  it("recognizes POD distributors", () => {
    expect(podDistributor("it001e12345678")).toEqual({ code: "IT001", name: "e-distribuzione" });
    expect(podDistributor("IT999E12345678")).toBeNull();
  });
  it("PDR table is empty", () => {
    expect(pdrDistributor("00881234567890")).toBeNull();
  });
  it("comune warning", () => {
    const w = "Controlla il POD: il distributore indicato non serve di solito questo comune.";
    expect(podDistributorComuneWarning("IT001E12345678", "058091")).toBe(w);
    expect(podDistributorComuneWarning("IT002E12345678", "058091")).toBeNull();
    expect(podDistributorComuneWarning("IT001E12345678", "015146")).toBe(w);
    expect(podDistributorComuneWarning("IT012E12345678", "015146")).toBeNull();
    expect(podDistributorComuneWarning("IT002E12345678", "001272")).toBe(w);
    expect(podDistributorComuneWarning("IT002E12345678", "058038")).toBeNull();
    expect(podDistributorComuneWarning("IT001E12345678", "001272")).toBeNull();
    expect(podDistributorComuneWarning("IT999E12345678", "058091")).toBeNull();
  });
});

describe("sniffDocumentType", () => {
  it("detects types", () => {
    expect(sniffDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffDocumentType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffDocumentType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(sniffDocumentType(new Uint8Array([]))).toBeNull();
  });
  it("constants", () => {
    expect(DOCUMENT_MAX_BYTES).toBe(4194304);
    expect(DOCUMENT_MAX_FILES).toBe(2);
  });
});
