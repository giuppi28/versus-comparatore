import { expect, test, type Page } from "@playwright/test";
import { page1Data, VALID_PDR, VALID_POD } from "../src/lib/lead/test-fixtures";

// Phase 12 / T12.5: lead detail sections "Pagamento", "Documento d'identità", distributor next to
// POD/PDR. Seeds through the public lead API (mock mode). The seed needs the Phase 12 lead API
// (IBAN/document fields, document upload route); until it ships the test skips with the reason.
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const SHOTS = "e2e/screenshots";

const rand = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]/g, "")
    .slice(0, 8)
    .padEnd(8, "q");

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("admin lead detail: payment, document, distributor", () => {
  test("shows IBAN, holder, document data, files, distributor", async ({ page, playwright }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    const surname = `Attiv${rand()}`;
    const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Origin: baseURL, "x-forwarded-for": ip },
    });
    const created = await ctx.post("/api/lead", {
      data: { data: page1Data({ first_name: "Livia", last_name: surname }) },
    });
    expect(created.status(), await created.text()).toBeLessThan(300);
    const patched = await ctx.patch("/api/lead", {
      data: {
        data: {
          pod: VALID_POD,
          pdr: VALID_PDR,
          iban: "IT60X0542811101000000123456",
          iban_holder_different: true,
          iban_holder_first_name: "Mario",
          iban_holder_last_name: "Rossi",
          iban_holder_tax_code: "RSSMRA85T10A562S",
          document_type: "patente",
          document_number: "U1A234567B",
          document_expiry: "2031-01-05",
          document_issuer: "MIT-UCO",
        },
      },
    });
    test.skip(patched.status() === 400, "Lead API does not yet accept the Phase 12 activation fields");
    expect(patched.status(), await patched.text()).toBeLessThan(300);

    // Upload through the token-bound route (cookie kept by the context).
    // A real 1x1 JPEG: the inline preview hides undecodable images (onError).
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64",
    );
    const upload = await ctx.post("/api/lead/document", {
      multipart: { file: { name: "doc.jpg", mimeType: "image/jpeg", buffer: jpeg } },
    });
    expect(upload.status(), await upload.text()).toBe(201);
    await ctx.dispose();

    await login(page);
    await page.goto(`/admin/leads?tab=tutti&q=${surname}`);
    await page
      .locator('[data-testid="lead-item"]:visible')
      .first()
      .getByRole("link", { name: new RegExp(surname) })
      .click();
    await expect(page).toHaveURL(/\/admin\/leads\/[^/?]+$/);

    await expect(page.getByTestId("lead-iban")).toHaveText("IT60 X054 2811 1010 0000 0123 456");
    await expect(page.getByTestId("lead-iban-holder")).toHaveText("Mario Rossi — RSSMRA85T10A562S");
    const doc = page.getByTestId("group-documento");
    await expect(doc).toContainText("Patente");
    await expect(doc).toContainText("U1A234567B");
    await expect(doc).toContainText("05/01/2031");
    await expect(doc).toContainText("MIT-UCO");
    await expect(page.getByTestId("pod-distributor")).toContainText("Distributore:");
    await expect(page.getByTestId("pdr-distributor")).toHaveCount(0);

    await expect(page.getByTestId("lead-document")).toHaveCount(1);
    await expect(page.getByTestId("lead-document")).toContainText("JPEG");
    // No signed/data URL embedded in the page before the admin asks for it.
    expect(await page.content()).not.toContain("data:image/jpeg");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("lead-document-download").click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.jpe?g$/i);
    await page.getByTestId("lead-document-preview").click();
    await expect(page.getByTestId("lead-document-inline")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
    await page.screenshot({ path: `${SHOTS}/admin-lead-activation-${page.viewportSize()?.width}.png`, fullPage: true });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Cleanup (own lead).
    await page.getByTestId("lead-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/admin\/leads\?deleted=1$/);
  });
});
