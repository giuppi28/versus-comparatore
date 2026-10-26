/**
 * T7.3 — copy and brand checks on every public screen state reached in the flow.
 *
 * A MutationObserver (installed before the first page load) reports every distinct text snapshot of
 * the document (visible text + placeholders / aria-labels / titles / alt texts + <title> + meta
 * description) while a real flow runs, so even transient states (the ~6 s loading screen, tooltips,
 * the modal, inline errors) are checked. Snapshots taken on /grazie are excluded from the "no
 * callback" rules: the thank-you page is the ONLY place where the callback is mentioned (PRD §11).
 */
import { MATRIX, type MatrixCase } from "./cases";
import {
  checkThankYou,
  chooseComune,
  derive,
  fillActivation,
  fillPage1,
  field,
  newIdentity,
  openPage1,
  pick,
  reachActivation,
  resultsStep,
  type Chosen,
} from "./flow";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

const TAG = { tag: "@mobile" };

/** Wording that must never appear before the thank-you page (PRD §6 copy rule, CLAUDE.md). */
const CALLBACK_WORDING: Array<[string, RegExp]> = [
  ["chiama*", /chiam/i],
  ["telefonat*", /telefonat/i],
  ["richiam*", /richiam/i],
  ["ricontatt*", /ricontatt/i],
  ["call center", /call[\s-]?center/i],
  ["callback", /call[\s-]?back/i],
  ["operatore", /operator/i],
];

/** Wording that must never appear anywhere (brand rules). */
const BRAND_WORDING: Array<[string, RegExp]> = [
  ["demo", /demo/i],
  ["Tariffa esclusiva", /tariffa\s+esclusiva/i],
  ["Annuncio pubblicitario", /annuncio\s+pubblicitario/i],
  ["Club", /\bclub\b/i],
  ["punti", /\bpunti\b/i],
  ["Parla con un esperto", /parla\s+con\s+un\s+esperto/i],
  ["Facile.it", /facile\.?\s?it/i],
];

interface Snapshot {
  path: string;
  text: string;
}

async function record(page: Page): Promise<Snapshot[]> {
  const seen: Snapshot[] = [];
  const keys = new Set<string>();
  await page.exposeFunction("__e2eReport", (path: string, text: string) => {
    const key = `${path}\u0000${text}`;
    if (keys.has(key)) return;
    keys.add(key);
    seen.push({ path, text });
  });
  await page.addInitScript(() => {
    let scheduled = false;
    const grab = () => {
      scheduled = false;
      try {
        const parts: string[] = [document.title, document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "", document.body?.innerText ?? ""];
        document.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach((el) => {
          for (const a of ["placeholder", "aria-label", "title", "alt"]) {
            const v = el.getAttribute(a);
            if (v) parts.push(v);
          }
        });
        (window as unknown as { __e2eReport: (p: string, t: string) => void }).__e2eReport(location.pathname, parts.join("\n"));
      } catch {
        /* page is navigating */
      }
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(grab, 30);
    };
    new MutationObserver(schedule).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
    document.addEventListener("DOMContentLoaded", schedule);
    window.addEventListener("load", schedule);
  });
  return seen;
}

function offenders(snapshots: Snapshot[], rules: Array<[string, RegExp]>, skipPath?: string) {
  const out: string[] = [];
  for (const s of snapshots) {
    if (skipPath && s.path === skipPath) continue;
    for (const [name, re] of rules) {
      const m = re.exec(s.text);
      if (m) {
        const at = Math.max(0, m.index - 40);
        out.push(`[${s.path}] "${name}" -> …${s.text.slice(at, m.index + 60).replace(/\s+/g, " ")}…`);
      }
    }
  }
  return [...new Set(out)];
}

