/**
 * T7.6 — screenshots of EVERY screen at 390px (mobile project) and 1440px (desktop project), written
 * to e2e/screenshots/<screen>-<width>.png. The public screens are reached through the real flow
 * (real lead API on the mock repository), the admin screens with the mock-admin session.
 * Every screenshot also asserts that the page has no horizontal overflow.
 */
import path from "node:path";
import { request, type Page } from "@playwright/test";
import { completeData, page1Data } from "../../src/lib/lead/test-fixtures";
import { MATRIX } from "./cases";
import {
  checkThankYou,
  chooseComune,
  derive,
  field,
  fillActivation,
  fillPage1,
  newIdentity,
  noOverflow,
  openPage1,
  pick,
  radio,
  resultsStep,
  type Chosen,
} from "./flow";
import { expect, randomIp, test } from "./fixtures";
import { ADMIN_STATE_FILE, SHOTS_DIR } from "./paths";

const TAG = { tag: "@mobile" };
const FLOW_KEY = "versus.flow.v1";

async function shot(page: Page, name: string) {
  const width = page.viewportSize()?.width ?? 0;
  await noOverflow(page);
  // Hide the Next.js dev-mode indicator so it does not end up in the screenshots.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}-${width}.png`), fullPage: true });
}

const find = (pred: Parameters<typeof MATRIX.find>[0]) => MATRIX.find(pred)!;
const DUAL = find((c) => c.commodity === "dual" && c.customer === "casa" && c.service === "cambio_fornitore" && c.hasGas === true && c.zone === "E" && !c.manual);
const LUCE = find((c) => c.commodity === "luce" && c.customer === "casa" && c.service === "cambio_fornitore" && !c.manual);
const GAS = find((c) => c.commodity === "gas" && c.customer === "casa" && c.service === "cambio_fornitore" && c.hasGas === true && !c.manual && c.gasUses.length === 1);
const BUSINESS = find((c) => c.commodity === "dual" && c.customer === "business" && c.service === "voltura");

test.describe("screenshots: Page 1", () => {
  test("empty, Partita IVA, errors, filled", TAG, async ({ page }) => {
    await openPage1(page);
    await shot(page, "page1-empty");
    await pick(page, "commodity-dual", "customer-casa");
    await shot(page, "page1-casa-blocks");
    await page.getByTestId("submit").click(); // inline errors, scrolled to the first
    await expect(page.getByTestId("error-people")).toBeVisible();
    await shot(page, "page1-errors");
    await pick(page, "customer-business", "service-voltura");
    await shot(page, "page1-business");

    // The autocomplete open with its suggestions.
    await page.locator("#p1-comune").fill("Mil");
    await expect(page.getByRole("option").first()).toBeVisible();
    await shot(page, "page1-comune-autocomplete");
    await page.locator("#p1-comune").fill("");
  });

  test("filled (Luce + Gas, Casa, consent given)", TAG, async ({ page }) => {
    await openPage1(page);
    await pick(page, "commodity-dual", "customer-casa", "service-cambio", "people-3", "appliance-frigorifero", "appliance-scaldabagno", "has-gas-yes", "gas-use-cucina", "gas-use-riscaldamento", "sqm-90_120");
    await page.getByTestId("supplier-luce").selectOption("edison-energia");
    await page.getByTestId("supplier-gas").selectOption("eni-plenitude");
    await page.getByTestId("first-name").fill("Mario");
    await page.getByTestId("last-name").fill("Rossi");
    await page.getByTestId("phone").fill("333 123 4567");
    await chooseComune(page, "Milano");
    await page.getByTestId("privacy-consent").check();
    await expect(page.getByTestId("estimate-gas")).toBeVisible();
    await shot(page, "page1-filled");
    await pick(page, "has-gas-no");
    await shot(page, "page1-no-gas");
  });
});

