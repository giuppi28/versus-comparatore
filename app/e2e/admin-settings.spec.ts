import { expect, test, type Page } from "@playwright/test";
import { MOCK_OFFERS } from "../src/lib/data/mock/data";

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

    // Other specs may temporarily add active unverified offers to the shared mock repository,
    // so assert on the seed offers (all 8 are active and unverified) instead of an exact count.
    const seed = MOCK_OFFERS.filter((o) => o.active && !o.price_verified);
    expect(seed).toHaveLength(8);
    const list = page.getByTestId("unverified-offers");
    for (const offer of seed) {
      const link = list.getByRole("link").filter({ hasText: offer.name });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", `/admin/offerte/${offer.id}`);
    }
    for (const href of await list.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href).toMatch(/^\/admin\/offerte\/[^/]+$/);
    }
    const check = page.locator('[data-check="offers-verified"]');
    await expect(check).toContainText(/\d+ offerte attive da verificare/);
    await expect(check).toHaveAttribute("data-ok", "false");
    // Mock data source never counts as ready.
    await expect(page.locator('[data-check="data-source"]')).toHaveAttribute("data-ok", "false");
    // Manual items: shown prominently, never auto-checked, never part of the automatic status.
    const manual = page.getByTestId("manual-checks");
    await expect(manual.getByRole("heading", { name: "Verifiche manuali" })).toBeVisible();
    await expect(manual.locator("[data-manual]")).toHaveCount(4);
    await expect(manual.getByText("Da verificare manualmente")).toHaveCount(3);
    await expect(manual.locator('[data-manual]:not([data-done])')).toHaveCount(3);
    await expect(manual).toContainText("Registrazione pubblica disattivata in Supabase Auth");
    await expect(manual).toContainText("Authentication → Sign In / Providers");
    await expect(manual).toContainText("Allow new users to sign up");
    await expect(manual).toContainText("Account amministratore di Aldo creato e inserito in public.admins");
    await expect(manual).toContainText("Informativa privacy: sostituire i segnaposto");
    await expect(manual).toContainText("[Ragione sociale del titolare]");
    await expect(manual).toContainText("[Data di aggiornamento]");
    const done = page.locator('[data-check="manual-bootstrap-dropped"]');
    await expect(done).toHaveAttribute("data-done", "true");
    await expect(done).toContainText("public.bootstrap_load_comuni");
    await expect(done).toContainText(
      "Completato dal revisore il 15/10/2026: funzione disattivata e spostata nello schema private",
    );
    await expect(done.getByText("Da verificare manualmente")).toHaveCount(0);
    await expect(page.locator('[data-check="manual-signup-disabled"][data-ok]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${SHOTS}/admin-settings-golive-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});

test.describe("admin settings: test email", () => {
  test("button shows a clear result message (mock mode, no real send)", async ({ page }) => {
    await login(page);
    await page.goto("/admin/impostazioni");
    const button = page.getByRole("button", { name: "Invia email di prova" });
    await expect(button).toBeVisible();
    const form = page.getByTestId("test-email-form");
    await expect(form).toHaveAttribute("data-test-attempt", "0", { timeout: 20_000 });
    await button.click();
    await expect(form).toHaveAttribute("data-test-attempt", "1");
    await expect(page.getByTestId("test-email-result")).toContainText(/configurazione mancante|Email inviata|Errore Resend|Troppi invii/);
  });
});