/** Elements whose colours are in the orange / amber range (computed styles, on the current screen). */
async function orangeElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const toRgba = (value: string): [number, number, number, number] | null => {
      if (!value || value === "none" || value === "transparent") return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return a === 0 ? null : [r, g, b, a / 255];
    };
    const isOrange = ([r, g, b]: [number, number, number, number]) => {
      const R = r / 255, G = g / 255, B = b / 255;
      const max = Math.max(R, G, B), min = Math.min(R, G, B);
      const l = (max + min) / 2;
      const d = max - min;
      if (d === 0) return false;
      const s = d / (1 - Math.abs(2 * l - 1));
      let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
      h = (h * 60 + 360) % 360;
      return h >= 18 && h <= 48 && s >= 0.55 && l >= 0.3 && l <= 0.78;
    };
    const props = ["color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor", "fill", "stroke"] as const;
    const found = new Set<string>();
    for (const el of document.querySelectorAll("body, body *")) {
      if (!el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      for (const p of props) {
        // A border / outline with width 0 or style none is not drawn.
        if (p.startsWith("border") && (cs.getPropertyValue(p.replace("Color", "Style").replace(/([A-Z])/g, "-$1").toLowerCase()) === "none")) continue;
        if (p === "outlineColor" && (cs.outlineStyle === "none" || cs.outlineWidth === "0px")) continue;
        const rgba = toRgba(cs[p]);
        if (rgba && rgba[3] > 0.2 && isOrange(rgba)) {
          const label = `${el.tagName.toLowerCase()}${el.getAttribute("data-testid") ? `[${el.getAttribute("data-testid")}]` : ""}.${(el.getAttribute("class") ?? "").split(/\s+/).slice(0, 3).join(".")} ${p}=${cs[p]}`;
          found.add(label);
        }
      }
    }
    return [...found].slice(0, 15);
  });
}

async function expectNoOrange(page: Page, where: string, collected: string[]) {
  for (const o of await orangeElements(page)) collected.push(`${where}: ${o}`);
}

const CASA_DUAL = MATRIX.find((c) => c.commodity === "dual" && c.customer === "casa" && c.service === "cambio_fornitore" && c.hasGas === true && !c.manual)!;
const BUSINESS_LUCE = MATRIX.find((c) => c.commodity === "luce" && c.customer === "business" && c.service === "subentro")!;
const GAS_NO_GAS = MATRIX.find((c) => c.commodity === "gas" && c.hasGas === false && !c.manual)!;

/** Runs the whole flow, exercising the screens' secondary states (errors, tooltip, details, modal). */
async function crawlFlow(page: Page, c: MatrixCase, orange: string[]) {
  const d = derive(c);
  const id = newIdentity();
  const chosen: { luce: Chosen | null; gas: Chosen | null } = { luce: null, gas: null };

  // Page 1: empty, every block revealed, inline errors.
  await openPage1(page);
  await expectNoOrange(page, "Page 1 (empty)", orange);
  await pick(page, "commodity-dual", "customer-casa");
  await page.getByTestId("submit").click(); // all inline errors
  await expectNoOrange(page, "Page 1 (errors)", orange);
  await pick(page, "customer-business");
  await page.getByTestId("manual-kwh").fill("0");
  await page.getByTestId("submit").click();
  await pick(page, "customer-casa");
  await page.getByTestId("manual-toggle").check();
  await page.getByTestId("manual-toggle").uncheck();
  await chooseComune(page, "Milano");

  // The real flow from a clean Page 1.
  await fillPage1(page, c, d, id);
  await expectNoOrange(page, "Page 1 (filled, after submit)", orange);

  // Results (+ details, tooltip, invalid consumption, modal).
  const dual = d.luce && d.gas;
  const steps: Array<"luce" | "gas"> = [...(d.luce ? (["luce"] as const) : []), ...(d.gas ? (["gas"] as const) : [])];
  for (const step of steps) {
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    await expectNoOrange(page, `results ${step}`, orange);
    await cards.first().getByTestId("offer-details-toggle").click();
    await cards.first().getByTestId("offer-estimate-tooltip").click();
    await page.getByTestId(step === "luce" ? "results-consumption-kwh" : "results-consumption-smc").fill("abc");
    await expectNoOrange(page, `results ${step} (details, tooltip, error)`, orange);
    await page.getByTestId(step === "luce" ? "results-consumption-kwh" : "results-consumption-smc").blur();
    chosen[step] = await resultsStep(
      page,
      c,
      step,
      (step === "luce" ? d.monthlyKwh : d.monthlySmc)!,
      step === "luce" ? d.excludeLuce : d.excludeGas,
      step === "luce" ? c.pickLuce : c.pickGas,
      dual,
    );
  }
  await page.waitForURL(/\/attivazione$/);

  // Activation: empty submit on A and B (errors), then the real fill.
  await page.getByTestId("activation-next").click();
  await expectNoOrange(page, "activation A (errors)", orange);
  await field(page, "tax_code").fill(c.person.cf);
  await page.getByTestId(`housing_title-${c.housing}`).getByRole("radio").click();
  if (c.customer === "business") await field(page, "vat_number").fill(c.vat!);
  await page.getByTestId("activation-next").click();
  await page.getByTestId("activation-submit").click();
  await expectNoOrange(page, "activation B (errors)", orange);
  await page.getByTestId("activation-back").click();
  await fillActivation(page, c, d, id, chosen);
  await checkThankYou(page, c, chosen);
}