test.describe("screenshots: loading, results, modal", () => {
  test("loading screen (mid-animation)", TAG, async ({ page }) => {
    await page.route("**/api/lead", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
    await page.addInitScript(
      ([key, value]) => {
        if (!window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, value);
      },
      [FLOW_KEY, JSON.stringify({ version: 1, commodity: "dual", customerType: "casa", serviceType: "cambio_fornitore", currentSupplierLuce: "edison-energia", currentSupplierGas: "eni-plenitude", hasGas: true, estimatedKwhYear: 2700, estimatedSmcYear: 720 })],
    );
    // A fake clock freezes the (short, test-only) animation half way through.
    await page.clock.install();
    await page.goto("/offerte");
    await expect(page.getByTestId("loading-screen")).toBeVisible();
    await page.clock.runFor(160);
    await expect(page.getByTestId("loading-screen")).toBeVisible();
    await shot(page, "loading");
  });

  test("results Luce, details open, modal", TAG, async ({ page }) => {
    const d = derive(LUCE);
    await fillPage1(page, LUCE, d, newIdentity());
    await expect(page.getByTestId("offer-card").first()).toBeVisible({ timeout: 20_000 });
    await shot(page, "results-luce");
    await page.getByTestId("offer-card").first().getByTestId("offer-details-toggle").click();
    await page.getByTestId("offer-card").first().getByTestId("offer-estimate-tooltip").click();
    await shot(page, "results-luce-details");
    await page.getByTestId("offer-card").first().getByTestId("offer-cta").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot(page, "modal-luce");
  });

  test("results Gas", TAG, async ({ page }) => {
    await fillPage1(page, GAS, derive(GAS), newIdentity());
    await expect(page.getByTestId("offer-card").first()).toBeVisible({ timeout: 20_000 });
    await shot(page, "results-gas");
    await page.getByTestId("offer-card").nth(1).getByTestId("offer-cta").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot(page, "modal-gas");
  });

  test("results Luce + Gas: step 1 (Luce), modal, step 2 (Gas)", TAG, async ({ page }) => {
    const d = derive(DUAL);
    await fillPage1(page, DUAL, d, newIdentity());
    await expect(page.getByTestId("offer-card").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "luce");
    await shot(page, "results-dual-step1-luce");
    await page.getByTestId("offer-card").nth(1).getByTestId("offer-cta").click();
    await expect(page.getByTestId("offer-modal-step")).toHaveText("Offerta Luce");
    await shot(page, "modal-dual-luce");
    await page.getByTestId("offer-modal-cta").click();
    await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "gas");
    await expect(page.getByTestId("dual-luce-summary")).toBeVisible();
    await shot(page, "results-dual-step2-gas");
  });

  test("results: consumption edited and the empty / error edge states", TAG, async ({ page }) => {
    const d = derive(LUCE);
    await fillPage1(page, LUCE, d, newIdentity());
    await expect(page.getByTestId("offer-card").first()).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("results-consumption-kwh").fill("abc");
    await expect(page.getByText(/consumo mensile valido/i)).toBeVisible();
    await shot(page, "results-luce-consumption-error");
  });
});

test.describe("screenshots: activation and thank-you", () => {
  async function runActivation(page: Page, c: (typeof MATRIX)[number], name: string) {
    const d = derive(c);
    const id = newIdentity();
    const chosen: { luce: Chosen | null; gas: Chosen | null } = { luce: null, gas: null };
    await fillPage1(page, c, d, id);
    const dual = d.luce && d.gas;
    if (d.luce) chosen.luce = await resultsStep(page, c, "luce", d.monthlyKwh!, d.excludeLuce, c.pickLuce, dual);
    if (d.gas) chosen.gas = await resultsStep(page, c, "gas", d.monthlySmc!, d.excludeGas, c.pickGas, dual);
    await page.waitForURL(/\/attivazione$/);
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await shot(page, `${name}-a-empty`);
    await page.getByTestId("activation-next").click();
    await expect(page.getByText("Inserisci il codice fiscale.")).toBeVisible();
    await shot(page, `${name}-a-errors`);

    let stepB = false;
    await fillActivation(page, c, d, id, chosen, {
      beforeNext: async () => {
        await shot(page, `${name}-a-filled`);
      },
      beforeSubmit: async () => {
        await shot(page, `${name}-b-filled`);
        stepB = true;
      },
    });
    expect(stepB).toBe(true);
    await checkThankYou(page, c, chosen);
    await shot(page, `${name.replace("activation", "thankyou")}`);
  }

  test("Luce + Gas, Casa", TAG, async ({ page }) => {
    await runActivation(page, DUAL, "activation-dual");
  });

  test("Luce, Casa", TAG, async ({ page }) => {
    await runActivation(page, LUCE, "activation-luce");
  });

  test("Gas, Casa", TAG, async ({ page }) => {
    await runActivation(page, GAS, "activation-gas");
  });

  test("Luce + Gas, Partita IVA", TAG, async ({ page }) => {
    await runActivation(page, BUSINESS, "activation-business");
  });

  test("step B with every error", TAG, async ({ page }) => {
    const d = derive(DUAL);
    const id = newIdentity();
    await fillPage1(page, DUAL, d, id);
    await resultsStep(page, DUAL, "luce", d.monthlyKwh!, d.excludeLuce, 0, true);
    await resultsStep(page, DUAL, "gas", d.monthlySmc!, d.excludeGas, 0, true);
    await field(page, "tax_code").fill(DUAL.person.cf);
    await radio(page, "housing_title-proprietario").click();
    await page.getByTestId("activation-next").click();
    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("Inserisci il codice POD.")).toBeVisible();
    await shot(page, "activation-dual-b-errors");
    await expect(page).toHaveURL(/\/attivazione$/);
  });
});

