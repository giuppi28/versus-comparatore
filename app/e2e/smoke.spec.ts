import { expect, test } from "@playwright/test";

test("home page loads with VERSUS branding", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "VERSUS — comparatore luce e gas" }).first()).toBeVisible();
  await expect(page).toHaveTitle(/VERSUS/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
