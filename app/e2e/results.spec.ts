import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { MOCK_OFFERS } from "../src/lib/data/mock/data";
import { annualFromMonthly, formatEuro, monthlyCost, monthlyFromAnnual, rankOffers } from "../src/lib/logic/pricing";

const FLOW_KEY = "versus.flow.v1";
const SHOTS = "e2e/screenshots";

const luceOffers = MOCK_OFFERS.filter((o) => o.commodity === "luce");
const gasOffers = MOCK_OFFERS.filter((o) => o.commodity === "gas");

type FlowSeed = Record<string, unknown>;

/** Valid flow states (loadFlowState merges them with the initial state). */
const luceCasa = (patch: FlowSeed = {}): FlowSeed => ({
  version: 1,
  commodity: "luce",
  customerType: "casa",
  serviceType: "cambio_fornitore",
  currentSupplierLuce: "edison-energia",
  estimatedKwhYear: 2700,
  ...patch,
});

const gasCasa = (patch: FlowSeed = {}): FlowSeed => ({
  version: 1,
  commodity: "gas",
  customerType: "casa",
  serviceType: "cambio_fornitore",
  currentSupplierGas: "eni-plenitude",
  hasGas: true,
  estimatedSmcYear: 720,
  ...patch,
});

const dualCasa = (patch: FlowSeed = {}): FlowSeed => ({
  version: 1,
  commodity: "dual",
  customerType: "casa",
  serviceType: "cambio_fornitore",
  currentSupplierLuce: "edison-energia",
  currentSupplierGas: "eni-plenitude",
  hasGas: true,
  estimatedKwhYear: 2700,
  estimatedSmcYear: 720,
  ...patch,
});

interface Captured {
  patches: Array<{ data: Record<string, unknown> }>;
}