test.describe("screenshots: privacy and thank-you states", () => {
  test("privacy page", TAG, async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "privacy");
  });
});

// ---------------------------------------------------------------------------
// Admin

test.describe("screenshots: admin login", () => {
  test("login page and wrong password", TAG, async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
    await shot(page, "admin-login");
    await page.getByLabel("Email").fill("nobody@versus.test");
    await page.getByLabel("Password").fill("sbagliata");
    await expect(page.getByRole("button", { name: "Accedi" })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole("button", { name: "Accedi" }).click();
    await expect(page.getByTestId("form-error")).toBeVisible();
    await shot(page, "admin-login-error");
  });
});

test.describe("screenshots: admin area", () => {
  test.use({ storageState: ADMIN_STATE_FILE });
  let completedPod = "";
  let partialSurname = "";

  test.beforeAll(async ({}, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    const client = () =>
      request.newContext({ baseURL, storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { Origin: baseURL, "x-forwarded-for": randomIp() } });
    completedPod = `IT001E${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    partialSurname = `Shot${Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 6)}`;
    const done = await client();
    await done.post("/api/lead", { data: { data: page1Data() } });
    const res = await done.post("/api/lead/complete", { data: { data: completeData({ pod: completedPod }) } });
    expect(res.status()).toBeLessThan(300);
    await done.dispose();
    const partial = await client();
    await partial.post("/api/lead", { data: { data: page1Data({ last_name: partialSurname, commodity: "dual" }) } });
    await partial.dispose();
  });

  test("dashboard, leads (list + detail), suppliers (list + form), offers (list + form), settings", TAG, async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await shot(page, "admin-dashboard");

    await page.goto(`/admin/leads?tab=tutti`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "admin-leads-list");
    await page.goto(`/admin/leads?q=${completedPod}`);
    await page.locator('[data-testid="lead-item"]:visible').first().getByRole("link", { name: "Mario Rossi" }).click();
    await expect(page.getByTestId("group-tecnici")).toContainText(completedPod);
    await shot(page, "admin-lead-detail");
    await page.goto(`/admin/leads?tab=parziali&q=${partialSurname}`);
    await shot(page, "admin-leads-partial");

    await page.goto("/admin/fornitori");
    await expect(page.getByRole("heading", { name: "Fornitori" })).toBeVisible();
    await shot(page, "admin-suppliers-list");
    await page.goto("/admin/fornitori/enel-energia");
    await expect(page.getByLabel("Nome")).toHaveValue("Enel Energia");
    await shot(page, "admin-supplier-form");
    await page.goto("/admin/fornitori/nuovo");
    await page.getByRole("button", { name: /Crea fornitore/ }).click();
    await expect(page.getByTestId("form-error")).toBeVisible();
    await shot(page, "admin-supplier-form-errors");

    await page.goto("/admin/offerte");
    await expect(page.getByRole("heading", { name: "Offerte", level: 1 })).toBeVisible();
    await shot(page, "admin-offers-list");
    await page.goto("/admin/offerte/offer-edison-luce-fissa-12");
    await expect(page.locator("[name=name]")).toHaveValue("Edison Luce Fissa 12");
    await shot(page, "admin-offer-form");
    await page.goto("/admin/offerte/nuova");
    await page.getByRole("button", { name: "Crea offerta" }).click();
    await expect(page.getByTestId("form-error")).toBeVisible();
    await shot(page, "admin-offer-form-errors");

    await page.goto("/admin/impostazioni");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "admin-settings");
  });
});