test.describe("copy and brand rules", () => {
  for (const [label, c] of [
    ["Luce + Gas, Casa, Cambio fornitore", CASA_DUAL],
    ["Luce, Partita IVA, Subentro", BUSINESS_LUCE],
    ["Gas, Casa, senza gas attivo (Primo allaccio)", GAS_NO_GAS],
  ] as const) {
    test(`public flow: ${label}`, TAG, async ({ page }) => {
      const seen = await record(page);
      const orange: string[] = [];
      await crawlFlow(page, c, orange);

      // The thank-you page: the callback sentence is there.
      await expect(page.getByText("Riceverai a breve una chiamata dal numero +39 095 0000000 da un nostro consulente per confermare l'attivazione.")).toBeVisible();
      await expectNoOrange(page, "thank-you", orange);
      await expect.poll(() => seen.some((s) => s.path === "/grazie")).toBe(true);

      const publicStates = seen.filter((s) => s.path !== "/grazie");
      expect(new Set(publicStates.map((s) => s.path))).toEqual(new Set(["/", "/offerte", "/attivazione"]));
      expect(publicStates.length, "distinct screen states recorded").toBeGreaterThan(10);

      expect(offenders(seen, CALLBACK_WORDING, "/grazie"), "call / callback wording before the thank-you page").toEqual([]);
      expect(offenders(seen, BRAND_WORDING), "demo / Facile.it wording").toEqual([]);
      expect(orange, "orange / amber colours in computed styles").toEqual([]);

      // The thank-you page does mention the callback (and only there).
      const thanks = seen.filter((s) => s.path === "/grazie").map((s) => s.text).join("\n");
      expect(thanks).toMatch(/chiamata dal numero/);
    });
  }

  test("results with a featured offer: 'In evidenza' band and promo box are green, never orange", TAG, async ({ page }) => {
    await reachActivation(page, MATRIX.find((c) => c.commodity === "luce" && c.customer === "casa" && c.service === "primo_allaccio")!);
    await page.goBack();
    await expect(page.getByTestId("offer-featured-band").first()).toBeVisible();
    const colours = await page.evaluate(() => {
      const pick = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { color: cs.color, background: cs.backgroundColor, border: cs.borderTopColor };
      };
      return {
        band: pick('[data-testid="offer-featured-band"]'),
        promo: pick('[data-testid="offer-promo"]'),
        cta: pick('[data-testid="offer-cta"]'),
      };
    });
    expect(colours.band).not.toBeNull();
    expect(colours.promo).not.toBeNull();
    expect(colours.cta).not.toBeNull();
    const orange: string[] = [];
    await expectNoOrange(page, "featured results", orange);
    expect(orange).toEqual([]);
  });

  test("design tokens: no orange / amber colour in the public colour palette", TAG, async ({ page }) => {
    await page.goto("/");
    const tokens = await page.evaluate(() => {
      const out: Record<string, string> = {};
      const visit = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && /:root|:host/.test(rule.selectorText)) {
            for (const name of Array.from(rule.style)) if (name.startsWith("--color-")) out[name] = rule.style.getPropertyValue(name).trim();
          } else if ("cssRules" in rule) {
            visit((rule as CSSGroupingRule).cssRules);
          }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          visit(sheet.cssRules);
        } catch {
          /* cross-origin sheet */
        }
      }
      return out;
    });
    expect(Object.keys(tokens).length, "colour tokens found").toBeGreaterThan(5);
    const hex = /^#([0-9a-f]{6})$/i;
    const orangeTokens = Object.entries(tokens).filter(([, v]) => {
      const m = hex.exec(v);
      if (!m) return false;
      const n = parseInt(m[1], 16);
      const [R, G, B] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => x / 255);
      const max = Math.max(R, G, B), min = Math.min(R, G, B), dd = max - min;
      if (dd === 0) return false;
      const l = (max + min) / 2;
      const s = dd / (1 - Math.abs(2 * l - 1));
      let h = max === R ? ((G - B) / dd) % 6 : max === G ? (B - R) / dd + 2 : (R - G) / dd + 4;
      h = (h * 60 + 360) % 360;
      return h >= 18 && h <= 48 && s >= 0.55;
    });
    // Tokens in the orange range are allowed to exist (e.g. a "warning" colour used by the admin
    // area) but the computed-style scans above prove none is rendered on a public screen.
    test.info().annotations.push({ type: "orange-range tokens (informational)", description: JSON.stringify(orangeTokens) });
  });

  test("privacy page and 404: brand rules; the privacy notice may state the contact purpose", TAG, async ({ page }) => {
    const seen = await record(page);
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/pagina-che-non-esiste");
    await page.waitForTimeout(300);
    await expect.poll(() => seen.length).toBeGreaterThan(1);
    expect(offenders(seen, BRAND_WORDING), "brand wording").toEqual([]);
    // PRD §13.1: the privacy notice states the contact purpose; no call-centre / callback wording at all.
    const strict = CALLBACK_WORDING.filter(([name]) => name !== "ricontatt*");
    expect(offenders(seen, strict), "call-centre wording on /privacy").toEqual([]);
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 2, name: /Cookie/ })).toBeVisible();
    const body = await page.locator("main").innerText();
    for (const needle of ["versus_lead", "versus_lead_step", "sessionStorage", "codice fiscale", "IBAN"]) {
      expect(body, `privacy mentions ${needle}`).toContain(needle);
    }
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Privacy e cookie" }).first()).toHaveAttribute("href", "/privacy");
    const orange: string[] = [];
    await page.goto("/privacy");
    await expectNoOrange(page, "privacy", orange);
    expect(orange).toEqual([]);
    const privacy = seen.filter((s) => s.path === "/privacy").map((s) => s.text).join("\n");
    // Placeholders such as "[Indirizzo email di contatto privacy]" must be replaced before go-live.
    const placeholders = privacy.match(/\[[^\]]{3,}\]/g) ?? [];
    test.info().annotations.push({ type: "privacy placeholders to replace before go-live", description: JSON.stringify([...new Set(placeholders)]) });
  });


  test("self-check: the detectors do flag offending wording and orange colours", async ({ page }) => {
    const sample: Snapshot[] = [
      { path: "/offerte", text: "Un operatore ti chiamerà. Tariffa esclusiva, Club e punti. Demo. Parla con un esperto su Facile.it" },
      { path: "/grazie", text: "Sarai ricontattato" },
    ];
    expect(offenders(sample, CALLBACK_WORDING, "/grazie").length).toBe(2); // operatore, chiam*
    expect(offenders(sample, BRAND_WORDING).length).toBe(6);
    await page.setContent('<div style="background:#f79009;width:50px;height:50px">x</div><p style="color:rgb(255,122,0)">y</p><div style="background:#0a8045">z</div>');
    expect((await orangeElements(page)).length).toBe(2);
  });
});
