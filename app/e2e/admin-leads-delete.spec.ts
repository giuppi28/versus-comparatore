import { expect, test, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import { page1Data } from "../src/lib/lead/test-fixtures";

// Phase 11 / D2: lead deletion (row, detail, bulk). Every test creates its OWN leads (unique
// surname) and only deletes those: the mock server is shared with other specs running in parallel.
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const SHOTS = "e2e/screenshots";

const rand = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]/g, "")
    .slice(0, 8)
    .padEnd(8, "q");

/** Creates `firstNames.length` partial leads sharing a unique surname, via the public API. */
async function createLeads(
  baseURL: string,
  playwright: PlaywrightWorkerArgs["playwright"],
  firstNames: string[],
): Promise<{ surname: string; tokens: string[] }> {
  const surname = `Canc${rand()}`;
  const tokens: string[] = [];
  for (const first_name of firstNames) {
    // A unique client IP per lead keeps the per-IP rate limit of the public API out of the way.
    const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Origin: baseURL, "x-forwarded-for": ip },
    });
    const res = await ctx.post("/api/lead", { data: { data: page1Data({ first_name, last_name: surname }) } });
    expect(res.status(), await res.text()).toBeLessThan(300);
    tokens.push((await ctx.storageState()).cookies.find((c) => c.name === "versus_lead")?.value ?? "");
    await ctx.dispose();
  }
  return { surname, tokens };
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  await expect(page).toHaveURL(/\/admin$/);
}

