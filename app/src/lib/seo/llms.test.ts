import { describe, expect, it } from "vitest";
import { ALL_SEO_PAGES } from "./pages";
import { buildLlmsTxt } from "./llms";

const URL = "https://versuscomparatorelucegas.it";

describe("buildLlmsTxt", () => {
  it("has the llms.txt shape and the fixed date", () => {
    const t = buildLlmsTxt(URL, ["Enel Energia"]);
    expect(t.startsWith("# VERSUS")).toBe(true);
    expect(t).toContain("\n> ");
    expect(t).toContain("Ultimo aggiornamento: 2026-11-09");
    expect(t).toContain("- Enel Energia");
    expect(t).toContain("KEHILA S.r.l.s.");
    expect(t).toContain(`${URL}/privacy`);
    expect(t).toContain("IVA esclusa");
    expect(t).toContain("- Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.");
    expect(t).toContain("- VERSUS opera come agente ed è remunerato dai venditori.");
  });

  it("lists the 11 SEO pages under Pagine principali, without prices", () => {
    const t = buildLlmsTxt(URL, null);
    const section = t.slice(t.indexOf("## Pagine principali"), t.indexOf("## Versione estesa"));
    expect(ALL_SEO_PAGES).toHaveLength(11);
    for (const p of ALL_SEO_PAGES) expect(section).toContain(`(${URL}${p.path})`);
    expect(section).not.toMatch(/€|\d,\d{2,4}/);
  });

  it("labels the home link and points to llms-full.txt", () => {
    const t = buildLlmsTxt(URL, null);
    expect(t).toContain(`- [Home: comparatore luce e gas](${URL}/)`);
    expect(t).toContain(`## Versione estesa\n- [llms-full.txt](${URL}/llms-full.txt)`);
  });

  it("omits the supplier section when unavailable or empty", () => {
    expect(buildLlmsTxt(URL, null)).not.toContain("Fornitori con offerte attive");
    expect(buildLlmsTxt(URL, [])).not.toContain("Fornitori con offerte attive");
  });

  it("has no phone number, price or euro sign", () => {
    const t = buildLlmsTxt(URL, ["A2A Energia"]);
    expect(t).not.toMatch(/\+39|\btel|\b0\d{1,3}[ .]\d{3,4}[ .]\d{3,4}\b/i);
    expect(t).not.toContain("€");
  });
});
