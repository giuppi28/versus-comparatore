import { expect, test } from "@playwright/test";

test("/privacy is noindex", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("home footer shows privacy link and no company data while unset", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid="footer-legal"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Privacy e cookie" })).toBeVisible();
});
