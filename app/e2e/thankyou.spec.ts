import { expect, test, type Page } from "@playwright/test";

// Expected values use the Italian formatting of formatEuro / formatPrice (NBSP before €).
const NBSP = " ";

const luceOffer = {
  offer_id: "offer-luce",
  commodity: "luce",
  offer_name: "Luce Semplice",
  supplier_id: "sup-1",
  supplier_name: "Alfa Energia",
  supplier_logo_path: null,
  energy_price: 0.129,
  other_variable_costs: 0.01,
  fixed_fee_monthly: 4.5,
  other_fixed_costs_monthly: 1,
  locked_months: 12,
  activation_cost: 0,
  promo_text: null,
  monthly_cost: 52.34,
};

const gasOffer = {
  ...luceOffer,
  offer_id: "offer-gas",
  commodity: "gas",
  offer_name: "Gas Stabile",
  supplier_name: "Beta Gas",
  energy_price: 0.9,
  fixed_fee_monthly: 6,
  locked_months: 1,
  monthly_cost: 40.1,
};

/** Partial flow state: loadFlowState merges it with the initial state. */
function seededFlow(
  chosenOffers: { luce: unknown; gas: unknown },
  firstName = "Mario",
  leadCompleted = true,
) {
  return JSON.stringify({
    version: 1,
    commodity: chosenOffers.gas ? (chosenOffers.luce ? "luce_gas" : "gas") : "luce",
    customerType: "private",
    firstName,
    lastName: "Rossi",
    phone: "3331234567",
    chosenOffers,
    leadCreated: true,
    leadCompleted,
  });
}

/** Seeds sessionStorage once per browser context (a reload keeps what the page left). */
async function seedFlow(page: Page, flow: string | null) {
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("e2e.seeded")) return;
    sessionStorage.setItem("e2e.seeded", "1");
    if (value === null) {
      sessionStorage.removeItem("versus.flow.v1");
    } else {
      sessionStorage.setItem("versus.flow.v1", value);
    }
  }, flow);
}

function screenshotName(width: number, variant: "single" | "dual") {
  const suffix = variant === "dual" ? "-dual" : "";
  return width <= 430 ? `thankyou${suffix}-390.png` : `thankyou${suffix}-1440.png`;
}

