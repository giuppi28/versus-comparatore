import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Must match the webServer env in playwright.config.ts (mock auth, test-only).
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const SHOTS = "e2e/screenshots";

const CLEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect width="100" height="40" fill="#0a8045"/><circle cx="20" cy="20" r="10" fill="#fff"/></svg>`;
const MALICIOUS_SVG = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 40" onload="alert(1)">
<script>alert(document.cookie)</script>
<foreignObject width="10" height="10"><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(2)"/></body></foreignObject>
<a xlink:href="javascript:alert(3)"><rect width="100" height="40" fill="#123456" onclick="alert(4)"/></a>
<rect id="logo-rect" width="50" height="40" fill="#0a8045" style="fill:url(https://evil.example/x.svg#a)" onmouseover="alert(5)"/>
<use xlink:href="https://evil.example/s.svg#x"/>
<animate attributeName="href" values="javascript:alert(6)"/>
</svg>`;

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
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const svgFile = (content: string, name = "logo.svg") => ({
  name,
  mimeType: "image/svg+xml",
  buffer: Buffer.from(content, "utf8"),
});

/** Decodes the data: URL of the <img> inside the logo preview. */
async function savedLogoSvg(page: Page): Promise<string> {
  const src = await page
    .locator('[data-testid="logo-preview"] img')
    .getAttribute("src");
  expect(src).toMatch(/^data:image\/svg\+xml;base64,/);
  return Buffer.from(src!.split(",")[1], "base64").toString("utf8");
}

const submit = (page: Page, name: RegExp) => page.getByRole("button", { name });

