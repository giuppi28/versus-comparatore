import { describe, expect, it } from "vitest";
import { GUIDE_PAGES } from "./guides";

const NEW = ["/guida/come-scegliere-offerta-luce-gas", "/guida/fine-tutela-mercato-libero"];

describe("guides registry", () => {
  it("has the 6 guides, unique paths, footer labels and the dates", () => {
    expect(GUIDE_PAGES).toHaveLength(6);
    expect(new Set(GUIDE_PAGES.map((g) => g.path)).size).toBe(6);
    for (const g of GUIDE_PAGES) {
      expect(g.footerLabel, g.path).toBeTruthy();
      expect(g.title.endsWith("| VERSUS"), g.path).toBe(true);
      expect(g.title.length, g.path).toBeLessThanOrEqual(60);
      expect(g.description.length, g.path).toBeLessThanOrEqual(160);
      expect(g.publishedOn, g.path).toBe(NEW.includes(g.path) ? "2026-11-07" : "2026-11-05");
      expect(g.reviewedOn, g.path).toBe("2026-11-07");
      expect(g.faq.length, g.path).toBeGreaterThanOrEqual(4);
      expect(g.faq.length, g.path).toBeLessThanOrEqual(6);
      for (const r of g.related) expect(GUIDE_PAGES.some((x) => x.path === r) || r.startsWith("/offerte"), `${g.path} -> ${r}`).toBe(true);
    }
  });

  it("new guides carry the coverage and agent sentences byte-identical and no forbidden wording", () => {
    for (const g of GUIDE_PAGES.filter((x) => NEW.includes(x.path))) {
      const text = JSON.stringify(g);
      expect(text).toContain("Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.");
      expect(text).toContain("VERSUS opera come agente ed è remunerato dai venditori.");
      expect(text).not.toMatch(/chiam|demo|club|\+39|numero verde|migliore/i);
    }
  });
});