test.describe("thank-you page /grazie", () => {
  test("single luce offer: greeting, callback text and offer summary", async ({ page }) => {
    await seedFlow(page, seededFlow({ luce: luceOffer, gas: null }));
    await page.goto("/grazie");

    await expect(page.getByTestId("thankyou-heading")).toHaveText("Grazie, Mario!");
    await expect(
      page.getByText(
        "Sarai ricontattato a breve da un nostro consulente per confermare l'attivazione della tua offerta.",
      ),
    ).toBeVisible();

    const summary = page.getByTestId("thankyou-summary");
    await expect(summary).toContainText("Luce");
    await expect(summary).toContainText("Alfa Energia");
    await expect(summary).toContainText("Luce Semplice");
    await expect(summary).toContainText(`52,34${NBSP}€`);
    await expect(summary).toContainText("12 mesi");
    await expect(summary).toContainText(`0,1290${NBSP}€/kWh`);
    await expect(summary).toContainText(`4,50${NBSP}€/mese`);
    await expect(summary).not.toContainText("Gas Stabile");

    // Single offer: no total row.
    await expect(page.getByTestId("thankyou-total")).toHaveCount(0);
    await expect(page.getByText("Stima IVA esclusa.")).toBeVisible();

    await page.screenshot({ path: `e2e/screenshots/${screenshotName(page.viewportSize()?.width ?? 1440, "single")}`, fullPage: true });
  });

  test("dual luce + gas: both offers and the total monthly cost", async ({ page }) => {
    await seedFlow(page, seededFlow({ luce: luceOffer, gas: gasOffer }, "Anna"));
    await page.goto("/grazie");

    await expect(page.getByTestId("thankyou-heading")).toHaveText("Grazie, Anna!");
    await expect(page.getByTestId("thankyou-offer-luce")).toContainText("Alfa Energia");
    await expect(page.getByTestId("thankyou-offer-gas")).toContainText("Beta Gas");
    await expect(page.getByTestId("thankyou-offer-gas")).toContainText("Gas Stabile");
    await expect(page.getByTestId("thankyou-offer-gas")).toContainText(`0,9000${NBSP}€/Smc`);
    await expect(page.getByTestId("thankyou-offer-gas")).toContainText(`40,10${NBSP}€`);
    await expect(page.getByTestId("thankyou-offer-gas")).toContainText("1 mese");

    // 52.34 + 40.10 = 92.44
    await expect(page.getByTestId("thankyou-total")).toContainText(`92,44${NBSP}€`);
    await expect(page.getByTestId("thankyou-summary")).toBeVisible();
    await expect(page.getByTestId("thankyou-summary")).not.toContainText("92,44");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.screenshot({ path: `e2e/screenshots/${screenshotName(page.viewportSize()?.width ?? 1440, "dual")}`, fullPage: true });
  });

  test("supplier logo is shown when available, text chip otherwise", async ({ page }) => {
    await seedFlow(
      page,
      seededFlow({ luce: { ...luceOffer, supplier_logo_path: "/brand/versus_icona.svg" }, gas: gasOffer }, "Anna"),
    );
    await page.goto("/grazie");

    const luceLogo = page.getByTestId("thankyou-logo-luce");
    await expect(luceLogo.getByRole("img", { name: "Alfa Energia" })).toBeVisible();
    // No logo path: the neutral text chip with the supplier name.
    const gasLogo = page.getByTestId("thankyou-logo-gas");
    await expect(gasLogo.getByRole("img")).toHaveCount(0);
    await expect(gasLogo).toHaveText("Beta Gas");

    const suffix = (page.viewportSize()?.width ?? 1440) <= 430 ? "390" : "1440";
    await page.screenshot({ path: `e2e/screenshots/thankyou-dual-logo-${suffix}.png`, fullPage: true });
  });

  test("the flow is reset after display; a refresh redirects to the home page", async ({ page }) => {
    await seedFlow(page, seededFlow({ luce: luceOffer, gas: null }));
    await page.goto("/grazie");
    await expect(page.getByTestId("thankyou-heading")).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("versus.flow.v1")))
      .toBeNull();

    await page.reload();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Torna alla home resets the flow and navigates to /", async ({ page }) => {
    await seedFlow(page, seededFlow({ luce: luceOffer, gas: null }));
    await page.goto("/grazie");
    await page.getByRole("button", { name: "Torna alla home" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    const stored = await page.evaluate(() => sessionStorage.getItem("versus.flow.v1"));
    // Page 1 may re-seed a pristine state (preselected service type): no lead data may remain.
    if (stored !== null) {
      const flow = JSON.parse(stored);
      expect(flow.firstName).toBe("");
      expect(flow.leadCompleted).toBe(false);
      expect(flow.chosenOffers).toEqual({ luce: null, gas: null });
    }
  });

  test("chosen offer but lead not completed redirects to /", async ({ page }) => {
    await seedFlow(page, seededFlow({ luce: luceOffer, gas: null }, "Mario", false));
    await page.goto("/grazie");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("thankyou-heading")).toHaveCount(0);
  });

  test("empty flow (no first name / no offer) redirects to /", async ({ page }) => {
    await seedFlow(page, null);
    await page.goto("/grazie");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("thankyou-heading")).toHaveCount(0);
  });

  test("a flow with a name but no chosen offer redirects to /", async ({ page }) => {
    await seedFlow(page, seededFlow({ luce: null, gas: null }));
    await page.goto("/grazie");
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("a flow with an offer but no first name redirects to /", async ({ page }) => {
    await seedFlow(page, seededFlow({ luce: luceOffer, gas: null }, "   "));
    await page.goto("/grazie");
    await page.waitForURL((url) => url.pathname === "/");
  });
});
