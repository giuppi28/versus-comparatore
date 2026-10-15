/**
 * T7.6 — Lighthouse accessibility score >= 90 on every public page and its main states.
 *
 * Lighthouse (programmatic, "snapshot" mode: it audits the DOM exactly as it is, so seeded / mid-flow
 * states such as /offerte, /attivazione A and B and /grazie can be audited) is attached through
 * puppeteer-core to a Chromium launched by Playwright with a remote-debugging port. The accessibility
 * score does not depend on minification, so running against `next dev` is fine.
 * Results are written to test-results/lighthouse-<project>.json.
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MATRIX } from "./cases";
import { derive, fillActivation, fillPage1, newIdentity, openPage1, pick, resultsStep, type Chosen } from "./flow";
import { expect, randomIp, test } from "./fixtures";

const TAG = { tag: ["@mobile", "@lighthouse"] };
const MIN_SCORE = 0.9;

const CASA_DUAL = MATRIX.find((c) => c.commodity === "dual" && c.customer === "casa" && c.service === "cambio_fornitore" && c.hasGas === true && !c.manual && c.zone === "E")!;

interface PageScore {
  name: string;
  url: string;
  score: number | null;
  failing: Array<{ id: string; title: string; score: number | null; items: string[] }>;
}

const results: PageScore[] = [];

/** Runs the accessibility audits of Lighthouse on the current state of `page`. */
async function audit(page: Page, port: number, name: string, mobile: boolean): Promise<PageScore> {
  const puppeteer = (await import("puppeteer-core")).default;
  const { startFlow } = await import("lighthouse");
  const connection = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null });
  try {
    const target = (await connection.pages()).find((p) => p.url() === page.url());
    if (!target) throw new Error(`No puppeteer page for ${page.url()}`);
    const flow = await startFlow(target, {
      config: {
        extends: "lighthouse:default",
        settings: {
          onlyCategories: ["accessibility"],
          formFactor: mobile ? "mobile" : "desktop",
          screenEmulation: { disabled: true },
          disableStorageReset: true,
          locale: "it",
        },
      },
    });
    await flow.snapshot({ name });
    const lhr = (await flow.createFlowResult()).steps[0].lhr;
    const category = lhr.categories.accessibility;
    const failing = category.auditRefs
      .map((ref) => lhr.audits[ref.id])
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== "notApplicable" && a.scoreDisplayMode !== "manual")
      .map((a) => ({
        id: a.id,
        title: a.title,
        score: a.score,
        items: ((a.details as { items?: Array<{ node?: { snippet?: string; selector?: string } }> } | undefined)?.items ?? [])
          .slice(0, 5)
          .map((i) => i.node?.selector ?? i.node?.snippet ?? ""),
      }));
    const entry: PageScore = { name, url: new URL(page.url()).pathname, score: category.score, failing };
    results.push(entry);
    return entry;
  } finally {
    await connection.disconnect();
  }
}

test.describe("Lighthouse accessibility >= 90", () => {
  test.describe.configure({ mode: "serial" });

  test("public pages and states", TAG, async ({}, testInfo) => {
    const mobile = testInfo.project.name === "mobile";
    const port = 9340 + (mobile ? 1 : 0);
    const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
    try {
      const context = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL),
        viewport: testInfo.project.use.viewport ?? { width: 1440, height: 900 },
        isMobile: mobile,
        hasTouch: mobile,
        extraHTTPHeaders: { "x-forwarded-for": randomIp() },
      });
      const page = await context.newPage();
      const a = (name: string) => audit(page, port, name, mobile);

      // ---- Page 1 ----
      await openPage1(page);
      await a("/ (empty)");
      await pick(page, "commodity-dual", "customer-casa");
      await page.getByTestId("submit").click(); // inline errors
      await expect(page.getByTestId("error-people")).toBeVisible();
      await a("/ (inline errors)");
      await page.reload();
      await page.evaluate(() => sessionStorage.clear());

      // ---- results, modal, activation A / B, thank-you through the real flow ----
      const c = CASA_DUAL;
      const d = derive(c);
      const id = newIdentity();
      await fillPage1(page, c, d, id);
      await expect(page.getByTestId("offer-card").first()).toBeVisible({ timeout: 20_000 });
      await a("/offerte (Luce step)");
      await page.getByTestId("offer-card").first().getByTestId("offer-cta").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await a("/offerte (offer modal)");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);

      const chosen: { luce: Chosen | null; gas: Chosen | null } = { luce: null, gas: null };
      chosen.luce = await resultsStep(page, c, "luce", d.monthlyKwh!, d.excludeLuce, 0, true);
      await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "gas");
      await a("/offerte (Gas step)");
      chosen.gas = await resultsStep(page, c, "gas", d.monthlySmc!, d.excludeGas, 0, true);
      await page.waitForURL(/\/attivazione$/);
      await expect(page.getByTestId("activation-step-a")).toBeVisible();
      await a("/attivazione (step A)");
      await page.getByTestId("activation-next").click();
      await a("/attivazione (step A, errors)");

      await fillActivation(page, c, d, id, chosen, {
        beforeSubmit: async () => {
          await a("/attivazione (step B, filled)");
        },
      });
      await expect(page.getByTestId("thankyou-heading")).toBeVisible();
      await a("/grazie");

      await page.goto("/privacy");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await a("/privacy");
    } finally {
      await browser.close();
      mkdirSync(path.join(__dirname, "../../test-results"), { recursive: true });
      writeFileSync(path.join(__dirname, `../../test-results/lighthouse-${testInfo.project.name}.json`), JSON.stringify(results, null, 2));
      for (const r of results) console.log(`LIGHTHOUSE ${testInfo.project.name} ${r.name}: ${r.score === null ? "n/a" : Math.round(r.score * 100)}${r.failing.length ? ` — failing: ${r.failing.map((f) => `${f.id}${f.items.length ? ` [${f.items.join(" | ")}]` : ""}`).join("; ")}` : ""}`);
    }

    for (const r of results) {
      expect.soft(r.score, `${r.name}: ${r.failing.map((f) => f.id).join(", ")}`).toBeGreaterThanOrEqual(MIN_SCORE);
    }
    expect(results.length).toBeGreaterThanOrEqual(9);
  });
});

