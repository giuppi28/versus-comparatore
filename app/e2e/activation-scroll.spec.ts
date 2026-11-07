/**
 * T18.5: a blocked or failed submit in the activation steps scrolls to the FIRST problem and moves
 * the focus there (field, card group, form-level message). Same seeding and mocks as activation.spec.ts.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

const FLOW_KEY = "versus.flow.v1";
const CF_MARIO_ROSSI = "RSSMRA85T10A562S";
const POD = "IT001E12345678";

const luceOffer = {
  offer_id: "offer-edison-luce-fissa-12",
  commodity: "luce",
  offer_name: "Edison Luce Fissa 12",
  supplier_id: "edison-energia",
  supplier_name: "Edison Energia",
  supplier_logo_path: null,
  energy_price: 0.129,
  other_variable_costs: 0,
  fixed_fee_monthly: 9,
  other_fixed_costs_monthly: 0,
  locked_months: 12,
  activation_cost: 0,
  promo_text: null,
  monthly_cost: 50,
};

const flow = {
  version: 1,
  commodity: "luce",
  customerType: "casa",
  firstName: "Mario",
  lastName: "Rossi",
  phone: "333 123 4567",
  email: "mario.rossi@example.it",
  comune: { istat: "015146", name: "Milano", province: "MI", caps: ["20121", "20122"], climate_zone: "E" },
  privacyConsent: true,
  serviceType: "cambio_fornitore",
  currentSupplierLuce: "enel-energia",
  people: 2,
  gasUses: [],
  estimatedKwhYear: 1600,
  estimatedSmcYear: 500,
  chosenOffers: { luce: luceOffer, gas: null },
  leadCreated: true,
};

async function open(page: Page) {
  await page.route(
    (url) => url.pathname === "/offerte",
    (route) =>
      route.request().resourceType() === "document"
        ? route.fulfill({ contentType: "text/html", body: "<html><body>offerte</body></html>" })
        : route.abort(),
  );
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("e2e.seeded")) return;
      sessionStorage.setItem("e2e.seeded", "1");
      sessionStorage.setItem(key as string, value as string);
    },
    [FLOW_KEY, JSON.stringify(flow)],
  );
  await page.goto("/attivazione");
}

const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
const radio = (page: Page, testId: string) => page.getByTestId(testId).getByRole("radio");

async function fillStepA(page: Page) {
  await field(page, "tax_code").fill(CF_MARIO_ROSSI);
  await radio(page, "housing_title-proprietario").click();
}

async function toStepB(page: Page) {
  await fillStepA(page);
  await page.getByTestId("activation-next").click();
  await expect(page.getByTestId("activation-step-b")).toBeVisible();
}

/** Everything of step B except what the test leaves out. */
async function fillStepB(page: Page, skip: "voltage" | "resident" | "none" = "none") {
  await field(page, "cap").selectOption("20122");
  await field(page, "address").fill("Via Roma");
  await field(page, "street_number").fill("12/A");
  if (skip !== "resident") await radio(page, "is_resident-yes").click();
  await field(page, "pod").fill(POD);
  if (skip !== "voltage") await radio(page, "voltage-220").click();
}

/** The whole element is on screen and the focus is on it or inside it. */
async function expectShownAndFocused(el: Locator) {
  await expect(el).toBeInViewport({ ratio: 1 });
  await expect
    .poll(() => el.evaluate((n) => n === document.activeElement || n.contains(document.activeElement)))
    .toBe(true);
}

test.describe("activation: blocked submit scrolls to the first problem", () => {
  test("step B, only the voltage missing", async ({ page }) => {
    await open(page);
    await toStepB(page);
    await fillStepB(page, "voltage");
    await page.getByTestId("activation-submit").click();

    const group = page.getByRole("radiogroup", { name: /Livello di tensione/ });
    await expect(group).toHaveAttribute("aria-invalid", "true");
    await expect(group).toHaveAttribute("aria-describedby", "voltage-error");
    await expect(page.locator("#voltage-error")).toBeVisible();
    await expectShownAndFocused(group);
    await expect(group.getByRole("radio").first()).toBeFocused();
    await page.screenshot({ path: "e2e/screenshots/activation-scroll-voltage.png" });
  });

  test("step B, only 'Sei residente' missing", async ({ page }) => {
    await open(page);
    await toStepB(page);
    await fillStepB(page, "resident");
    await page.getByTestId("activation-submit").click();

    const group = page.getByRole("radiogroup", { name: /Sei residente/ });
    await expect(group).toHaveAttribute("aria-invalid", "true");
    await expectShownAndFocused(group);
  });

  test("step B, first of several problems wins (document order)", async ({ page }) => {
    await open(page);
    await toStepB(page);
    await page.getByTestId("activation-submit").click();
    // CAP is the first thing to fill and is the first problem in the page.
    await expectShownAndFocused(field(page, "cap"));
  });

  test("step A, housing title missing", async ({ page }) => {
    await open(page);
    await field(page, "tax_code").fill(CF_MARIO_ROSSI);
    await page.getByTestId("activation-next").click();

    const group = page.getByRole("radiogroup", { name: /alloggio/ });
    await expect(group).toHaveAttribute("aria-invalid", "true");
    await expectShownAndFocused(group);
    await expect(group.getByRole("radio").first()).toBeFocused();
  });

  test("step A, a plain field missing is still focused", async ({ page }) => {
    await open(page);
    await radio(page, "housing_title-proprietario").click();
    await page.getByTestId("activation-next").click();
    await expectShownAndFocused(field(page, "tax_code"));
  });

  test("a failed submit (network/server error) scrolls to the message", async ({ page }) => {
    await page.route("**/api/lead/complete", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "server_error" }) }),
    );
    await open(page);
    await toStepB(page);
    await fillStepB(page);
    await page.getByTestId("activation-submit").click();
    const msg = page.getByTestId("activation-error");
    await expect(msg).toContainText("Si è verificato un problema");
    await expectShownAndFocused(msg);
  });

  test("a form-level server message scrolls to the top message", async ({ page }) => {
    await page.route("**/api/lead/complete", (route) =>
      route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "validation", fields: { chosen_offer_luce: "not_available" } }),
      }),
    );
    await open(page);
    await toStepB(page);
    await fillStepB(page);
    await page.getByTestId("activation-submit").click();
    const msg = page.getByTestId("activation-general-error");
    await expect(msg).toContainText("non è più disponibile");
    await expectShownAndFocused(msg);
  });
});
