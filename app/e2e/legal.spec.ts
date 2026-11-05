import { expect, test } from "@playwright/test";

test("/privacy is noindex", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

for (const path of ["/", "/privacy"]) {
  test(`footer shows the company legal data on ${path}`, async ({ page }) => {
    await page.goto(path);
    const legal = page.locator('[data-testid="footer-legal"]');
    await expect(legal).toBeVisible();
    for (const needle of [
      "KEHILA S.r.l.s.",
      "P.IVA 06237360877",
      "REA CT-481759",
      "info@versuscomparatorelucegas.it",
      "Socio unico",
    ]) {
      await expect(legal).toContainText(needle);
    }
    await expect(page.getByRole("link", { name: "Privacy e cookie" }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, "horizontal overflow").toBe(false);
  });
}

test("/privacy has the controller data and no bracketed placeholder", async ({ page }) => {
  await page.goto("/privacy");
  const text = await page.locator("article").innerText();
  expect(text).not.toMatch(/\[[^\]]+\]/);
  expect(text).toContain("KEHILA S.r.l.s.");
  expect(text).toContain("Via Umberto 326 B, 95055 San Pietro Clarenza (CT)");
  expect(text).toContain("Ultimo aggiornamento: 5 novembre 2026.");
  await expect(page.locator('article a[href="mailto:info@versuscomparatorelucegas.it"]').first()).toBeVisible();
});
