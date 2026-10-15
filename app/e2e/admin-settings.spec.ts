import { expect, test, type Page } from "@playwright/test";

// Must match the webServer env in playwright.config.ts (mock auth, test-only).
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const SHOTS = "e2e/screenshots";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function save(page: Page, value: string) {
  const form = page.locator("form[data-attempt]");
  const attempt = Number(await form.getAttribute("data-attempt"));
  await page.getByLabel("Email per le notifiche dei nuovi lead").fill(value);
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(form).toHaveAttribute("data-attempt", String(attempt + 1));
}

// Desktop and mobile run in parallel against ONE in-memory mock repository: only the desktop
// project mutates settings (and restores them); mobile checks layout and the validation path.
test.describe.configure({ mode: "serial" });

test.describe("admin settings and go-live checklist", () => {
  test("requires an admin session", async ({ page }) => {
    await page.goto("/admin/impostazioni");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("notification email: validation, save, disable", async ({ page }, testInfo) => {
    const isDesktop = testInfo.project.name === "desktop";
    const shot = (name: string) =>
      page.screenshot({ path: `${SHOTS}/admin-settings-${name}-${testInfo.project.name}.png`, fullPage: true });
    await login(page);
    await page.getByRole("navigation", { name: "Area riservata" }).getByRole("link", { name: "Impostazioni" }).click();
    await expect(page.getByRole("heading", { name: "Impostazioni", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Email per le notifiche dei nuovi lead")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // Invalid email is rejected (nothing is saved) and kept in the field.
    await save(page, "non-una-email");
    await expect(page.getByRole("alert").filter({ hasText: "indirizzo email valido" })).toBeVisible();
    await expect(page.getByLabel("Email per le notifiche dei nuovi lead")).toHaveValue("non-una-email");
    await expect(page.getByTestId("settings-saved")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    if (!isDesktop) {
      await shot("invalid");
      return;
    }

    // Disabled -> warning visible.
    await save(page, "");
    await expect(page.getByTestId("settings-saved")).toContainText("disattivate");
    await expect(page.getByTestId("notifications-disabled")).toBeVisible();
    await shot("disabled");

    // Valid email is saved; the warning disappears and the value persists on reload.
    await save(page, "aldo@azienda.it");
    await expect(page.getByTestId("settings-saved")).toHaveText("Impostazioni salvate.");
    await expect(page.getByTestId("notifications-disabled")).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("Email per le notifiche dei nuovi lead")).toHaveValue("aldo@azienda.it");
    await shot("saved");

    // Restore: empty again.
    await save(page, "");
    await expect(page.getByTestId("notifications-disabled")).toBeVisible();
  });

  test("go-live checklist lists the 8 unverified offers and is not ready", async ({ page }, testInfo) => {
    await login(page);
    await page.goto("/admin/impostazioni");
    await expect(page.getByTestId("golive-status")).toHaveText("Non pronto");

    const offers = page.getByTestId("unverified-offers").getByRole("link");
    await expect(offers).toHaveCount(8);
    for (const href of await offers.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href).toMatch(/^\/admin\/offerte\/[^/]+$/);
    }
    await expect(page.locator('[data-check="offers-verified"]')).toContainText("8 offerte attive da verificare");
    await expect(page.locator('[data-check="offers-verified"]')).toHaveAttribute("data-ok", "false");
    // Mock data source never counts as ready.
    await expect(page.locator('[data-check="data-source"]')).toHaveAttribute("data-ok", "false");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${SHOTS}/admin-settings-golive-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});
