import { describe, expect, it } from "vitest";
import { FAQ } from "@/components/page1/faq";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { buildLlmsFullTxt } from "./llms-full";
import { buildLlmsTxt } from "./llms";

const URL = "https://versuscomparatorelucegas.it";
const full = buildLlmsFullTxt(URL, ["Enel Energia"]);

describe("buildLlmsFullTxt", () => {
  it("starts with the llms.txt body and keeps the NAP lines byte-identical", () => {
    const base = buildLlmsTxt(URL, ["Enel Energia"]);
    expect(full.startsWith(base.trimEnd())).toBe(true);
    for (const line of base.split("\n").slice(base.split("\n").indexOf("## Titolare") + 1, base.split("\n").indexOf("## Titolare") + 4)) {
      expect(full).toContain(line);
    }
    expect(full.match(/^# /gm)).toHaveLength(1);
    expect(full).toContain("Ultimo aggiornamento: 2026-11-09");
  });

  it("contains every home FAQ question, guide H1 and guide FAQ question", () => {
    for (const f of FAQ) expect(full).toContain(f.q);
    for (const g of GUIDE_PAGES) {
      expect(full).toContain(`## ${g.h1}`);
      expect(full).toContain(`${URL}${g.path}`);
      expect(full).toContain(`Aggiornata il ${g.reviewedOn}`);
      for (const f of g.faq) expect(full).toContain(f.q);
      for (const s of g.sources) expect(full).toContain(s.url);
    }
  });

  it("has no phone, tel link, logo-only supplier or stringified placeholder", () => {
    for (const bad of ["095 123 4567", "tel:", "+39", "Acea Energia", "E.ON Energia", "Engie", "Hera Comm", "Iberdrola", "Sorgenia", "undefined", "[object Object]"]) {
      expect(full, bad).not.toContain(bad);
    }
    expect(full).not.toMatch(/\bnull\b/);
  });
});
