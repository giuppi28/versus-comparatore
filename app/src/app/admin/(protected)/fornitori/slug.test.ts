import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Enel Energia", "enel-energia"],
    ["E.ON Energia", "e-on-energia"],
    ["  Più   Luce & Gas  ", "piu-luce-e-gas"],
    ["Società Elettrica Città", "societa-elettrica-citta"],
    ["---", ""],
    ["", ""],
    ["Ünïcödé", "unicode"],
  ])("%j -> %j", (input, out) => {
    expect(slugify(input)).toBe(out);
  });

  it("caps the length without a trailing dash", () => {
    const s = slugify(`${"a".repeat(59)} bbbb`);
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });

  it("always matches the slug pattern when non-empty", () => {
    for (const n of ["A2A", "Hera Comm", "Iren", "Società 1/2"]) expect(slugify(n)).toMatch(SLUG_PATTERN);
  });
});
