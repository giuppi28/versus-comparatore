/**
 * Activation step B extras (Phase 12 / T12.7): optional IBAN (+ different holder), identity
 * document data + upload, POD/PDR cross-detection, POD/comune warning.
 * Mock data mode. Test ids: activation-payment, activation-document, iban-holder-different,
 * iban-holder-fields, document-file, document-item, document-upload-error, pod-warning.
 */
import { expect, test, type Page } from "@playwright/test";
import { page1Data } from "../src/lib/lead/test-fixtures";

const FLOW_KEY = "versus.flow.v1";
const STEP_KEY = "versus.activation.step.v1";
const GOOD_IBAN = "IT60X0542811101000000123456";
const BAD_IBAN = "IT60X0542811101000000123457";
const CF_MARIO_ROSSI = "RSSMRA85T10A562S";
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";

const luceOffer = {
  offer_id: "offer-edison-luce-fissa-12",
  commodity: "luce",
  offer_name: "Edison Luce Fissa 12",
  supplier_id: "edison-energia",
  supplier_name: "Edison Energia",
  supplier_logo_path: null,
  energy_price: 0.129,
  other_variable_costs: 0,
  fixed_fee_monthly: 9,
  other_fixed_costs_monthly: 0,
  locked_months: 12,
  activation_cost: 0,
  promo_text: null,
  monthly_cost: 50,
};

const milano = { istat: "015146", name: "Milano", province: "MI", caps: ["20121", "20122"], climate_zone: "E" };
const roma = { istat: "058091", name: "Roma", province: "RM", caps: ["00118"], climate_zone: "D" };

type Json = Record<string, unknown>;

function flowState(over: Json = {}, activation: Json = {}): Json {
  return {
    version: 1,
    commodity: "luce",
    customerType: "casa",
    firstName: "Mario",
    lastName: "Rossi",
    phone: "333 123 4567",
    comune: milano,
    privacyConsent: true,
    serviceType: "cambio_fornitore",
    currentSupplierLuce: "enel-energia",
    people: 2,
    gasUses: [],
    estimatedKwhYear: 1600,
    estimatedSmcYear: 500,
    chosenOffers: { luce: luceOffer, gas: null },
    leadCreated: true,
    activation: {
      taxCode: CF_MARIO_ROSSI,
      housingTitle: "proprietario",
      cap: "20122",
      address: "Via Roma",
      streetNumber: "12",
      isResident: true,
      voltage: 220,
      pod: "IT001E12345678",
      ...activation,
    },
    ...over,
  };
}

/** Opens step B directly (step A data seeded). */
async function openStepB(page: Page, flow: Json) {
  await page.route(
    (url) => url.pathname === "/offerte",
    (route) =>
      route.request().resourceType() === "document"
        ? route.fulfill({ contentType: "text/html", body: "<html><body>offerte</body></html>" })
        : route.abort(),
  );
  await page.addInitScript(
    ([fk, fv, sk]) => {
      if (sessionStorage.getItem("e2e.seeded")) return;
      sessionStorage.setItem("e2e.seeded", "1");
      sessionStorage.setItem(fk as string, fv as string);
      sessionStorage.setItem(sk as string, "B");
    },
    [FLOW_KEY, JSON.stringify(flow), STEP_KEY],
  );
  await page.goto("/attivazione");
  await expect(page.getByTestId("activation-step-b")).toBeVisible();
}

const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);

async function noOverflow(page: Page) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(o).toBeLessThanOrEqual(0);
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0, 1, 2, 3, 4, 5, 6, 7]);
const PNG_AS_JPG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