/** Seeds the flow state once (not on later navigations) and stubs the lead API. */
async function setup(page: Page, seed: FlowSeed | null): Promise<Captured> {
  const captured: Captured = { patches: [] };
  if (seed) {
    await page.addInitScript(
      ([key, value]) => {
        if (!window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, value);
      },
      [FLOW_KEY, JSON.stringify(seed)],
    );
  }
  await page.route("**/api/lead", async (route) => {
    const req = route.request();
    if (req.method() === "PATCH") captured.patches.push(req.postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  return captured;
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function ids(cards: Locator, attr: string): Promise<string[]> {
  return cards.evaluateAll((els, a) => els.map((e) => e.getAttribute(a) ?? ""), attr);
}

/** monthly_cost_shown is sent rounded to cents. */
function expectCents(actual: unknown, exact: number) {
  expect(Math.abs((actual as number) - exact)).toBeLessThanOrEqual(0.005 + 1e-9);
}

const shot = (page: Page, info: TestInfo, name: string) =>
  page.screenshot({ path: `${SHOTS}/results-${info.project.name}-${name}.png`, fullPage: true });

async function flowState(page: Page) {
  return page.evaluate((key) => JSON.parse(window.sessionStorage.getItem(key) ?? "null"), FLOW_KEY);
}

test.describe("results page", () => {
  test("redirects to the start when Page 1 data are missing", async ({ page }) => {
    await setup(page, null);
    await page.goto("/offerte?fast=1");
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("redirects when a required consumption is missing (dual without gas estimate)", async ({ page }) => {
    await setup(page, dualCasa({ estimatedSmcYear: null }));
    await page.goto("/offerte?fast=1");
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("loading screen of a luce+gas comparison hides both current suppliers and keeps the others", async ({
    page,
  }) => {
    await setup(page, dualCasa());
    await page.goto("/offerte");
    await expect(page.getByTestId("loading-screen")).toBeVisible();
    await expect(page.getByTestId("loading-supplier").first()).toBeVisible();
    const shownIds = await ids(page.getByTestId("loading-supplier"), "data-supplier-id");
    expect(shownIds).not.toContain("edison-energia");
    expect(shownIds).not.toContain("eni-plenitude");
    expect(shownIds).toContain("engie");
    expect(shownIds).toContain("enel-energia");
    expect(shownIds.length).toBeGreaterThan(5);
  });

  test("loading screen hides the current supplier and updates the lead, then shows results", async ({
    page,
  }, info) => {
    const captured = await setup(page, luceCasa());
    await page.goto("/offerte");
    const loading = page.getByTestId("loading-screen");
    await expect(loading).toBeVisible();
    // The rotating message names the compared commodity (polls until that message shows).
    await expect(loading).toContainText("offerte luce", { timeout: 10_000 });
    await expect(page.getByTestId("loading-supplier").first()).toBeVisible();
    await expect(page.locator('[data-testid="loading-supplier"][data-supplier-id="edison-energia"]')).toHaveCount(0);
    // All active real suppliers with a logo are shown, not only those with luce offers (engie has none).
    await expect(page.locator('[data-testid="loading-supplier"][data-supplier-id="engie"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="loading-supplier"][data-supplier-id="enel-energia"]')).toHaveCount(1);
    // Placeholders (Tutela / Altro fornitore / Non lo so) never appear.
    for (const id of ["tutela", "altro-fornitore", "non-lo-so"]) {
      await expect(page.locator(`[data-testid="loading-supplier"][data-supplier-id="${id}"]`)).toHaveCount(0);
    }
    // More logos than the few suppliers having a luce offer (3 in the mock data); no duplicate ids.
    const shownIds = await ids(page.getByTestId("loading-supplier"), "data-supplier-id");
    expect(shownIds.length).toBeGreaterThan(5);
    expect(new Set(shownIds).size).toBe(shownIds.length);
    await page.waitForTimeout(800);
    await shot(page, info, "loading");
    await noOverflow(page);
    const started = Date.now();
    await expect(page.getByTestId("offer-card").first()).toBeVisible({ timeout: 20_000 });
    expect(Date.now() - started).toBeLessThan(9_000);

    // Lead updated during the animation: step "results" + final monthly consumption.
    const first = captured.patches[0]?.data;
    expect(first?.step_reached).toBe("results");
    expect(first?.final_kwh_month).toBe(monthlyFromAnnual(2700));
    expect((await flowState(page)).finalKwhMonth).toBe(225);

    // Going back to the same comparison does not replay the animation.
    await page.reload();
    await expect(page.getByTestId("offer-card").first()).toBeVisible();
    await expect(loading).toHaveCount(0);
  });

  test("luce: current supplier excluded, order and monthly cost follow PRD §8", async ({ page }, info) => {
    await setup(page, luceCasa());
    await page.goto("/offerte?fast=1");
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible();

    const monthly = monthlyFromAnnual(2700);
    const expected = rankOffers(luceOffers, "casa", annualFromMonthly(monthly), { excludeSupplierId: "edison-energia" });
    expect(expected).toHaveLength(3);
    expect(await ids(cards, "data-supplier-id")).not.toContain("edison-energia");
    expect(await ids(cards, "data-offer-id")).toEqual(expected.map((r) => r.offer.id));
    expect(await ids(cards, "data-featured")).toEqual(["false", "false", "false"]);

    // Monthly cost of one card matches monthlyCost() and is shown with the tooltip.
    const sorgenia = luceOffers.find((o) => o.supplier_id === "sorgenia")!;
    const cost = monthlyCost(sorgenia, annualFromMonthly(monthly))!;
    const card = page.locator(`[data-testid="offer-card"][data-offer-id="${sorgenia.id}"]`);
    await expect(card).toHaveAttribute("data-monthly-cost", String(Math.round(cost * 100)));
    await expect(card.getByTestId("offer-monthly")).toHaveText(formatEuro(cost));
    await expect(card.getByTestId("offer-locked")).toHaveText("Bloccato 24 mesi");
    await expect(card.getByTestId("offer-cta")).toHaveText("Attiva online in 1 minuto");
    await card.getByTestId("offer-estimate-tooltip").click();
    await expect(card.getByRole("tooltip")).toContainText("IVA esclusa");

    // "I tuoi consumi": prefilled with annual / 12, no other filters.
    await expect(page.getByTestId("results-consumption-kwh")).toHaveValue(String(monthly));
    await expect(page.getByTestId("results-consumption-smc")).toHaveCount(0);
    await expect(page.getByText("I tuoi consumi")).toBeVisible();

    await noOverflow(page);
    await shot(page, info, "luce");
  });

  test("title: closing words in VERSUS green, text unchanged, centered block, no overflow", async ({ page }, info) => {
    const accentRgb = "rgb(10, 106, 58)"; // brand-700, 5.9:1 on the page grey
    const colorOf = (loc: Locator) => loc.evaluate((el) => getComputedStyle(el).color);

    await setup(page, luceCasa());
    await page.goto("/offerte?fast=1");
    const title = page.getByTestId("results-title");
    await expect(title).toHaveText("Le migliori offerte Luce per te");
    expect(await colorOf(title.locator("span"))).toBe(accentRgb);
    expect(await colorOf(title)).not.toBe(accentRgb);
    // Title block centered on the viewport.
    const box = (await title.boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThanOrEqual(2);
    await noOverflow(page);
    await shot(page, info, "title-luce");
  });

  test("title (gas and dual): accent colour, text unchanged", async ({ page }) => {
    const accentRgb = "rgb(10, 106, 58)";
    await setup(page, gasCasa());
    await page.goto("/offerte?fast=1");
    const title = page.getByTestId("results-title");
    await expect(title).toHaveText("Le migliori offerte Gas per te");
    expect(await title.locator("span").evaluate((el) => getComputedStyle(el).color)).toBe(accentRgb);

    await page.evaluate(
      ([key, value]) => window.sessionStorage.setItem(key, value),
      [FLOW_KEY, JSON.stringify(dualCasa())],
    );
    await page.goto("/offerte?fast=1");
    await expect(title).toHaveText("Le migliori offerte Luce per te");
    expect(await title.locator("span").evaluate((el) => getComputedStyle(el).color)).toBe(accentRgb);
    await noOverflow(page);
  });

  test("luce without a current supplier: featured offer first, then by cost", async ({ page }) => {
    await setup(page, luceCasa({ serviceType: "primo_allaccio", currentSupplierLuce: "edison-energia" }));
    await page.goto("/offerte?fast=1");
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible();
    // A stale supplier left in the state is ignored for Primo allaccio.
    const expected = rankOffers(luceOffers, "casa", annualFromMonthly(225));
    expect(await ids(cards, "data-offer-id")).toEqual(expected.map((r) => r.offer.id));
    await expect(cards.first()).toHaveAttribute("data-featured", "true");
    await expect(cards.first()).toHaveAttribute("data-supplier-id", "edison-energia");
    await expect(cards.first().getByTestId("offer-featured-band")).toHaveText("In evidenza");
    await expect(cards.first().getByTestId("offer-promo")).toContainText("Fino a 60€");
  });

  test("editing the monthly kWh recalculates costs and reorders instantly", async ({ page }) => {
    await setup(page, luceCasa());
    await page.goto("/offerte?fast=1");
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible();
    const before = await ids(cards, "data-offer-id");

    const input = page.getByTestId("results-consumption-kwh");
    await input.fill("20");
    const expected = rankOffers(luceOffers, "casa", annualFromMonthly(20), { excludeSupplierId: "edison-energia" });
    expect(expected.map((r) => r.offer.id)).not.toEqual(before);
    await expect.poll(() => ids(cards, "data-offer-id")).toEqual(expected.map((r) => r.offer.id));
    expect(await ids(cards, "data-monthly-cost")).toEqual(
      expected.map((r) => String(Math.round(r.monthlyCost! * 100))),
    );
    expect((await flowState(page)).finalKwhMonth).toBe(20);

    // Invalid input: error, the last valid value stays in use.
    await input.fill("abc");
    await expect(page.getByText(/consumo mensile valido/i)).toBeVisible();
    expect(await ids(cards, "data-offer-id")).toEqual(expected.map((r) => r.offer.id));
    await input.blur();
    await expect(input).toHaveValue("20");
  });

  test("gas: Eni Plenitude (current supplier) excluded, Smc consumption", async ({ page }) => {
    await setup(page, gasCasa());
    await page.goto("/offerte?fast=1");
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible();
    const expected = rankOffers(gasOffers, "casa", annualFromMonthly(monthlyFromAnnual(720)), {
      excludeSupplierId: "eni-plenitude",
    });
    expect(await ids(cards, "data-offer-id")).toEqual(expected.map((r) => r.offer.id));
    expect(await ids(cards, "data-supplier-id")).not.toContain("eni-plenitude");
    await expect(page.getByTestId("results-consumption-smc")).toHaveValue("60");
    await expect(page.getByTestId("results-consumption-kwh")).toHaveCount(0);
    await expect(page.getByTestId("dual-step-indicator")).toHaveCount(0);
    await expect(cards.first().getByTestId("offer-price")).toContainText("€/Smc");
  });

  test("business customer sees the offers for business (and 'both')", async ({ page }) => {
    await setup(page, luceCasa({ customerType: "business", manualConsumption: true, manualKwhYear: 12000 }));
    await page.goto("/offerte?fast=1");
    await expect(page.getByTestId("offer-card").first()).toBeVisible();
    await expect(page.getByTestId("results-consumption-kwh")).toHaveValue("1000");
    await expect(page.getByTestId("offer-card")).toHaveCount(3);
  });

  test("single commodity: choice opens the modal with advantages, then goes to activation", async ({
    page,
  }, info) => {
    const captured = await setup(page, luceCasa());
    await page.goto("/offerte?fast=1");
    const sorgenia = luceOffers.find((o) => o.supplier_id === "sorgenia")!;
    const card = page.locator(`[data-testid="offer-card"][data-offer-id="${sorgenia.id}"]`);
    await card.getByTestId("offer-cta").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("I vantaggi dell'offerta")).toBeVisible();
    await expect(dialog.getByTestId("offer-modal-advantages").locator("li").first()).toContainText(
      "bloccato 24 mesi",
    );
    await expect(dialog.getByText("Puoi revocare il contratto entro 14 giorni")).toBeVisible();
    await shot(page, info, "modal");

    // Closing keeps the customer on the list, nothing chosen.
    await dialog.getByRole("button", { name: /chiudi/i }).first().click();
    await expect(dialog).toHaveCount(0);
    expect((await flowState(page)).chosenOffers.luce).toBeNull();

    await card.getByTestId("offer-cta").click();
    await page.getByTestId("offer-modal-cta").click();
    await page.waitForURL(/\/attivazione$/);

    const flow = await flowState(page);
    expect(flow.chosenOffers.luce.offer_id).toBe(sorgenia.id);
    expect(flow.chosenOffers.luce.monthly_cost).toBeCloseTo(monthlyCost(sorgenia, annualFromMonthly(225))!, 6);
    expect(flow.chosenOffers.gas).toBeNull();
    const last = captured.patches.at(-1)!.data;
    expect(last.step_reached).toBe("offer_chosen");
    expect(last.chosen_offer_luce).toBe(sorgenia.id);
    expectCents(last.monthly_cost_shown, monthlyCost(sorgenia, annualFromMonthly(225))!);
  });

  test("variable offer: PUN price, 'Varia con il PUN', no lock, IBAN notice, badge on cheapest fixed; choice sends null cost", async ({
    page,
  }, info) => {
    const captured = await setup(page, luceCasa({ currentSupplierLuce: "edison-energia" }));
    await page.goto("/offerte?fast=1");
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible();
    const IBAN = "Per attivare questa offerta è obbligatorio il pagamento con IBAN: ti servirà al passo successivo.";

    // Variable offers are last; exactly one badge (cheapest fixed, none forced for casa).
    const order = await ids(cards, "data-offer-id");
    const variableIds = luceOffers.filter((o) => o.customer_type === "casa" && o.price_type === "variable").map((o) => o.id);
    expect(order.slice(-variableIds.length).sort()).toEqual([...variableIds].sort());
    expect(await ids(cards, "data-featured")).toEqual(order.map((_, i) => (i === 0 ? "true" : "false")));

    const iren = luceOffers.find((o) => o.name === "Prezzo Variabile Revolution")!;
    const irenCard = page.locator(`[data-testid="offer-card"][data-offer-id="${iren.id}"]`);
    await expect(irenCard.getByTestId("offer-price")).toHaveText(/^PUN \+ 0,01\s€\/kWh$/);
    await expect(irenCard.getByTestId("offer-monthly")).toHaveText("Varia con il PUN");
    await expect(irenCard.getByTestId("offer-locked")).toHaveCount(0);
    await expect(irenCard).not.toContainText("Bloccato");
    await expect(irenCard.getByTestId("offer-iban-notice")).toHaveCount(0);

    const trend = luceOffers.find((o) => o.name === "Trend")!;
    const trendCard = page.locator(`[data-testid="offer-card"][data-offer-id="${trend.id}"]`);
    await expect(trendCard.getByTestId("offer-iban-notice")).toHaveText(IBAN);
    await noOverflow(page);
    await shot(page, info, "variable");

    await trendCard.getByTestId("offer-cta").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByTestId("offer-modal-iban-notice")).toHaveText(IBAN);
    await expect(dialog.getByTestId("offer-modal-monthly")).toContainText("Varia con il PUN");
    await expect(dialog.getByTestId("offer-modal-features")).not.toContainText("Prezzo bloccato");
    await noOverflow(page);
    await page.getByTestId("offer-modal-cta").click();
    await page.waitForURL(/\/attivazione$/);

    expect((await flowState(page)).chosenOffers.luce.monthly_cost).toBeNull();
    const last = captured.patches.at(-1)!.data;
    expect(last.chosen_offer_luce).toBe(trend.id);
    expect(last.monthly_cost_shown).toBeNull();
    await noOverflow(page);
  });

  test("details can be expanded on the card", async ({ page }) => {
    await setup(page, luceCasa());
    await page.goto("/offerte?fast=1");
    const card = page.getByTestId("offer-card").first();
    await card.getByTestId("offer-details-toggle").click();
    await expect(card.getByTestId("offer-details")).toContainText("Costo di attivazione");
  });

  test("Luce + Gas: two steps without reload, back keeps the choice, gas choice goes to activation", async ({
    page,
  }, info) => {
    const captured = await setup(page, dualCasa());
    await page.goto("/offerte?fast=1");
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible();

    const indicator = page.getByTestId("dual-step-indicator");
    await expect(indicator).toHaveAttribute("data-active", "luce");
    await expect(indicator).toContainText("Luce");
    await expect(indicator).toContainText("Gas");
    await expect(page.getByTestId("dual-back")).toHaveCount(0);
    expect(await ids(cards, "data-supplier-id")).not.toContain("edison-energia");
    await expect(page.getByTestId("results-consumption-kwh")).toBeVisible();

    // Choose a luce offer -> gas step (same document, no reload).
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    const iberdrola = luceOffers.find((o) => o.supplier_id === "iberdrola")!;
    await page.locator(`[data-testid="offer-card"][data-offer-id="${iberdrola.id}"]`).getByTestId("offer-cta").click();
    await expect(page.getByTestId("offer-modal-step")).toHaveText("Offerta Luce");
    await page.getByTestId("offer-modal-cta").click();

    await expect(indicator).toHaveAttribute("data-active", "gas");
    await expect(page.getByTestId("results-consumption-smc")).toHaveValue("60");
    const expectedGas = rankOffers(gasOffers, "casa", annualFromMonthly(60), { excludeSupplierId: "eni-plenitude" });
    await expect.poll(() => ids(cards, "data-offer-id")).toEqual(expectedGas.map((r) => r.offer.id));
    expect(await ids(cards, "data-supplier-id")).not.toContain("eni-plenitude");
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    await expect(page.getByTestId("dual-luce-summary")).toContainText(iberdrola.name);
    await shot(page, info, "dual-gas");
    await noOverflow(page);

    // Back to luce: the choice is kept and highlighted.
    await page.getByTestId("dual-back").click();
    await expect(indicator).toHaveAttribute("data-active", "luce");
    await expect(page.locator(`[data-offer-id="${iberdrola.id}"]`)).toHaveAttribute("data-chosen", "true");
    expect((await flowState(page)).chosenOffers.luce.offer_id).toBe(iberdrola.id);

    // Forward again (re-confirm luce), then choose a gas offer -> activation.
    await page.locator(`[data-offer-id="${iberdrola.id}"]`).getByTestId("offer-cta").click();
    await page.getByTestId("offer-modal-cta").click();
    await expect(indicator).toHaveAttribute("data-active", "gas");
    const engie = gasOffers.find((o) => o.supplier_id === "engie")!;
    await page.locator(`[data-offer-id="${engie.id}"]`).getByTestId("offer-cta").click();
    await expect(page.getByTestId("offer-modal-step")).toHaveText("Offerta Gas");
    await page.getByTestId("offer-modal-cta").click();
    await page.waitForURL(/\/attivazione$/);

    const flow = await flowState(page);
    expect(flow.chosenOffers.luce.offer_id).toBe(iberdrola.id);
    expect(flow.chosenOffers.gas.offer_id).toBe(engie.id);
    const last = captured.patches.at(-1)!.data;
    expect(last.step_reached).toBe("offer_chosen");
    expect(last.chosen_offer_luce).toBe(iberdrola.id);
    expect(last.chosen_offer_gas).toBe(engie.id);
    const total =
      monthlyCost(iberdrola, annualFromMonthly(225))! + monthlyCost(engie, annualFromMonthly(60))!;
    expectCents(last.monthly_cost_shown, total);
  });

  // Offers must come from the SERVER repository: an admin change (made through the admin UI,
  // server side) has to reach the customers' results. Uses a business-only gas offer created by
  // the test itself (no other results test looks at gas + Partita IVA) and leaves it deactivated.
  test("results reflect server-side admin changes (create + feature, then deactivate)", async ({ page }, info) => {
    await setup(page, gasCasa({ customerType: "business", manualConsumption: true, manualSmcYear: 720 }));
    const name = `E2E Gas risultati ${info.project.name} ${Date.now()}`;

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@versus.test");
    await page.getByLabel("Password").fill("Versus-Test-Password-2026!");
    const submit = page.getByRole("button", { name: "Accedi" });
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    await submit.click();
    await page.waitForURL((url) => url.pathname === "/admin");

    await page.goto("/admin/offerte/nuova");
    await page.locator("[name=supplier_id]").selectOption("iren");
    await page.locator("[name=name]").fill(name);
    await page.locator("[name=commodity]").selectOption("gas");
    await page.locator("[name=customer_type]").selectOption("business");
    await page.locator("[name=energy_price]").fill("0,0100");
    await page.locator("[name=other_variable_costs]").fill("0");
    await page.locator("[name=fixed_fee]").fill("1");
    await page.locator("[name=fixed_fee_period]").selectOption("month");
    await page.locator("[name=locked_months]").fill("12");
    await page.locator("[name=featured_audience]").selectOption("both");
    await page.getByRole("button", { name: "Crea offerta" }).click();
    await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
    const id = new URL(page.url()).pathname.split("/").pop()!;

    try {
      await page.goto("/offerte?fast=1");
      const mine = page.locator(`[data-testid="offer-card"][data-offer-id="${id}"]`);
      await expect(mine).toBeVisible();
      await expect(mine).toHaveAttribute("data-featured", "true");
      await expect(mine.getByTestId("offer-name")).toHaveText(name);
      // Featured offers come first.
      await expect(page.getByTestId("offer-card").first()).toHaveAttribute("data-featured", "true");
      // Not offered to private customers: the same offer is business-only.
      await page.evaluate((key) => {
        const raw = JSON.parse(window.sessionStorage.getItem(key)!);
        window.sessionStorage.setItem(key, JSON.stringify({ ...raw, customerType: "casa" }));
      }, FLOW_KEY);
      await page.reload();
      await expect(page.getByTestId("offer-card").first()).toBeVisible();
      await expect(mine).toHaveCount(0);
      await page.evaluate((key) => {
        const raw = JSON.parse(window.sessionStorage.getItem(key)!);
        window.sessionStorage.setItem(key, JSON.stringify({ ...raw, customerType: "business" }));
      }, FLOW_KEY);
    } finally {
      // Always restore: un-feature, then deactivate (the default admin view hides inactive rows).
      await page.goto("/admin/offerte");
      const row = page.locator(`[data-testid="offer-row"][data-offer-id="${id}"]`);
      await row.getByTestId("toggle-featured").click();
      await expect(row).toHaveAttribute("data-featured", "false");
      await row.getByTestId("toggle-active").click();
      await expect(row).toHaveCount(0);
    }

    // Deactivated on the server: gone from the results.
    await page.goto("/offerte?fast=1");
    await expect(page.getByTestId("offer-card").first()).toBeVisible();
    await expect(page.locator(`[data-offer-id="${id}"]`)).toHaveCount(0);
  });
});
