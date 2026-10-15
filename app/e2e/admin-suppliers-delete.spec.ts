import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Must match the webServer env in playwright.config.ts (mock auth, test-only).
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const SHOTS = "e2e/screenshots";

// Desktop and mobile share ONE mock server and run in parallel: every test creates its own
// supplier (and offers) with unique names and never deletes a seeded supplier.
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

const unique = (label: string, info: TestInfo) => `${label} ${info.project.name} ${Date.now().toString(36)}`;

/** Creates a supplier through the UI (hidden from the customer dropdown). Returns its id and slug. */
async function createSupplier(page: Page, name: string): Promise<{ id: string; slug: string }> {
  await page.goto("/admin/fornitori/nuovo");
  await page.getByLabel("Nome").fill(name);
  const slug = await page.getByLabel("Slug").inputValue();
  await page.getByLabel(/Mostra nell'elenco/).uncheck();
  await page.getByRole("button", { name: /Crea fornitore/ }).click();
  await expect(page).toHaveURL(/\/admin\/fornitori\/[^/]+\?creato=1/);
  return { id: new URL(page.url()).pathname.split("/").pop()!, slug };
}

/** Creates an active offer for `supplierId` through the admin offer form. Returns the offer id. */
async function createOffer(page: Page, supplierId: string, name: string): Promise<string> {
  await page.goto("/admin/offerte/nuova");
  await page.locator("[name=supplier_id]").selectOption(supplierId);
  await page.locator("[name=name]").fill(name);
  await page.locator("[name=commodity]").selectOption("luce");
  await page.locator("[name=customer_type]").selectOption("casa");
  await page.locator("[name=energy_price]").fill("0,1100");
  await page.locator("[name=fixed_fee]").fill("8");
  await page.locator("[name=fixed_fee_period]").selectOption("month");
  await page.locator("[name=locked_months]").fill("12");
  await page.getByRole("button", { name: "Crea offerta" }).click();
  await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

const supplierRow = (page: Page, slug: string) => page.locator(`[data-testid="supplier-row"][data-slug="${slug}"]`);
const offerRow = (page: Page, id: string) => page.locator(`[data-testid="offer-row"][data-offer-id="${id}"]`);

test("unauthenticated users cannot reach the supplier pages", async ({ page }) => {
  await page.goto("/admin/fornitori");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("placeholder suppliers have no delete button, in the list or on the edit page", async ({ page }) => {
  await login(page);
  await page.goto("/admin/fornitori");
  for (const slug of ["tutela", "altro-fornitore"]) {
    const row = supplierRow(page, slug);
    await expect(row).toBeVisible();
    await expect(row.getByTestId("delete-supplier")).toHaveCount(0);
  }
  // A real seeded supplier does have it (never clicked).
  await expect(supplierRow(page, "enel-energia").getByTestId("delete-supplier")).toBeVisible();
  await noOverflow(page);

  await page.goto("/admin/fornitori/tutela");
  await expect(page.getByTestId("supplier-form")).toBeVisible();
  await expect(page.getByTestId("delete-supplier")).toHaveCount(0);
  await page.goto("/admin/fornitori/altro-fornitore");
  await expect(page.getByTestId("delete-supplier")).toHaveCount(0);
});

test("delete from the list: cancel keeps everything, confirm removes supplier and offers", async ({ page }, info) => {
  await login(page);
  const name = unique("E2E Fornitore Lista", info);
  const { id, slug } = await createSupplier(page, name);
  const offerA = await createOffer(page, id, unique("E2E Offerta A", info));
  const offerB = await createOffer(page, id, unique("E2E Offerta B", info));

  // Both offers are visible to customers before the delete.
  await page.goto("/admin/offerte");
  await expect(offerRow(page, offerA)).toBeVisible();
  await expect(offerRow(page, offerB)).toBeVisible();

  await page.goto("/admin/fornitori");
  const row = supplierRow(page, slug);
  await expect(row).toHaveAttribute("data-offers", "2");
  await row.getByTestId("delete-supplier").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`Eliminare il fornitore «${name}»?`);
  await expect(page.getByTestId("delete-supplier-offers")).toHaveText(
    "Questo fornitore ha 2 offerte: verranno eliminate anche le offerte.",
  );
  await expect(dialog).toContainText("I lead esistenti conservano il nome del fornitore e i dati delle offerte scelte.");
  await expect(dialog).toContainText("L'operazione non può essere annullata");
  await noOverflow(page);
  await page.screenshot({ path: `${SHOTS}/admin-suppliers-delete-modal-${info.project.name}.png` });

  // Cancel: nothing changes.
  await page.getByTestId("confirm-dialog-cancel").click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();
  await page.goto("/admin/offerte");
  await expect(offerRow(page, offerA)).toBeVisible();
  await expect(offerRow(page, offerB)).toBeVisible();

  // Confirm.
  await page.goto("/admin/fornitori");
  await supplierRow(page, slug).getByTestId("delete-supplier").click();
  await page.getByTestId("confirm-dialog-confirm").click();
  await expect(page.getByTestId("deleted-banner")).toContainText(`Fornitore «${name}» eliminato. Eliminate anche 2 offerte.`);
  await expect(supplierRow(page, slug)).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: `${SHOTS}/admin-suppliers-deleted-${info.project.name}.png` });

  // The offers are gone from the admin lists ("Visibili ai clienti" = what customers see, and "Tutte")...
  for (const url of ["/admin/offerte", "/admin/offerte?vista=tutte"]) {
    await page.goto(url);
    await expect(page.getByTestId("offer-name").first()).toBeVisible();
    await expect(offerRow(page, offerA)).toHaveCount(0);
    await expect(offerRow(page, offerB)).toHaveCount(0);
  }
  // ...and their edit pages and the supplier page no longer exist.
  expect((await page.goto(`/admin/offerte/${offerA}`))?.status()).toBe(404);
  expect((await page.goto(`/admin/fornitori/${id}`))?.status()).toBe(404);
  // The supplier is no longer offered when creating an offer.
  await page.goto("/admin/offerte/nuova");
  await expect(page.locator(`[name=supplier_id] option[value="${id}"]`)).toHaveCount(0);
});

test("delete from the edit page: singular wording, redirect to the list with feedback", async ({ page }, info) => {
  await login(page);
  const name = unique("E2E Fornitore Scheda", info);
  const { id, slug } = await createSupplier(page, name);
  const offer = await createOffer(page, id, unique("E2E Offerta Unica", info));

  await page.goto(`/admin/fornitori/${id}`);
  await expect(page.getByTestId("delete-supplier")).toBeVisible();
  await noOverflow(page);
  await page.getByTestId("delete-supplier").click();
  await expect(page.getByTestId("delete-supplier-offers")).toHaveText(
    "Questo fornitore ha 1 offerta: verrà eliminata anche l'offerta.",
  );
  await page.screenshot({ path: `${SHOTS}/admin-suppliers-delete-edit-${info.project.name}.png` });

  // Cancel via Escape keeps the supplier.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/admin/fornitori/${id}$`));

  await page.getByTestId("delete-supplier").click();
  await page.getByTestId("confirm-dialog-confirm").click();
  await expect(page).toHaveURL(/\/admin\/fornitori\?/);
  await expect(page.getByTestId("deleted-banner")).toContainText(`Fornitore «${name}» eliminato. Eliminata anche 1 offerta.`);
  await expect(supplierRow(page, slug)).toHaveCount(0);

  await page.goto("/admin/offerte?vista=tutte");
  await expect(page.getByTestId("offer-name").first()).toBeVisible();
  await expect(offerRow(page, offer)).toHaveCount(0);
});

test("a supplier without offers is deleted without the offers sentence", async ({ page }, info) => {
  await login(page);
  const name = unique("E2E Fornitore Vuoto", info);
  const { id, slug } = await createSupplier(page, name);

  await page.goto("/admin/fornitori");
  await expect(supplierRow(page, slug)).toHaveAttribute("data-offers", "0");
  await supplierRow(page, slug).getByTestId("delete-supplier").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`Eliminare il fornitore «${name}»?`);
  await expect(page.getByTestId("delete-supplier-offers")).toHaveCount(0);
  await expect(dialog).not.toContainText(/Questo fornitore ha \d+ offert|verranno eliminate/);
  await expect(dialog).toContainText("I lead esistenti conservano");
  await page.getByTestId("confirm-dialog-confirm").click();
  await expect(page.getByTestId("deleted-banner")).toHaveText(`Fornitore «${name}» eliminato.`);
  await expect(supplierRow(page, slug)).toHaveCount(0);
  expect((await page.goto(`/admin/fornitori/${id}`))?.status()).toBe(404);
});
