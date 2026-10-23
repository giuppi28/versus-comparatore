import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE_LABELS, formatDate, formatFileSize, formatIban } from "./labels";

describe("formatIban", () => {
  it("groups by 4 characters", () => {
    expect(formatIban("IT60X0542811101000000123456")).toBe("IT60 X054 2811 1010 0000 0123 456");
    expect(formatIban("IT60 X054")).toBe("IT60 X054");
    expect(formatIban("AB12")).toBe("AB12");
    expect(formatIban("")).toBe("");
  });
});

describe("formatDate", () => {
  it("formats ISO dates as it-IT without timezone shift", () => {
    expect(formatDate("2031-01-05")).toBe("05/01/2031");
    expect(formatDate("nope")).toBe("—");
  });
});

describe("formatFileSize", () => {
  it("uses B / KB / MB", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });
});

describe("DOCUMENT_TYPE_LABELS", () => {
  it("has the Italian labels", () => {
    expect(DOCUMENT_TYPE_LABELS.carta_identita).toBe("Carta d'identità");
    expect(DOCUMENT_TYPE_LABELS.patente).toBe("Patente");
    expect(DOCUMENT_TYPE_LABELS.passaporto).toBe("Passaporto");
  });
});
