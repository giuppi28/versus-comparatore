import { describe, expect, it } from "vitest";
import {
  CODICE_FISCALE_MESSAGES,
  PARTITA_IVA_MESSAGES,
  PDR_MESSAGES,
  PHONE_MESSAGES,
  POD_MESSAGES,
  nameCode,
  normalizeCodiceFiscale,
  normalizePartitaIva,
  normalizePod,
  surnameCode,
  validateCodiceFiscale,
  validatePartitaIva,
  validatePdr,
  validatePhone,
  validatePod,
  ok,
  fail,
} from "./index";

describe("result helpers", () => {
  it("builds ok/fail results", () => {
    expect(ok("x")).toEqual({ ok: true, value: "x" });
    expect(fail("e")).toEqual({ ok: false, error: "e" });
  });
});

describe("surnameCode / nameCode (official algorithm)", () => {
  it("surname: consonants, then vowels, then X", () => {
    expect(surnameCode("Rossi")).toBe("RSS");
    expect(surnameCode("Bianchi")).toBe("BNC");
    expect(surnameCode("Fo")).toBe("FOX");
    expect(surnameCode("Ai")).toBe("AIX");
    expect(surnameCode("Verdi")).toBe("VRD");
  });
  it("surname ignores accents, apostrophes, spaces", () => {
    expect(surnameCode("D'Angelo")).toBe("DNG");
    expect(surnameCode("De Luca")).toBe("DLC");
    expect(surnameCode("Pérez")).toBe("PRZ");
  });
  it("name with 3 or fewer consonants uses consonants then vowels", () => {
    expect(nameCode("Mario")).toBe("MRA");
    expect(nameCode("Luigi")).toBe("LGU");
    expect(nameCode("Li")).toBe("LIX");
    expect(nameCode("Gianni")).toBe("GNN");
  });
  it("name with 4+ consonants takes 1st, 3rd, 4th", () => {
    expect(nameCode("Cristian")).toBe("CST");
    expect(nameCode("Matteo")).toBe("MTT");
    expect(nameCode("Gianfranco")).toBe("GFR");
  });
  it("empty input pads with X", () => {
    expect(surnameCode("")).toBe("XXX");
  });
});

describe("validateCodiceFiscale", () => {
  const valid = [
    "RSSMRA85T10A562S",
    "MRTMTT91D08F205J",
    "BNCGNN70A01H501R",
    "VRDLGU80A41F839W", // female: day + 40
    "BNCCST80A01H501N", // name with 4+ consonants
    "FOXLIX75C15Z404H", // short surname/name padded with X
  ];
  it.each(valid)("accepts %s", (cf) => {
    expect(validateCodiceFiscale(cf)).toEqual({ ok: true, value: cf });
  });

  it("normalises case and whitespace", () => {
    expect(normalizeCodiceFiscale(" rssmra85t10a562s ")).toBe("RSSMRA85T10A562S");
    expect(validateCodiceFiscale(" rssmra 85t10 a562s ")).toEqual({
      ok: true,
      value: "RSSMRA85T10A562S",
    });
  });

  it("accepts omocodia (single, double, full)", () => {
    expect(validateCodiceFiscale("RSSMRA85T10A56NH").ok).toBe(true);
    expect(validateCodiceFiscale("RSSMRA85T10A5SNT").ok).toBe(true);
    expect(validateCodiceFiscale("RSSMRAURTMLARSNL").ok).toBe(true);
  });

  it("empty / length / format errors", () => {
    expect(validateCodiceFiscale("")).toEqual({ ok: false, error: "empty" });
    expect(validateCodiceFiscale("   ")).toEqual({ ok: false, error: "empty" });
    expect(validateCodiceFiscale("RSSMRA85T10A562")).toEqual({ ok: false, error: "length" });
    expect(validateCodiceFiscale("RSSMRA85T10A562SX")).toEqual({ ok: false, error: "length" });
    expect(validateCodiceFiscale("1SSMRA85T10A562S")).toEqual({ ok: false, error: "format" });
    expect(validateCodiceFiscale("RSSMRA85T10A5622")).toEqual({ ok: false, error: "format" });
    expect(validateCodiceFiscale("RSSMRA85T10AX62S")).toEqual({ ok: false, error: "format" }); // X not omocodia
  });

  it("invalid month letter or day range is a format error", () => {
    expect(validateCodiceFiscale("RSSMRA85F10A562S")).toEqual({ ok: false, error: "format" });
    expect(validateCodiceFiscale("RSSMRA85T00A562S")).toEqual({ ok: false, error: "format" });
    expect(validateCodiceFiscale("RSSMRA85T32A562S")).toEqual({ ok: false, error: "format" });
    expect(validateCodiceFiscale("RSSMRA85T40A562S")).toEqual({ ok: false, error: "format" });
    expect(validateCodiceFiscale("RSSMRA85T72A562S")).toEqual({ ok: false, error: "format" });
  });

  it("wrong check character", () => {
    expect(validateCodiceFiscale("RSSMRA85T10A562T")).toEqual({ ok: false, error: "checksum" });
    expect(validateCodiceFiscale("MRTMTT91D08F205K")).toEqual({ ok: false, error: "checksum" });
  });

  it("consistency with surname and name", () => {
    expect(validateCodiceFiscale("RSSMRA85T10A562S", { firstName: "Mario", lastName: "Rossi" }).ok).toBe(true);
    expect(validateCodiceFiscale("BNCCST80A01H501N", { firstName: "Cristian", lastName: "Bianchi" }).ok).toBe(true);
    expect(validateCodiceFiscale("RSSMRA85T10A562S", { firstName: "Mario", lastName: "Bianchi" })).toEqual({
      ok: false,
      error: "surname_mismatch",
    });
    expect(validateCodiceFiscale("RSSMRA85T10A562S", { firstName: "Luigi", lastName: "Rossi" })).toEqual({
      ok: false,
      error: "name_mismatch",
    });
  });

  it("names are optional / blank names skip the consistency check", () => {
    expect(validateCodiceFiscale("RSSMRA85T10A562S", { firstName: null, lastName: "" }).ok).toBe(true);
    expect(validateCodiceFiscale("RSSMRA85T10A562S", { firstName: undefined }).ok).toBe(true);
  });

  it("has an Italian message for every error code", () => {
    for (const code of ["empty", "length", "format", "checksum", "surname_mismatch", "name_mismatch"] as const) {
      expect(CODICE_FISCALE_MESSAGES[code].length).toBeGreaterThan(5);
    }
  });
});