const items = (page: Page) => page.locator('[data-testid="lead-item"]:visible');
const listUrl = (surname: string, extra = "") => `/admin/leads?tab=tutti&q=${surname}${extra}`;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("admin leads deletion", () => {
  test.beforeEach(async ({ page }) => {
    // Native browser dialogs are never used (in-page modal only).
    page.on("dialog", (d) => {
      throw new Error(`Unexpected native dialog: ${d.message()}`);
    });
    await login(page);
  });

  test("row delete: cancel keeps the lead, confirm removes only that lead", async ({ page, playwright }, testInfo) => {
    const { surname, tokens } = await createLeads(String(testInfo.project.use.baseURL), playwright, ["Anna", "Bruno"]);
    await page.goto(listUrl(surname));
    await expect(items(page)).toHaveCount(2);
    // The list is a client component: its serialized props must never contain the secret tokens.
    const html = await page.content();
    for (const token of tokens) {
      expect(token).not.toBe("");
      expect(html).not.toContain(token);
    }

    const anna = items(page).filter({ hasText: "Anna" });
    await anna.getByTestId("lead-row-delete").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Eliminare 1 lead?");
    await expect(dialog).toContainText("Anna");
    await expect(dialog).toContainText("L'operazione non può essere annullata");
    await page.screenshot({ path: `${SHOTS}/admin-leads-delete-dialog-${page.viewportSize()?.width}.png` });

    // Cancel: nothing deleted.
    await page.getByTestId("confirm-dialog-cancel").click();
    await expect(dialog).toBeHidden();
    await expect(items(page)).toHaveCount(2);
    await page.reload();
    await expect(items(page)).toHaveCount(2);

    // Confirm: only Anna goes.
    await items(page).filter({ hasText: "Anna" }).getByTestId("lead-row-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("lead-delete-notice")).toHaveText("1 lead eliminato");
    await expect(page.getByTestId("lead-delete-notice")).toHaveAttribute("aria-live", "polite");
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText("Bruno");
    await expect(page.getByTestId("lead-total")).toHaveText("1 lead");
    await expectNoHorizontalOverflow(page);

    // Cleanup (own lead).
    await items(page).first().getByTestId("lead-row-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("lead-empty")).toBeVisible();
  });

  test("detail delete: cancel keeps it, confirm redirects to the list with feedback", async ({
    page,
    playwright,
  }, testInfo) => {
    const { surname } = await createLeads(String(testInfo.project.use.baseURL), playwright, ["Carla"]);
    await page.goto(listUrl(surname));
    await items(page)
      .first()
      .getByRole("link", { name: new RegExp(surname) })
      .click();
    await expect(page).toHaveURL(/\/admin\/leads\/[^/?]+$/);
    const detailUrl = page.url();

    await page.getByTestId("lead-delete").click();
    await expect(page.getByRole("dialog")).toContainText("Eliminare 1 lead?");
    await expect(page.getByRole("dialog")).toContainText("L'operazione non può essere annullata");
    await page.getByTestId("confirm-dialog-cancel").click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(detailUrl);

    await page.getByTestId("lead-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/admin\/leads\?deleted=1$/);
    await expect(page.getByTestId("lead-delete-notice")).toHaveText("1 lead eliminato");

    // The lead is gone for good.
    const res = await page.goto(detailUrl);
    expect(res?.status()).toBe(404);
    await page.goto(listUrl(surname));
    await expect(page.getByTestId("lead-empty")).toBeVisible();
  });

  test("bulk delete with a status filter removes only the selected filtered leads", async ({
    page,
    playwright,
  }, testInfo) => {
    const { surname } = await createLeads(String(testInfo.project.use.baseURL), playwright, [
      "Dario",
      "Elena",
      "Fabio",
    ]);

    // Set Dario and Elena to "Contattato" from their detail pages.
    for (const first of ["Dario", "Elena"]) {
      await page.goto(listUrl(surname));
      await items(page).filter({ hasText: first }).getByRole("link").first().click();
      await expect(page).toHaveURL(/\/admin\/leads\/[^/?]+$/);
      await page.getByLabel("Stato").selectOption("contacted");
      await page.getByRole("button", { name: "Salva" }).click();
      await expect(page.getByTestId("save-success")).toBeVisible();
    }

    await page.goto(listUrl(surname, "&status=contacted"));
    await expect(items(page)).toHaveCount(2);
    await expect(page.getByTestId("lead-bulk-bar")).toBeHidden();

    // Select all (page) → bar with the count.
    await page.getByTestId("lead-select-all").check();
    await expect(page.getByTestId("lead-selected-count")).toHaveText("2 selezionati");
    const bulk = page.getByTestId("lead-bulk-delete");
    await expect(bulk).toHaveText("Elimina selezionati (2)");
    await expect(bulk).toBeInViewport();

    // Unticking one row updates the count and the select-all state.
    await items(page).first().getByTestId("lead-select").uncheck();
    await expect(bulk).toHaveText("Elimina selezionati (1)");
    await expect(page.getByTestId("lead-select-all")).not.toBeChecked();
    await page.getByTestId("lead-select-all").check();
    await expect(bulk).toHaveText("Elimina selezionati (2)");

    // Cancel keeps everything.
    await bulk.click();
    await expect(page.getByRole("dialog")).toContainText("Eliminare 2 lead?");
    await expect(page.getByRole("dialog")).toContainText("2 lead verranno eliminati definitivamente");
    await expect(page.getByRole("dialog")).toContainText("L'operazione non può essere annullata");
    await page.getByTestId("confirm-dialog-cancel").click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(items(page)).toHaveCount(2);
    await expect(bulk).toHaveText("Elimina selezionati (2)");

    // Confirm.
    await bulk.click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("lead-delete-notice")).toHaveText("2 lead eliminati");
    await expect(page.getByTestId("lead-empty")).toBeVisible();
    await expect(page.getByTestId("lead-bulk-bar")).toBeHidden();

    // The unfiltered lead (still "Nuovo") survived.
    await page.goto(listUrl(surname));
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText("Fabio");
    await expect(items(page).first()).toContainText("Nuovo");

    // Cleanup via select-all.
    await page.getByTestId("lead-select-all").check();
    await page.getByTestId("lead-bulk-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("lead-delete-notice")).toHaveText("1 lead eliminato");
    await expect(page.getByTestId("lead-empty")).toBeVisible();
  });

  test("selection is cleared when the filters change; checkbox hit areas are at least 44px", async ({
    page,
    playwright,
  }, testInfo) => {
    const { surname } = await createLeads(String(testInfo.project.use.baseURL), playwright, ["Gina", "Hugo"]);
    await page.goto(listUrl(surname));
    await page.getByTestId("lead-select-all").check();
    await expect(page.getByTestId("lead-selected-count")).toHaveText("2 selezionati");

    for (const sel of ["lead-select-all", "lead-select"]) {
      const box = await page.locator(`label:has(input[data-testid="${sel}"]):visible`).first().boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    const del = await items(page).first().getByTestId("lead-row-delete").boundingBox();
    expect(del?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/admin-leads-bulk-${page.viewportSize()?.width}.png` });

    // Changing the filters (GET navigation) clears the selection.
    await page.goto(listUrl(surname, "&status=new"));
    await expect(items(page)).toHaveCount(2);
    await expect(page.getByTestId("lead-select-all")).not.toBeChecked();
    await expect(page.getByTestId("lead-bulk-bar")).toBeHidden();

    // Cleanup.
    await page.getByTestId("lead-select-all").check();
    await page.getByTestId("lead-bulk-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("lead-delete-notice")).toHaveText("2 lead eliminati");
  });
});
