/**
 * The shipped supplier logos (logopack/ + app/public/logos) must be fixed points of the
 * app's own sanitizer and must be wired to the mock suppliers (T5.1).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitize";
import { MOCK_SUPPLIERS } from "../data/mock/data";

const appDir = path.resolve(__dirname, "../../..");
const packDir = path.resolve(appDir, "..", "logopack");
const publicDir = path.join(appDir, "public", "logos");
const publicBlackDir = path.join(publicDir, "black");

const realSlugs = MOCK_SUPPLIERS.filter((s) => !s.is_placeholder).map((s) => s.slug);
// Logos shipped ahead of their supplier rows (added 2026-10-27; created later via admin / migration).
const EXTRA_PACK_SLUGS = ["sentra-energia", "estra-energia", "enegan", "asti-energia"];
const packSlugs = [...realSlugs, ...EXTRA_PACK_SLUGS];
const read = (p: string) => readFileSync(p, "utf8");

describe("logopack", () => {
  it("covers every real supplier and no placeholder", () => {
    expect(realSlugs).toHaveLength(11);
    for (const variant of ["color", "black", "white"]) {
      expect(readdirSync(path.join(packDir, variant)).sort()).toEqual(packSlugs.map((s) => `${s}.svg`).sort());
    }
    const expected = packSlugs.map((s) => `${s}.svg`).sort();
    const svgsIn = (dir: string) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(".svg")).map((e) => e.name).sort();
    expect(svgsIn(publicDir)).toEqual(expected);
    expect(svgsIn(publicBlackDir)).toEqual(expected);
  });

  for (const slug of packSlugs) {
    for (const variant of ["color", "black", "white"]) {
      it(`${variant}/${slug}.svg is unchanged by the sanitizer and self-contained`, () => {
        const svg = read(path.join(packDir, variant, `${slug}.svg`));
        const out = sanitizeSvg(svg);
        expect(out.svg).toBe(svg);
        expect(out.removed).toEqual([]);
        expect(svg).toMatch(/viewBox="[-\d. ]+"/);
        expect(svg).not.toMatch(/<image|<script|<style[^>]*>[^<]*@import|https?:\/\/(?!www\.w3\.org)/);
      });
    }

    it(`public/logos/${slug}.svg is the color variant`, () => {
      expect(read(path.join(publicDir, `${slug}.svg`))).toBe(read(path.join(packDir, "color", `${slug}.svg`)));
    });

    it(`public/logos/black/${slug}.svg is byte-identical to logopack/black and sanitizer-stable`, () => {
      const file = path.join(publicBlackDir, `${slug}.svg`);
      expect(readFileSync(file).equals(readFileSync(path.join(packDir, "black", `${slug}.svg`)))).toBe(true);
      const svg = read(file);
      const out = sanitizeSvg(svg);
      expect(out.svg).toBe(svg);
      expect(out.removed).toEqual([]);
      expect(svg).toMatch(/viewBox="[-\d. ]+"/);
      expect(svg).not.toMatch(/<image|<script|<style[^>]*>[^<]*@import|https?:\/\/(?!www\.w3\.org)/);
    });
  }

  it("monochrome variants contain only black/white paint", () => {
    for (const [variant, hex] of [["black", "#000000"], ["white", "#ffffff"]] as const) {
      for (const slug of packSlugs) {
        const svg = read(path.join(packDir, variant, `${slug}.svg`)).toLowerCase();
        const colors = [...svg.matchAll(/(?:fill|stroke|stop-color)(?:="|:)\s*(#[0-9a-f]{3,8})\b/g)].map((m) => m[1]);
        for (const c of colors) expect([hex, "#fff", "#ffffff"]).toContain(c);
      }
    }
  });

  it("mock suppliers point at the shipped files; placeholders have no logo", () => {
    for (const s of MOCK_SUPPLIERS) {
      if (s.is_placeholder) expect(s.logo_path).toBeNull();
      else {
        expect(s.logo_path).toBe(`/logos/${s.slug}.svg`);
        expect(existsSync(path.join(appDir, "public", s.logo_path!))).toBe(true);
      }
    }
  });
});
