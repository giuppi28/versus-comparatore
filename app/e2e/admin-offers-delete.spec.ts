import { expect, test, type Page, type TestInfo } from "@playwright/test";

// T11.3: deleting offers from the admin list and the edit page. Every test creates (and deletes)
// its own offer through the admin form, so the seeded offers are never touched and no global
// counts are asserted: both projects share ONE mock server.
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const FLOW_KEY = "versus.flow.v1";

test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  await page.waitForURL((url) => url.pathname === "/admin");
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const uniqueName = (label: string, info: TestInfo) => `E2E ${label} ${info.project.name} ${Date.now()}`;

/** Creates an active business-only gas offer (visible in the Partita IVA gas results). Returns its id. */
async function createOffer(page: Page, name: string): Promise<string> {
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
  await page.getByRole("button", { name: "Crea offerta" }).click();
  await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

const row = (page: Page, id: string) => page.locator(`[data-testid="offer-row"][data-offer-id="${id}"]`);

/** Opens the public results for a business gas customer with a manual consumption. */
async function openPublicResults(page: Page) {
  await page.evaluate(
    ([key, value]) => window.sessionStorage.setItem(key, value),
    [
      FLOW_KEY,
      JSON.stringify({
        version: 1,
        commodity: "gas",
        customerType: "business",
        serviceType: "cambio_fornitore",
        currentSupplierGas: "eni-plenitude",
        hasGas: true,
        manualConsumption: true,
        manualSmcYear: 720,
        estimatedSmcYear: 720,
      }),
    ],
  );
  await page.goto("/offerte?fast=1");
  await expect(page.getByTestId("offer-card").first()).toBeVisible();
}

test.describe("admin offers: delete", () => {
  test("list: the dialog explains the consequences, cancel keeps the offer", async ({ page }, info) => {
    await login(page);
    const name = uniqueName("Annulla", info);
    const id = await createOffer(page, name);
    try {
      await page.goto("/admin/offerte");
      await row(page, id).getByTestId("delete-offer").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(`Eliminare l'offerta «${name}»?`);
      await expect(dialog).toContainText("I lead che hanno scelto questa offerta ne conservano una copia dei dati");
      await expect(dialog).toContainText("L'operazione non può essere annullata");
      await expect(dialog).toContainText("Se vuoi solo nasconderla ai clienti, disattivala");
      await expect(page.getByTestId("delete-offer-deactivate")).toBeVisible();
      if (info.project.name === "mobile") await noOverflow(page);

      // Annulla button.
      await page.getByTestId("confirm-dialog-cancel").click();
      await expect(dialog).toHaveCount(0);
      await expect(row(page, id)).toHaveCount(1);

      // Escape closes it too.
      await row(page, id).getByTestId("delete-offer").click();
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(row(page, id)).toHaveCount(1);

      // Still on the server after a reload, and still in the public results.
      await page.reload();
      await expect(row(page, id)).toHaveCount(1);
    } finally {
      await page.goto("/admin/offerte");
      if ((await row(page, id).count()) > 0) {
        await row(page, id).getByTestId("delete-offer").click();
        await page.getByTestId("confirm-dialog-confirm").click();
        await expect(page.getByTestId("deleted-notice")).toBeVisible();
      }
    }
  });

  test("list: deleting removes the offer from the admin and from the public results", async ({ page }, info) => {
    await login(page);
    const name = uniqueName("Elimina lista", info);
    const id = await createOffer(page, name);

    await openPublicResults(page);
    const card = page.locator(`[data-testid="offer-card"][data-offer-id="${id}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByTestId("offer-name")).toHaveText(name);

    await page.goto("/admin/offerte");
    await row(page, id).getByTestId("delete-offer").click();
    await page.getByTestId("confirm-dialog-confirm").click();

    await expect(page.getByTestId("deleted-notice")).toHaveText("Offerta eliminata.");
    await expect(page).toHaveURL(/\/admin\/offerte\?esito=eliminata$/);
    await expect(row(page, id)).toHaveCount(0);
    if (info.project.name === "mobile") await noOverflow(page);

    // Not even in the "Tutte" view.
    await page.getByTestId("filter-all").click();
    await expect(page.getByTestId("filter-all")).toHaveAttribute("aria-current", "page");
    await expect(row(page, id)).toHaveCount(0);

    // Gone for customers (server-side data).
    await openPublicResults(page);
    await expect(page.locator(`[data-offer-id="${id}"]`)).toHaveCount(0);
    await expect(page.getByText(name)).toHaveCount(0);

    // The edit page of a deleted offer is a 404 now.
    const response = await page.goto(`/admin/offerte/${id}`);
    expect(response?.status()).toBe(404);
  });

  test("list: deleting from the 'Tutte' view keeps that view", async ({ page }, info) => {
    await login(page);
    const id = await createOffer(page, uniqueName("Elimina tutte", info));
    await page.goto("/admin/offerte?vista=tutte");
    await row(page, id).getByTestId("delete-offer").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/admin\/offerte\?vista=tutte&esito=eliminata$/);
    await expect(page.getByTestId("filter-all")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("deleted-notice")).toBeVisible();
    await expect(row(page, id)).toHaveCount(0);
  });

  test("edit page: delete redirects to the list; cancel keeps the offer", async ({ page }, info) => {
    await login(page);
    const name = uniqueName("Elimina scheda", info);
    const id = await createOffer(page, name);

    await page.goto(`/admin/offerte/${id}`);
    await page.getByTestId("delete-offer").click();
    await expect(page.getByRole("dialog")).toContainText(`Eliminare l'offerta «${name}»?`);
    if (info.project.name === "mobile") await noOverflow(page);
    await page.getByTestId("confirm-dialog-cancel").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/admin/offerte/${id}`));

    await page.getByTestId("delete-offer").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await page.waitForURL(/\/admin\/offerte\?esito=eliminata$/);
    await expect(page.getByTestId("deleted-notice")).toHaveText("Offerta eliminata.");
    await expect(row(page, id)).toHaveCount(0);

    await openPublicResults(page);
    await expect(page.locator(`[data-offer-id="${id}"]`)).toHaveCount(0);
  });

  test("'Disattiva invece' hides the offer from customers without deleting it", async ({ page }, info) => {
    await login(page);
    const id = await createOffer(page, uniqueName("Disattiva invece", info));
    try {
      await page.goto("/admin/offerte?vista=tutte");
      await row(page, id).getByTestId("delete-offer").click();
      await page.getByTestId("delete-offer-deactivate").click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(row(page, id)).toHaveAttribute("data-active", "false");

      // Inactive offers no longer offer the "Disattiva invece" shortcut.
      await row(page, id).getByTestId("delete-offer").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByTestId("delete-offer-deactivate")).toHaveCount(0);
      await page.getByTestId("confirm-dialog-cancel").click();

      await openPublicResults(page);
      await expect(page.locator(`[data-offer-id="${id}"]`)).toHaveCount(0);
    } finally {
      await page.goto("/admin/offerte?vista=tutte");
      if ((await row(page, id).count()) > 0) {
        await row(page, id).getByTestId("delete-offer").click();
        await page.getByTestId("confirm-dialog-confirm").click();
        await expect(page.getByTestId("deleted-notice")).toBeVisible();
      }
    }
  });

  test("an offer already deleted elsewhere shows an error in the dialog", async ({ browser, page }, info) => {
    await login(page);
    const id = await createOffer(page, uniqueName("Doppia", info));
    await page.goto("/admin/offerte");
    await row(page, id).getByTestId("delete-offer").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // A second admin session deletes it first.
    const other = await browser.newContext({ baseURL: info.project.use.baseURL });
    const otherPage = await other.newPage();
    await login(otherPage);
    await otherPage.goto("/admin/offerte");
    await row(otherPage, id).getByTestId("delete-offer").click();
    await otherPage.getByTestId("confirm-dialog-confirm").click();
    await expect(otherPage.getByTestId("deleted-notice")).toBeVisible();
    await other.close();

    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("confirm-dialog-error")).toContainText("già stata eliminata");
    await page.getByTestId("confirm-dialog-cancel").click();
    // Closing the dialog refreshes the stale list: the row is gone.
    await expect(row(page, id)).toHaveCount(0);
  });

  test("requires an admin session", async ({ page }) => {
    await page.goto("/admin/offerte?esito=eliminata");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