test.describe("activation step B: IBAN, document, POD/PDR", () => {
  test("IBAN: bad checksum shows an error, a valid IBAN is accepted and grouped", async ({ page }, testInfo) => {
    await openStepB(page, flowState());
    await expect(page.getByTestId("activation-payment")).toContainText("Pagamento (facoltativo)");
    await expect(page.getByTestId("iban-holder-different")).toHaveCount(0);

    await field(page, "iban").fill(BAD_IBAN);
    await field(page, "iban").blur();
    await expect(page.getByText("IBAN non valido: controlla le cifre.")).toBeVisible();

    await field(page, "iban").fill(GOOD_IBAN.toLowerCase());
    await field(page, "iban").blur();
    await expect(field(page, "iban")).toHaveValue("IT60 X054 2811 1010 0000 0123 456");
    await expect(page.getByText("IBAN non valido: controlla le cifre.")).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: `e2e/screenshots/activation-extras-${testInfo.project.name}-payment.png`, fullPage: true });
  });

  test("holder checkbox: required fields and CF/name mismatch", async ({ page }) => {
    await openStepB(page, flowState({}, { iban: GOOD_IBAN }));
    await page.getByTestId("iban-holder-different").check();
    await expect(page.getByTestId("iban-holder-fields")).toBeVisible();

    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("Inserisci il nome dell'intestatario.")).toBeVisible();
    await expect(page.getByText("Inserisci il cognome dell'intestatario.")).toBeVisible();
    await expect(page.getByText("Inserisci il codice fiscale.").first()).toBeVisible();

    await field(page, "iban_holder_first_name").fill("Mario");
    await field(page, "iban_holder_last_name").fill("Bianchi");
    await field(page, "iban_holder_tax_code").fill(CF_MARIO_ROSSI.toLowerCase());
    await field(page, "iban_holder_tax_code").blur();
    await expect(field(page, "iban_holder_tax_code")).toHaveValue(CF_MARIO_ROSSI);
    await expect(page.locator("#" + (await field(page, "iban_holder_tax_code").getAttribute("id")) + "-error")).toContainText(
      /cognome/i,
    );
  });

  test("document: partial data error", async ({ page }) => {
    await openStepB(page, flowState());
    await field(page, "document_number").fill("AB12345");
    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("Completa i dati del documento.")).toHaveCount(3);
    await field(page, "document_type").selectOption("patente");
    await field(page, "document_expiry").fill("2020-01-01");
    await field(page, "document_issuer").fill("MIT-UCO");
    await expect(page.getByText("Il documento è scaduto: controlla la data di scadenza.")).toBeVisible();
    await expect(page.getByText("Completa i dati del documento.")).toHaveCount(0);
  });

  test("upload: JPEG accepted and listed, renamed PNG rejected without blocking", async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    const created = await page.request.post("/api/lead", {
      data: { data: page1Data({ last_name: "Rossi" }) },
      headers: { Origin: baseURL, "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    });
    expect(created.status(), await created.text()).toBeLessThan(300);
    await openStepB(page, flowState());

    await page.getByTestId("document-file").setInputFiles({ name: "falso.jpg", mimeType: "image/jpeg", buffer: PNG_AS_JPG });
    await expect(page.getByTestId("document-upload-error")).toHaveText("Il file non sembra un JPG o PDF valido.");
    await expect(page.getByTestId("document-item")).toHaveCount(0);

    await page.getByTestId("document-file").setInputFiles({ name: "doc.jpg", mimeType: "image/jpeg", buffer: JPEG });
    await expect(page.getByTestId("document-item")).toHaveCount(1);
    await expect(page.getByTestId("document-item")).toContainText("doc.jpg");
    await expect(page.getByTestId("document-upload-error")).toHaveCount(0);

    await page.getByTestId("document-file").setInputFiles({ name: "doc2.jpg", mimeType: "image/jpeg", buffer: JPEG });
    await expect(page.getByTestId("document-item")).toHaveCount(2);
    await expect(page.getByTestId("document-file")).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: `e2e/screenshots/activation-extras-${testInfo.project.name}-document.png`, fullPage: true });
  });

  test("upload: wrong declared type is rejected client-side", async ({ page }) => {
    await openStepB(page, flowState());
    await page.getByTestId("document-file").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG_AS_JPG });
    await expect(page.getByTestId("document-upload-error")).toHaveText("Formato non supportato: carica un file JPG o PDF.");
  });

  test("a PDR typed in the POD field shows the message", async ({ page }) => {
    await openStepB(page, flowState({}, { pod: "" }));
    await field(page, "pod").fill("123 456 789.01234");
    await field(page, "pod").blur();
    await expect(field(page, "pod")).toHaveValue("12345678901234");
    await expect(page.getByText("Sembra un codice PDR (gas): qui serve il POD della luce, che inizia con IT.")).toBeVisible();
  });

  test("POD/comune warning is non-blocking", async ({ page }) => {
    await page.route("**/api/lead/complete", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
    );
    await openStepB(page, flowState({ comune: roma }, { cap: "00118", pod: "IT001E12345678" }));
    await expect(page.getByTestId("pod-warning")).toHaveText(
      "Controlla il POD: il distributore indicato non serve di solito questo comune.",
    );
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
  });

  test("full submit with IBAN + document reaches the thank-you page and shows in admin", async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    const surname = `Rossi${Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8).padEnd(8, "q")}`;
    const created = await page.request.post("/api/lead", {
      data: { data: page1Data({ first_name: "Mario", last_name: surname }) },
      headers: { Origin: baseURL, "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    });
    expect(created.status(), await created.text()).toBeLessThan(300);

    // The first three consonants of the surname stay R-S-S, so the CF still matches.
    await openStepB(page, flowState({ lastName: surname }));
    await field(page, "iban").fill(GOOD_IBAN);
    await field(page, "document_type").selectOption("patente");
    await field(page, "document_number").fill("U1A234567B");
    await field(page, "document_expiry").fill("2031-01-05");
    await field(page, "document_issuer").fill("MIT-UCO");
    await page.getByTestId("document-file").setInputFiles({ name: "doc.jpg", mimeType: "image/jpeg", buffer: JPEG });
    await expect(page.getByTestId("document-item")).toHaveCount(1);
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    const submit = page.getByRole("button", { name: "Accedi" });
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    await submit.click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/leads?tab=tutti&q=${surname}`);
    await page.locator('[data-testid="lead-item"]:visible').first().getByRole("link", { name: new RegExp(surname) }).click();
    await expect(page.getByTestId("lead-iban")).toHaveText("IT60 X054 2811 1010 0000 0123 456");
    await expect(page.getByTestId("group-documento")).toContainText("U1A234567B");
    await expect(page.getByTestId("lead-document")).toHaveCount(1);
    await page.getByTestId("lead-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/admin\/leads\?deleted=1$/);
  });
});
