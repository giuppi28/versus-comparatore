import { describe, expect, it } from "vitest";
import { isStorageLogoPath, resolveLogoUrl } from "./logo";

const SB = "https://abc.supabase.co";

describe("resolveLogoUrl", () => {
  it("returns null for empty values", () => {
    expect(resolveLogoUrl(null, SB)).toBeNull();
    expect(resolveLogoUrl(undefined, SB)).toBeNull();
    expect(resolveLogoUrl("   ", SB)).toBeNull();
  });

  it("passes through absolute, data and root-relative URLs", () => {
    expect(resolveLogoUrl("https://cdn.example.com/a.svg", SB)).toBe("https://cdn.example.com/a.svg");
    expect(resolveLogoUrl("data:image/svg+xml;base64,AAA", SB)).toBe("data:image/svg+xml;base64,AAA");
    expect(resolveLogoUrl("/logos/enel.svg", SB)).toBe("/logos/enel.svg");
  });

  it("builds the public storage URL for storage paths", () => {
    expect(resolveLogoUrl("sup-1/123.svg", SB)).toBe(
      `${SB}/storage/v1/object/public/supplier-logos/sup-1/123.svg`,
    );
    expect(resolveLogoUrl("sup 1/a b.svg", `${SB}/`)).toBe(
      `${SB}/storage/v1/object/public/supplier-logos/sup%201/a%20b.svg`,
    );
  });

  it("returns null without a Supabase URL for storage paths", () => {
    expect(resolveLogoUrl("sup-1/123.svg", "")).toBeNull();
  });

  it("refuses dangerous schemes and protocol-relative URLs", () => {
    expect(resolveLogoUrl("javascript:alert(1)", SB)).toBeNull();
    expect(resolveLogoUrl("//evil.com/a.svg", SB)).toBeNull();
    expect(resolveLogoUrl("data:text/html;base64,AAA", SB)).toBeNull();
  });
});

describe("isStorageLogoPath", () => {
  it("true only for bucket object paths", () => {
    expect(isStorageLogoPath("11111111-1111-4111-8111-111111111111/1700000000000.svg")).toBe(true);
    for (const p of [null, undefined, "", "  ", "/logos/enel-energia.svg", "https://x.it/a.svg", "data:image/svg+xml;base64,AA", "javascript:alert(1)"]) {
      expect(isStorageLogoPath(p)).toBe(false);
    }
  });
});
