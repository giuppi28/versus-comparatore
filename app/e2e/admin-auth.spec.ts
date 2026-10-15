import { expect, test, type Page } from "@playwright/test";

// Must match the webServer env in playwright.config.ts (mock auth, test-only).
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";

/** Fills and submits the login form, then waits for the server action to answer. */
async function fillLogin(page: Page, email: string, password: string, expectRedirect = false) {
  const form = page.locator("form[data-attempt]");
  const attempt = Number(await form.getAttribute("data-attempt"));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const submit = page.getByRole("button", { name: "Accedi" });
  // Enabled once the Turnstile widget (test site key) has issued a token.
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  if (!expectRedirect) await expect(form).toHaveAttribute("data-attempt", String(attempt + 1));
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("admin authentication", () => {
  test("unauthenticated /admin and sub-pages redirect to the login page", async ({ page }) => {
    for (const path of ["/admin", "/admin/leads", "/admin/offerte"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
    await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByTestId("turnstile")).toBeVisible();
    // No sign-up anywhere.
    await expect(page.getByText(/registrati|crea (un )?account/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("wrong credentials show a generic error", async ({ page }, testInfo) => {
    await page.goto("/admin/login");
    // Unique unknown email: same generic message as a wrong password, and no
    // interference with the rate-limit counter of the real account.
    await fillLogin(page, `nobody-${testInfo.project.name}-${Date.now()}@versus.test`, "sbagliata");
    await expect(page.getByTestId("form-error")).toHaveText("Email o password non corretti.");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.screenshot({ path: testInfo.outputPath(`admin-login-error-${testInfo.project.name}.png`), fullPage: true });

    // Wrong password for the real account: identical message.
    // The email is kept after a failed attempt; the password is cleared.
    await expect(page.getByLabel("Password")).toHaveValue("");
    await expect(page.getByLabel("Email")).not.toHaveValue("");
    await fillLogin(page, ADMIN_EMAIL, "password-sbagliata");
    await expect(page.getByTestId("form-error")).toHaveText("Email o password non corretti.");
  });

  test("too many attempts are rate limited", async ({ page }, testInfo) => {
    await page.goto("/admin/login");
    const email = `bruteforce-${testInfo.project.name}-${Date.now()}@versus.test`;
    for (let i = 0; i < 5; i++) {
      await fillLogin(page, email, `tentativo-${i}`);
      await expect(page.getByTestId("form-error")).toHaveText("Email o password non corretti.");
    }
    await fillLogin(page, email, "tentativo-6");
    await expect(page.getByTestId("form-error")).toHaveText("Troppi tentativi, riprova più tardi");
  });

  test("correct credentials open the dashboard; logout blocks /admin again", async ({ page }, testInfo) => {
    await page.goto("/admin/login");
    await page.screenshot({ path: testInfo.outputPath(`admin-login-${testInfo.project.name}.png`), fullPage: true });
    await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD, true);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Area riservata" });
    for (const label of ["Lead", "Fornitori", "Offerte", "Impostazioni"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`admin-dashboard-${testInfo.project.name}.png`), fullPage: true });

    // Session cookie is httpOnly.
    const session = (await page.context().cookies()).find((c) => c.name === "versus_admin_mock");
    expect(session?.httpOnly).toBe(true);

    // Logged-in admin visiting the login page goes straight to the dashboard.
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("button", { name: "Esci" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("a forged session cookie is rejected", async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "versus_admin_mock", value: "eyJzdWIiOiJ4In0.ZmFrZQ", url: baseURL! },
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("MFA pages require a session", async ({ page }) => {
    await page.goto("/admin/login/mfa");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin/login/mfa/attiva");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
