import { describe, expect, it } from "vitest";
import { buildVCard, escapeVCardText, foldVCardLine } from "./vcard";

describe("escapeVCardText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeVCardText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("foldVCardLine", () => {
  it("leaves short lines alone", () => {
    expect(foldVCardLine("FN:x")).toBe("FN:x");
  });
  it("folds long lines to <= 75 octets and unfolds back to the original", () => {
    const line = "PHOTO:" + "A".repeat(300);
    const folded = foldVCardLine(line);
    const physical = folded.split("\r\n");
    for (const p of physical) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(physical.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
  it("never splits a multi-byte character", () => {
    const line = "NOTE:" + "è".repeat(100);
    expect(foldVCardLine(line).replace(/\r\n /g, "")).toBe(line);
  });
});

describe("buildVCard", () => {
  it("builds a CRLF vCard 3.0 with the TEL from settings", () => {
    const v = buildVCard({ phone: "+39 095 0000000" });
    expect(v.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:;VERSUS Comparatore;;;",
      "FN:VERSUS Comparatore",
      "ORG:VERSUS",
      "TEL;TYPE=WORK,VOICE:+39 095 0000000",
      "END:VCARD",
      "",
    ]);
    expect(v).not.toMatch(/(?<!\r)\n/);
  });
  it("omits PHOTO when absent", () => {
    expect(buildVCard({ phone: "1", photoPngBase64: null })).not.toContain("PHOTO");
  });
  it("includes a folded PHOTO when supplied", () => {
    const v = buildVCard({ phone: "1", photoPngBase64: "A".repeat(200) });
    expect(v).toContain("PHOTO;ENCODING=b;TYPE=PNG:");
    expect(v.replace(/\r\n /g, "")).toContain("TYPE=PNG:" + "A".repeat(200));
  });
  it("escapes the phone value", () => {
    expect(buildVCard({ phone: "1;2,3" })).toContain("TEL;TYPE=WORK,VOICE:1\;2\\,3\r\n");
  });
});
