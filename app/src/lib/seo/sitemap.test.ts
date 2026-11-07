import { describe, expect, it } from "vitest";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { OFFERS_PAGES } from "@/content/seo/offers-pages";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("lists the home with a floored lastModified and the guides with reviewedOn, never the offers pages", async () => {
    const entries = await sitemap();
    expect(entries).toHaveLength(1 + GUIDE_PAGES.length);
    expect(String(entries[0].lastModified) >= "2026-11-07").toBe(true);
    expect(entries.slice(1).map((e) => e.lastModified)).toEqual(GUIDE_PAGES.map((g) => g.reviewedOn));
    for (const p of OFFERS_PAGES) expect(entries.some((e) => e.url.endsWith(p.path))).toBe(false);
  });
});