test("unauthenticated /admin/fornitori redirects to the login page", async ({
  page,
}) => {
  for (const p of [
    "/admin/fornitori",
    "/admin/fornitori/nuovo",
    "/admin/fornitori/enel-energia",
  ]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
});

/** Deletes a throw-away supplier from its edit page so it never lingers in the shared repository. */
async function removeSupplier(page: Page, editUrl: string | null) {
  if (!editUrl) return;
  await page.goto(editUrl);
  await page.getByTestId("delete-supplier").click();
  await page.getByTestId("confirm-dialog-confirm").click();
  await expect(page).toHaveURL(/\/admin\/fornitori\?/);
}

test.describe("suppliers admin", () => {
  test.describe.configure({ mode: "serial" });

  test("create, edit, upload logos and deactivate a supplier", async ({
    page,
  }, testInfo) => {
    let created: string | null = null;
    try {
      const project = testInfo.project.name;
      // Unique per project/run: desktop and mobile share one mock repository.
      const suffix = `${project}${Date.now().toString(36)}`;
      const name = `E2E Prova Energia ${suffix}`;
      const slug = `e2e-prova-energia-${suffix}`;
      await login(page);

      // ---- List: all suppliers, including inactive ones, in sort order -------------------------
      await page.goto("/admin/fornitori");
      await expect(
        page.getByRole("heading", { name: "Fornitori" }),
      ).toBeVisible();
      const rows = page.getByTestId("supplier-row");
      expect(await rows.count()).toBeGreaterThanOrEqual(14);
      await expect(rows.first()).toContainText("Enel Energia");
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${SHOTS}/admin-suppliers-list-${project}.png`,
        fullPage: true,
      });

      // ---- Create: validation, slug auto-generation, uniqueness -------------------------------
      await page.getByRole("link", { name: "Nuovo fornitore" }).click();
      await expect(page).toHaveURL(/\/admin\/fornitori\/nuovo$/);
      await submit(page, /Crea fornitore/).click();
      await expect(page.getByTestId("form-error")).toHaveText(
        "Controlla i campi evidenziati.",
      );
      await expect(
        page.getByText("Inserisci il nome del fornitore."),
      ).toBeVisible();
      await expect(page.getByText("Inserisci lo slug.")).toBeVisible();

      await page.getByLabel("Nome").fill(`E2E Società Più ${suffix}`);
      // Slug follows the name (accents and spaces normalised) until edited by hand.
      await expect(page.getByLabel("Slug")).toHaveValue(
        new RegExp(`^e2e-societa-piu-${suffix}$`),
      );
      await page.getByLabel("Nome").fill(name);
      await expect(page.getByLabel("Slug")).toHaveValue(slug);

      // Duplicate slug of an existing supplier is refused with an inline error.
      await page.getByLabel("Slug").fill("enel-energia");
      await submit(page, /Crea fornitore/).click();
      await expect(page.getByText("Questo slug è già in uso.")).toBeVisible();
      await expect(page.getByLabel("Nome")).toHaveValue(name); // typed values survive the error

      await page.getByLabel("Slug").fill(slug);
      // Not offered in the customer dropdown while testing, so other specs are unaffected.
      await page.getByLabel(/Mostra nell'elenco/).uncheck();
      await page.getByLabel("Vende gas").uncheck();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${SHOTS}/admin-suppliers-create-${project}.png`,
        fullPage: true,
      });
      await submit(page, /Crea fornitore/).click();

      await expect(page).toHaveURL(/\/admin\/fornitori\/[^/]+\?creato=1/);
      await expect(page.getByTestId("created-banner")).toContainText(
        "Fornitore creato.",
      );
      await expect(page.getByRole("heading", { name })).toBeVisible();
      await expect(page.getByLabel("Slug")).toHaveValue(slug);
      await expect(page.getByLabel("Vende luce")).toBeChecked();
      await expect(page.getByLabel("Vende gas")).not.toBeChecked();
      await expect(page.getByLabel(/Mostra nell'elenco/)).not.toBeChecked();
      await expect(page.getByLabel("Attivo")).toBeChecked();
      const editUrl = page.url().split("?")[0];
      created = editUrl;

      // ---- Edit flags / name / order ----------------------------------------------------------
      await page.getByLabel("Vende gas").check();
      await page.getByLabel("Vende luce").uncheck();
      await page.getByLabel("Ordine di visualizzazione").fill("77");
      await page.getByLabel("Nome").fill(`${name} SpA`);
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("form-success")).toContainText(
        "Fornitore salvato.",
      );
      await page.goto(editUrl);
      await expect(page.getByLabel("Vende gas")).toBeChecked();
      await expect(page.getByLabel("Vende luce")).not.toBeChecked();
      await expect(page.getByLabel("Ordine di visualizzazione")).toHaveValue(
        "77",
      );
      await expect(page.getByLabel("Nome")).toHaveValue(`${name} SpA`);

      // Invalid sort order.
      await page.getByLabel("Ordine di visualizzazione").fill("-5");
      await submit(page, /Salva modifiche/).click();
      await expect(
        page.getByText("L'ordine deve essere compreso tra 0 e 9999."),
      ).toBeVisible();
      await page.getByLabel("Ordine di visualizzazione").fill("77");

      // ---- Logo: client-side rejections ------------------------------------------------------
      const logoInput = page.locator("#logo");
      await logoInput.setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: Buffer.from("png"),
      });
      await expect(page.getByTestId("logo-error")).toHaveText(
        "Carica un file in formato SVG.",
      );
      await logoInput.setInputFiles(
        svgFile(
          `<svg xmlns="http://www.w3.org/2000/svg">${" ".repeat(210_000)}</svg>`,
        ),
      );
      await expect(page.getByTestId("logo-error")).toHaveText(
        "Il file supera il limite di 200 KB.",
      );
      await expect(
        page.locator('[data-testid="logo-preview"] img'),
      ).toHaveCount(0);

      // ---- Logo: not an SVG at all (server-side rejection, Italian message) -------------------
      await logoInput.setInputFiles(
        svgFile("<html><body>non sono un logo</body></html>", "finto.svg"),
      );
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("logo-error")).toContainText(
        "Il file non è un SVG",
      );
      await expect(page.getByTestId("form-error")).toBeVisible();

      // ---- Logo: clean upload shows a preview and is saved ------------------------------------
      await logoInput.setInputFiles(svgFile(CLEAN_SVG));
      await expect(page.getByTestId("logo-error")).toHaveCount(0);
      await expect(
        page.locator('[data-testid="logo-preview"] img'),
      ).toBeVisible();
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("form-success")).toContainText(
        "Fornitore salvato.",
      );
      await expect(page.getByTestId("form-notice")).toHaveText(
        "Logo aggiornato.",
      );
      const saved = await savedLogoSvg(page);
      expect(saved).toContain("<rect");
      expect(saved).toContain("<circle");

      // ---- Logo: malicious upload is sanitized (script & co. removed, shapes kept) -----------
      await logoInput.setInputFiles(svgFile(MALICIOUS_SVG, "malevolo.svg"));
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("form-success")).toBeVisible();
      await expect(page.getByTestId("form-notice")).toContainText(
        "Il logo è stato ripulito automaticamente",
      );
      const sanitized = await savedLogoSvg(page);
      expect(sanitized).toContain('id="logo-rect"');
      expect(sanitized).toContain("<rect");
      expect(sanitized).not.toMatch(
        /<script|foreignObject|onload|onclick|onmouseover|onerror|javascript:|evil\.example|<animate|<a[\s>]|DOCTYPE|ENTITY|alert/i,
      );

      // The logo survives a reload and shows in the list.
      await page.goto(editUrl);
      expect(await savedLogoSvg(page)).toBe(sanitized);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${SHOTS}/admin-suppliers-edit-${project}.png`,
        fullPage: true,
      });

      await page.goto("/admin/fornitori");
      const row = page.locator(
        `[data-testid="supplier-row"][data-slug="${slug}"]`,
      );
      await expect(row).toContainText(`${name} SpA`);
      await expect(row.locator("img")).toBeVisible();
      await expect(row).toContainText("Attivo");

      // ---- Remove the logo ------------------------------------------------------------------
      await row.click();
      await page.getByLabel("Rimuovi il logo attuale").check();
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("form-notice")).toHaveText("Logo rimosso.");
      await page.goto(editUrl);
      await expect(
        page.locator('[data-testid="logo-preview"] img'),
      ).toHaveCount(0);

      // ---- Deactivate: stays in the admin list, flagged as inactive ---------------------------
      await page.getByLabel("Attivo").uncheck();
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("form-success")).toBeVisible();
      await page.goto("/admin/fornitori");
      const inactiveRow = page.locator(
        `[data-testid="supplier-row"][data-slug="${slug}"]`,
      );
      await expect(inactiveRow).toHaveAttribute("data-active", "false");
      await expect(inactiveRow).toContainText("Non attivo");
      await expectNoHorizontalOverflow(page);
    } finally {
      await removeSupplier(page, created);
    }
  });

  test("a real supplier logo can be uploaded and an unknown id returns 404", async ({
    page,
  }, testInfo) => {
    let created: string | null = null;
    try {
      const project = testInfo.project.name;
      await login(page);
      const res = await page.goto("/admin/fornitori/non-esiste");
      expect(res?.status()).toBe(404);

      // Own throw-away supplier so seeded suppliers are not modified.
      await page.goto("/admin/fornitori/nuovo");
      const suffix = `${project}${Date.now().toString(36)}`;
      await page.getByLabel("Nome").fill(`E2E Logo Reale ${suffix}`);
      await page.getByLabel(/Mostra nell'elenco/).uncheck();
      const hera = readFileSync(
        path.join(
          __dirname,
          "../src/lib/svg/__fixtures__/versus__hera__wikimedia__Hera_logo.svg",
        ),
      );
      await page
        .locator("#logo")
        .setInputFiles({
          name: "hera.svg",
          mimeType: "image/svg+xml",
          buffer: hera,
        });
      await submit(page, /Crea fornitore/).click();
      await expect(page).toHaveURL(/\/admin\/fornitori\/[^/]+\?creato=1$/);
      created = page.url().split("?")[0];
      const svg = await savedLogoSvg(page);
      expect(svg).toContain("fill:#e0058c");
      expect(svg).not.toMatch(/DOCTYPE|Inkscape/);

      // Clean up: leave nothing active/visible behind.
      await page.getByLabel("Attivo").uncheck();
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("form-success")).toBeVisible();
    } finally {
      await removeSupplier(page, created);
    }
  });
});
