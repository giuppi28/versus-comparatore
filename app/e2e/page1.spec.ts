import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Page 1 (PRD §6). The lead API is the real one (mock data layer) unless a test stubs it.
 */

const SHOTS = path.join(__dirname, "screenshots");

test.beforeEach(async ({ page }) => {
  // Every test gets its own client IP so the per-IP rate limits (10 lead creations per
  // 10 minutes) never couple tests or re-runs together.
  const n = Math.floor(Math.random() * 16_000_000);
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`,
  });
});

async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
}

/** Clicks the SelectCard inside the element with the given data-testid. */
function card(page: Page, testId: string) {
  return page.getByTestId(testId).locator("button");
}

async function pick(page: Page, ...testIds: string[]) {
  for (const id of testIds) await card(page, id).click();
}

async function selected(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toHaveAttribute("data-selected", "true");
}

async function notSelected(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toHaveAttribute("data-selected", "false");
}

async function chooseComune(page: Page, query = "Milano") {
  const input = page.locator("#p1-comune");
  await input.fill(query);
  await page.getByRole("option", { name: new RegExp(`^${query}`) }).first().click();
  await expect(input).toHaveValue(query);
}

async function fillPersonal(page: Page, opts: { business?: boolean } = {}) {
  if (opts.business) await page.getByTestId("company-name").fill("Rossi Impianti S.r.l.");
  await page.getByTestId("first-name").fill("Mario");
  await page.getByTestId("last-name").fill("Rossi");
  await page.getByTestId("phone").fill("333 123 4567");
  await chooseComune(page);
}

/** Wait for the real POST /api/lead triggered by ticking the consent. */
async function consent(page: Page) {
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/api/lead") && r.request().method() === "POST",
  );
  await page.getByTestId("privacy-consent").check();
  return created;
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("Page 1 — structure and copy", () => {
  test("shows blocks A–D; consumption appears after commodity + customer type", async ({ page }, testInfo) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("img", { name: "VERSUS — comparatore luce e gas" }).first()).toBeVisible();
    for (const id of ["block-commodity", "block-customer", "block-personal", "block-service"]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    // Cambio fornitore is preselected; the supplier block only needs the commodity.
    await selected(page, "service-cambio");
    await expect(page.getByTestId("block-supplier")).toHaveCount(0);
    await expect(page.getByTestId("block-consumption")).toHaveCount(0);
    await expect(page.getByTestId("company-name")).toHaveCount(0);

    await pick(page, "commodity-luce", "customer-casa");
    await expect(page.getByTestId("block-supplier")).toBeVisible();
    await expect(page.getByTestId("block-consumption")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confronta le offerte" })).toBeVisible();

    // PRD copy rule + brand rules.
    const text = (await page.locator("body").innerText()).toLowerCase();
    expect(text).not.toMatch(/telefonat|chiamat|call center|richiam|ricontatt|callback|demo|facile\.it/);
    await noOverflow(page);

    await page.screenshot({ path: path.join(SHOTS, `page1-${testInfo.project.name}-start.png`), fullPage: true });
  });

  test("Partita IVA asks for the company name and direct consumption (no household questions)", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-business");
    await expect(page.getByTestId("company-name")).toBeVisible();
    await expect(page.getByTestId("manual-kwh")).toBeVisible();
    await expect(page.getByTestId("manual-smc")).toBeVisible();
    await expect(page.getByText(/Lo trovi in bolletta/).first()).toBeVisible();
    await expect(page.getByTestId("people-1")).toHaveCount(0);
    await expect(page.getByTestId("manual-toggle")).toHaveCount(0);
    await expect(page.getByTestId("has-gas-yes")).toHaveCount(0);

    await pick(page, "commodity-luce");
    await expect(page.getByTestId("manual-kwh")).toBeVisible();
    await expect(page.getByTestId("manual-smc")).toHaveCount(0);

    // Back to Casa: household questions return, company name goes away.
    await pick(page, "customer-casa");
    await expect(page.getByTestId("people-1")).toBeVisible();
    await expect(page.getByTestId("company-name")).toHaveCount(0);
  });

  test("keyboard: arrow keys move through the radio cards, fields have labels", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop interaction");
    await open(page);
    await card(page, "commodity-luce").focus();
    await page.keyboard.press("ArrowRight");
    await selected(page, "commodity-gas");
    await page.keyboard.press("ArrowRight");
    await selected(page, "commodity-dual");
    await expect(page.getByLabel(/^Nome/)).toBeVisible();
    await expect(page.getByLabel(/^Cognome/)).toBeVisible();
    await expect(page.getByLabel("Cellulare")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^Comune/ })).toBeVisible();
    await expect(page.getByRole("radiogroup")).not.toHaveCount(0);
  });
});

test.describe("Page 1 — Block D/E rules", () => {
  test("Cambio fornitore is preselected: the current supplier block shows as soon as the commodity is chosen", async ({ page }) => {
    await open(page);
    await selected(page, "service-cambio");
    await notSelected(page, "service-subentro");
    await pick(page, "commodity-gas");
    await expect(page.getByTestId("block-supplier")).toBeVisible();
    await expect(page.getByTestId("supplier-gas")).toBeVisible();
    // Clicking the preselected card again keeps it selected (radio semantics).
    await pick(page, "service-cambio");
    await selected(page, "service-cambio");
    // A refresh keeps the customer's own choice (it does not fall back to the default).
    await pick(page, "service-voltura");
    await page.reload();
    await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
    await selected(page, "service-voltura");
    await expect(page.getByTestId("block-supplier")).toBeVisible();
    await pick(page, "service-subentro");
    await page.reload();
    await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
    await selected(page, "service-subentro");
    await expect(page.getByTestId("block-supplier")).toHaveCount(0);
  });

  test("the supplier block is revealed with an animation and does not scroll the page", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa", "service-subentro");
    await expect(page.getByTestId("block-supplier")).toHaveCount(0);
    const y = await page.evaluate(() => window.scrollY);
    await pick(page, "service-cambio");
    await expect(page.getByTestId("block-supplier")).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test("current supplier only for Cambio fornitore and Voltura", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa");

    for (const hidden of ["service-subentro", "service-primo-allaccio"]) {
      await pick(page, hidden);
      await expect(page.getByTestId("block-supplier")).toHaveCount(0);
      await expect(page.getByTestId("supplier-luce")).toHaveCount(0);
    }
    for (const shown of ["service-cambio", "service-voltura"]) {
      await pick(page, shown);
      await expect(page.getByTestId("block-supplier")).toBeVisible();
      await expect(page.getByTestId("supplier-luce")).toBeVisible();
      await expect(page.getByTestId("supplier-gas")).toHaveCount(0);
    }
  });

  test("supplier list comes from the dropdown suppliers, ordered", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa", "service-cambio");
    const labels = await page.getByTestId("supplier-luce").locator("option").allTextContents();
    expect(labels.slice(0, 4)).toEqual(["Seleziona il fornitore", "Enel Energia", "Eni Plenitude", "Edison Energia"]);
    expect(labels).toEqual(expect.arrayContaining(["Servizio di Tutela / Tutele Graduali", "Altro fornitore", "Non lo so"]));
    expect(labels.at(-1)).toBe("Non lo so");
  });

  test("Luce + Gas shows two separate supplier dropdowns", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-casa", "service-cambio");
    await expect(page.getByTestId("supplier-luce")).toBeVisible();
    await expect(page.getByTestId("supplier-gas")).toBeVisible();
    await expect(page.getByLabel("Fornitore attuale della Luce")).toBeVisible();
    await expect(page.getByLabel("Fornitore attuale del Gas")).toBeVisible();
    await page.getByTestId("supplier-luce").selectOption({ label: "Enel Energia" });
    await page.getByTestId("supplier-gas").selectOption({ label: "Hera Comm" });
    await expect(page.getByTestId("supplier-luce")).toHaveValue("enel-energia");
    await expect(page.getByTestId("supplier-gas")).toHaveValue("hera-comm");
  });

  test("gas-only + 'No gas at home' forces Primo allaccio and hides the gas supplier", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-gas", "customer-casa", "service-cambio");
    await expect(page.getByTestId("supplier-gas")).toBeVisible();

    await pick(page, "has-gas-no");
    await selected(page, "service-primo-allaccio");
    await expect(card(page, "service-cambio")).toBeDisabled();
    await expect(page.getByTestId("block-supplier")).toHaveCount(0);
    await expect(page.getByTestId("service-note")).toContainText("Primo allaccio");

    // "Sì" releases the lock and the customer chooses again.
    await pick(page, "has-gas-yes");
    await expect(card(page, "service-cambio")).toBeEnabled();
    await notSelected(page, "service-primo-allaccio");
  });

  test("Luce + Gas + 'No gas at home': luce supplier stays, gas supplier disappears", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-casa", "service-cambio", "has-gas-no");
    await expect(page.getByTestId("supplier-luce")).toBeVisible();
    await expect(page.getByTestId("supplier-gas")).toHaveCount(0);
    await selected(page, "service-cambio");
    await expect(page.getByTestId("service-note")).toContainText("Per il Gas");
  });
});

test.describe("Page 1 — Block F estimates", () => {
  test("luce: 3 people + frigorifero + lavatrice = ~2.100 kWh/anno", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa");
    await expect(page.getByTestId("estimate-luce")).toHaveCount(0);
    await pick(page, "people-3");
    await expect(page.getByTestId("estimate-luce")).toHaveText("Consumo stimato: ~1.600 kWh/anno");
    await pick(page, "appliance-frigorifero", "appliance-lavatrice");
    await expect(page.getByTestId("estimate-luce")).toHaveText("Consumo stimato: ~2.100 kWh/anno");
    await pick(page, "appliance-scaldabagno");
    await expect(page.getByTestId("estimate-luce")).toHaveText("Consumo stimato: ~3.900 kWh/anno");
    await pick(page, "appliance-scaldabagno");
    await expect(page.getByTestId("estimate-luce")).toHaveText("Consumo stimato: ~2.100 kWh/anno");
    // People is asked once and there is no gas part for a luce-only comparison.
    await expect(page.getByTestId("has-gas-yes")).toHaveCount(0);
    await expect(page.getByTestId("estimate-gas")).toHaveCount(0);
  });

  test("gas: 2 people, cucina + acqua calda = ~200 Smc/anno", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-gas", "customer-casa", "people-2", "has-gas-yes", "gas-use-cucina", "gas-use-acqua_calda");
    await expect(page.getByTestId("estimate-gas")).toHaveText("Consumo stimato: ~200 Smc/anno");
    await expect(page.getByTestId("appliance-forno")).toHaveCount(0);
    await expect(page.getByTestId("estimate-luce")).toHaveCount(0);
    await expect(page.getByTestId("sqm-lt60")).toHaveCount(0);
  });

  test("riscaldamento asks for m²; Milano (zone E), 90–120 m² = ~1.365 Smc/anno", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-gas", "customer-casa", "people-2", "has-gas-yes");
    await chooseComune(page, "Milano");
    await pick(page, "gas-use-riscaldamento");
    await expect(page.getByTestId("sqm-lt60")).toBeVisible();
    await expect(page.getByTestId("estimate-gas")).toHaveCount(0); // incomplete without m²
    await pick(page, "sqm-90_120");
    await expect(page.getByTestId("estimate-gas")).toHaveText("Consumo stimato: ~1.365 Smc/anno");
    // The zone follows the comune: Belluno is zone F (16): 105 x 16.
    await chooseComune(page, "Belluno");
    await expect(page.getByTestId("estimate-gas")).toHaveText("Consumo stimato: ~1.680 Smc/anno");
  });

  test("Luce + Gas shows both parts and both estimates, people asked once", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-casa", "people-4", "appliance-forno", "has-gas-yes", "gas-use-cucina");
    await expect(page.getByTestId("estimate-luce")).toHaveText("Consumo stimato: ~2.050 kWh/anno");
    await expect(page.getByTestId("estimate-gas")).toHaveText("Consumo stimato: ~80 Smc/anno");
    await expect(page.getByText("Quante persone vivono in casa?")).toHaveCount(1);
  });

  test("'Conosco il mio consumo' switches to manual kWh / Smc entry", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-casa", "people-2", "has-gas-yes", "gas-use-cucina");
    await expect(page.getByTestId("estimate-luce")).toBeVisible();

    await page.getByTestId("manual-toggle").check();
    await expect(page.getByTestId("estimate-luce")).toHaveCount(0);
    await expect(page.getByTestId("estimate-gas")).toHaveCount(0);
    await expect(page.getByTestId("people-1")).toHaveCount(0);
    await page.getByTestId("manual-kwh").fill("2700");
    await page.getByTestId("manual-smc").fill("800");
    await expect(page.getByTestId("manual-kwh")).toHaveValue("2700");

    await page.getByTestId("manual-toggle").uncheck();
    await expect(page.getByTestId("manual-kwh")).toHaveCount(0);
    await expect(page.getByTestId("estimate-luce")).toBeVisible();
  });
});

test.describe("Page 1 — validation", () => {
  test("empty submit shows inline errors and scrolls to the first one", async ({ page }, testInfo) => {
    await open(page);
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("error-commodity")).toHaveText("Scegli cosa vuoi confrontare.");
    await expect(page.getByTestId("error-customerType")).toBeVisible();
    await expect(page.getByText("Inserisci il tuo nome.")).toBeVisible();
    await expect(page.getByText("Inserisci il tuo cognome.")).toBeVisible();
    await expect(page.getByText("Inserisci il numero di cellulare.")).toBeVisible();
    await expect(page.getByText("Cerca e seleziona il tuo comune dall'elenco.")).toBeVisible();
    await expect(page.getByTestId("error-privacy")).toBeVisible();
    // The service is preselected (Cambio fornitore), so it can never be missing on submit.
    await expect(page.getByTestId("error-serviceType")).toHaveCount(0);
    await selected(page, "service-cambio");
    // Focus lands on the first invalid group and it is in view.
    await expect(card(page, "commodity-luce")).toBeFocused();
    await expect(page.getByTestId("error-commodity")).toBeInViewport();
    await expect(page).toHaveURL(/\/$/);

    await page.screenshot({ path: path.join(SHOTS, `page1-${testInfo.project.name}-errors.png`), fullPage: true });

    // Errors clear live as the fields get valid.
    await pick(page, "commodity-gas");
    await expect(page.getByTestId("error-commodity")).toHaveCount(0);
  });

  test("scrolls to a field far down the page", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa", "service-subentro", "people-2");
    await fillPersonal(page);
    await consent(page);
    await page.getByTestId("first-name").fill("");
    await page.getByTestId("submit").click();
    await expect(page.getByText("Inserisci il tuo nome.")).toBeVisible();
    await expect(page.getByTestId("first-name")).toBeFocused();
    await expect(page.getByTestId("first-name")).toBeInViewport();
  });

  test("phone is validated with the shared validator", async ({ page }) => {
    await open(page);
    await page.getByTestId("phone").fill("12345");
    await page.getByTestId("submit").click();
    await expect(page.getByText(/numero di cellulare italiano valido/)).toBeVisible();
    await page.getByTestId("phone").fill("+39 333 123 4567");
    await expect(page.getByText(/numero di cellulare italiano valido/)).toHaveCount(0);
  });

  test("Partita IVA: company name and manual consumption are required", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-business", "service-subentro");
    await page.getByTestId("submit").click();
    await expect(page.getByText("Inserisci la ragione sociale.")).toBeVisible();
    await expect(page.getByText("Inserisci il consumo annuo di energia elettrica (kWh).")).toBeVisible();
    await expect(page.getByText("Inserisci il consumo annuo di gas (Smc).")).toBeVisible();
    await page.getByTestId("manual-kwh").fill("0");
    await expect(page.getByText("Inserisci un valore maggiore di zero.")).toBeVisible();
  });

  test("required current supplier, gas answers and m² when riscaldamento", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-casa", "service-cambio");
    await page.getByTestId("submit").click();
    await expect(page.getByText("Seleziona il fornitore attuale.")).toHaveCount(2);
    await expect(page.getByTestId("error-people")).toBeVisible();
    await expect(page.getByTestId("error-hasGas")).toBeVisible();
    await expect(page.getByTestId("error-gasUses")).toBeVisible();

    await pick(page, "has-gas-yes", "gas-use-riscaldamento");
    await expect(page.getByTestId("error-sqmRange")).toBeVisible();
    await pick(page, "sqm-60_90");
    await expect(page.getByTestId("error-sqmRange")).toHaveCount(0);
  });

  test("privacy consent is required before submitting", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa", "service-subentro", "people-2");
    await fillPersonal(page);
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("error-privacy")).toContainText("informativa sulla privacy");
    await expect(page.getByTestId("privacy-consent")).toBeFocused();
  });
});

test.describe("Page 1 — lead creation and submit", () => {
  test("ticking the privacy consent creates the lead (POST /api/lead 201)", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa");
    await fillPersonal(page);
    const response = await consent(page);
    expect(response.status()).toBe(201);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "versus_lead")?.httpOnly).toBe(true);
    // The state remembers the lead.
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem("versus.flow.v1") ?? "{}"));
    expect(stored.leadCreated).toBe(true);
    expect(stored.privacyConsent).toBe(true);
  });

  test("consent creation sends only what is valid so far (no personal data needed)", async ({ page }) => {
    await open(page);
    const request = page.waitForRequest((r) => r.url().endsWith("/api/lead") && r.method() === "POST");
    await consent(page);
    const body = (await request).postDataJSON();
    // Cambio fornitore is preselected, so it is part of what is "valid so far".
    expect(body).toEqual({ data: { privacy_consent: true, service_type: "cambio_fornitore" } });
  });

  test("API errors are shown inline (429 → 'Troppe richieste, riprova tra poco.')", async ({ page }) => {
    await page.route("**/api/lead", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 429,
            headers: { "Retry-After": "30" },
            json: { ok: false, error: "rate_limited" },
          })
        : route.continue(),
    );
    await open(page);
    await page.getByTestId("privacy-consent").check();
    await expect(page.getByTestId("consent-error")).toHaveText("Troppe richieste, riprova tra poco.");
    await expect(page.getByTestId("privacy-consent")).toBeChecked();
  });

  test("full Casa Luce flow: submit saves the data and goes to /offerte", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-luce", "customer-casa", "service-cambio", "people-3", "appliance-frigorifero", "appliance-lavatrice");
    await page.getByTestId("supplier-luce").selectOption({ label: "Enel Energia" });
    await fillPersonal(page);
    await consent(page);

    const patched = page.waitForRequest((r) => r.url().endsWith("/api/lead") && r.method() === "PATCH");
    await page.getByTestId("submit").click();
    const patch = (await patched).postDataJSON().data;
    expect(patch).toMatchObject({
      commodity: "luce",
      customer_type: "casa",
      first_name: "Mario",
      last_name: "Rossi",
      phone: "3331234567",
      comune_istat: "015146",
      service_type: "cambio_fornitore",
      current_supplier_luce: "enel-energia",
      people: 3,
      appliances: ["frigorifero", "lavatrice"],
      estimated_kwh_year: 2100,
      manual_consumption: false,
    });
    expect(patch).not.toHaveProperty("step_reached");
    expect(patch).not.toHaveProperty("privacy_consent");
    await expect(page).toHaveURL(/\/offerte$/);
  });

  test("Luce + Gas Partita IVA: submit without a prior consent tick creates the lead then saves", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-business", "service-subentro");
    await fillPersonal(page, { business: true });
    await page.getByTestId("manual-kwh").fill("12000");
    await page.getByTestId("manual-smc").fill("3000");
    await page.getByTestId("privacy-consent").check();

    const patched = page.waitForRequest((r) => r.url().endsWith("/api/lead") && r.method() === "PATCH");
    await page.getByTestId("submit").click();
    const patch = (await patched).postDataJSON().data;
    expect(patch).toMatchObject({
      commodity: "dual",
      customer_type: "business",
      company_name: "Rossi Impianti S.r.l.",
      estimated_kwh_year: 12000,
      estimated_smc_year: 3000,
      manual_consumption: true,
    });
    await expect(page).toHaveURL(/\/offerte$/);
  });

  test("an expired lead cookie is recovered: the lead is created again before saving", async ({ page }) => {
    let patches = 0;
    let creates = 0;
    await page.route("**/api/lead", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        creates += 1;
        return route.fulfill({ status: 201, json: { ok: true } });
      }
      patches += 1;
      return patches === 1
        ? route.fulfill({ status: 401, json: { ok: false, error: "no_lead" } })
        : route.fulfill({ status: 200, json: { ok: true } });
    });
    await open(page);
    await pick(page, "commodity-luce", "customer-casa", "service-subentro", "people-1");
    await fillPersonal(page);
    await page.getByTestId("privacy-consent").check();
    await expect.poll(() => creates).toBe(1);
    await page.getByTestId("submit").click();
    await expect(page).toHaveURL(/\/offerte$/);
    expect(creates).toBe(2);
    expect(patches).toBe(2);
  });

  test("a failing save keeps the user on the page with an Italian message", async ({ page }) => {
    await page.route("**/api/lead", (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({ status: 429, json: { ok: false, error: "rate_limited" } })
        : route.fulfill({ status: 201, json: { ok: true } }),
    );
    await open(page);
    await pick(page, "commodity-luce", "customer-casa", "service-subentro", "people-1");
    await fillPersonal(page);
    await page.getByTestId("privacy-consent").check();
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("form-error")).toHaveText("Troppe richieste, riprova tra poco.");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("submit")).toBeEnabled();
  });
});

test.describe("Page 1 — persistence", () => {
  test("a refresh keeps every input and the live estimates", async ({ page }) => {
    await open(page);
    await pick(
      page,
      "commodity-dual",
      "customer-casa",
      "service-cambio",
      "people-2",
      "appliance-forno",
      "has-gas-yes",
      "gas-use-riscaldamento",
      "gas-use-cucina",
      "sqm-60_90",
    );
    await page.getByTestId("supplier-luce").selectOption({ label: "Edison Energia" });
    await page.getByTestId("supplier-gas").selectOption({ label: "Iren" });
    await fillPersonal(page);
    await consent(page);

    const creations: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith("/api/lead") && r.method() === "POST") creations.push(r.url());
    });
    await page.reload();
    await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");

    await selected(page, "commodity-dual");
    await selected(page, "customer-casa");
    await selected(page, "service-cambio");
    await selected(page, "people-2");
    await selected(page, "appliance-forno");
    await selected(page, "has-gas-yes");
    await selected(page, "gas-use-riscaldamento");
    await selected(page, "gas-use-cucina");
    await selected(page, "sqm-60_90");
    await expect(page.getByTestId("supplier-luce")).toHaveValue("edison-energia");
    await expect(page.getByTestId("supplier-gas")).toHaveValue("iren");
    await expect(page.getByTestId("first-name")).toHaveValue("Mario");
    await expect(page.getByTestId("last-name")).toHaveValue("Rossi");
    await expect(page.getByTestId("phone")).toHaveValue("333 123 4567");
    await expect(page.locator("#p1-comune")).toHaveValue("Milano");
    await expect(page.getByTestId("privacy-consent")).toBeChecked();
    await expect(page.getByTestId("estimate-luce")).toHaveText("Consumo stimato: ~1.450 kWh/anno");
    // 75 m² x 13 + cucina (40 + 2 x 10) = 975 + 60
    await expect(page.getByTestId("estimate-gas")).toHaveText("Consumo stimato: ~1.035 Smc/anno");
    // The lead already exists: no new creation request after the refresh.
    expect(creations).toEqual([]);
  });

  test("manual consumption and Partita IVA data survive a refresh", async ({ page }) => {
    await open(page);
    await pick(page, "commodity-gas", "customer-business", "service-voltura");
    await page.getByTestId("company-name").fill("Bar Sport");
    await page.getByTestId("manual-smc").fill("4200");
    await page.reload();
    await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
    await selected(page, "customer-business");
    await expect(page.getByTestId("company-name")).toHaveValue("Bar Sport");
    await expect(page.getByTestId("manual-smc")).toHaveValue("4200");
    await expect(page.getByTestId("supplier-gas")).toBeVisible();
  });
});

test.describe("Page 1 — layout screenshots", () => {
  test("filled Luce + Gas page has no horizontal overflow", async ({ page }, testInfo) => {
    await open(page);
    await pick(
      page,
      "commodity-dual",
      "customer-casa",
      "service-cambio",
      "people-3",
      "appliance-frigorifero",
      "appliance-scaldabagno",
      "has-gas-yes",
      "gas-use-cucina",
      "gas-use-riscaldamento",
      "gas-use-acqua_calda",
      "sqm-90_120",
    );
    await fillPersonal(page);
    await page.getByTestId("supplier-luce").selectOption({ label: "Enel Energia" });
    await page.getByTestId("supplier-gas").selectOption({ label: "Eni Plenitude" });
    await consent(page);
    await noOverflow(page);
    await page.screenshot({ path: path.join(SHOTS, `page1-${testInfo.project.name}-filled.png`), fullPage: true });
  });

  test("Partita IVA layout", async ({ page }, testInfo) => {
    await open(page);
    await pick(page, "commodity-dual", "customer-business", "service-voltura");
    await noOverflow(page);
    await page.screenshot({ path: path.join(SHOTS, `page1-${testInfo.project.name}-business.png`), fullPage: true });
  });
});