describe("validatePartitaIva", () => {
  it.each(["12345678903", "01234567897", "07593560100"])("accepts %s", (v) => {
    expect(validatePartitaIva(v)).toEqual({ ok: true, value: v });
  });
  it("strips spaces and an IT prefix", () => {
    expect(normalizePartitaIva(" it 12345678903 ")).toBe("12345678903");
    expect(validatePartitaIva("IT12345678903")).toEqual({ ok: true, value: "12345678903" });
    expect(validatePartitaIva("123 4567 8903")).toEqual({ ok: true, value: "12345678903" });
  });
  it("rejects bad input", () => {
    expect(validatePartitaIva("")).toEqual({ ok: false, error: "empty" });
    expect(validatePartitaIva("1234567890")).toEqual({ ok: false, error: "length" });
    expect(validatePartitaIva("123456789033")).toEqual({ ok: false, error: "length" });
    expect(validatePartitaIva("1234567890A")).toEqual({ ok: false, error: "format" });
    expect(validatePartitaIva("12345678904")).toEqual({ ok: false, error: "checksum" });
    expect(validatePartitaIva("00000000000")).toEqual({ ok: false, error: "checksum" });
  });
  it("has messages", () => {
    for (const code of ["empty", "length", "format", "checksum"] as const) {
      expect(PARTITA_IVA_MESSAGES[code]).toBeTruthy();
    }
  });
});

describe("validatePod", () => {
  it("accepts 14 chars", () => {
    expect(validatePod("IT001E12345678")).toEqual({ ok: true, value: "IT001E12345678" });
  });
  it("normalises case, spaces and hyphens", () => {
    expect(normalizePod(" it001e-1234 5678 ")).toBe("IT001E12345678");
    expect(validatePod("it001e12345678")).toEqual({ ok: true, value: "IT001E12345678" });
  });
  it("accepts 15 chars and keeps the first 14", () => {
    expect(validatePod("IT001E123456789")).toEqual({ ok: true, value: "IT001E12345678" });
  });
  it("rejects bad input", () => {
    expect(validatePod("")).toEqual({ ok: false, error: "empty" });
    expect(validatePod("XX001E12345678")).toEqual({ ok: false, error: "prefix" });
    expect(validatePod("IT001E1234567")).toEqual({ ok: false, error: "length" });
    expect(validatePod("IT001E1234567890")).toEqual({ ok: false, error: "length" });
    expect(validatePod("IT001E1234567!")).toEqual({ ok: false, error: "format" });
  });
  it("has messages", () => {
    for (const code of ["empty", "prefix", "length", "format"] as const) {
      expect(POD_MESSAGES[code]).toBeTruthy();
    }
  });
});

describe("validatePdr", () => {
  it("accepts 14 digits (spaces/hyphens ignored)", () => {
    expect(validatePdr("12345678901234")).toEqual({ ok: true, value: "12345678901234" });
    expect(validatePdr("1234 5678-901234")).toEqual({ ok: true, value: "12345678901234" });
  });
  it("rejects bad input", () => {
    expect(validatePdr("")).toEqual({ ok: false, error: "empty" });
    expect(validatePdr("1234567890123A")).toEqual({ ok: false, error: "format" });
    expect(validatePdr("1234567890123")).toEqual({ ok: false, error: "length" });
    expect(validatePdr("123456789012345")).toEqual({ ok: false, error: "length" });
  });
  it("has messages", () => {
    for (const code of ["empty", "format", "length"] as const) {
      expect(PDR_MESSAGES[code]).toBeTruthy();
    }
  });
});

describe("validatePhone", () => {
  it.each([
    ["3331234567", "3331234567"],
    ["333 123 4567", "3331234567"],
    ["+39 333 123 4567", "3331234567"],
    ["0039 333 1234567", "3331234567"],
    ["333-123-4567", "3331234567"],
    ["(333) 123.4567", "3331234567"],
    ["320123456", "320123456"], // 9 digits
  ])("accepts %s", (input, expected) => {
    expect(validatePhone(input)).toEqual({ ok: true, value: expected });
  });
  it("rejects bad input", () => {
    expect(validatePhone("")).toEqual({ ok: false, error: "empty" });
    expect(validatePhone(" - ")).toEqual({ ok: false, error: "empty" });
    expect(validatePhone("0212345678")).toEqual({ ok: false, error: "format" }); // landline
    expect(validatePhone("33312345")).toEqual({ ok: false, error: "format" }); // too short
    expect(validatePhone("33312345678")).toEqual({ ok: false, error: "format" }); // too long
    expect(validatePhone("333123456a")).toEqual({ ok: false, error: "format" });
    expect(validatePhone("+44 333 1234567")).toEqual({ ok: false, error: "format" });
  });
  it("has messages", () => {
    expect(PHONE_MESSAGES.empty).toBeTruthy();
    expect(PHONE_MESSAGES.format).toBeTruthy();
  });
});
