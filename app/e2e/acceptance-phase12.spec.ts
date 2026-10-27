/**
 * Final acceptance, Phase 12/12b (mock data layer). Items already covered by activation-extras,
 * admin-leads-activation, admin-settings and thankyou specs are NOT duplicated; this file adds the
 * remaining checklist items (A settings, B step-B gaps, C thank-you number, D admin detail with
 * PDF + removal, E privacy). Runs on desktop (1440) and mobile (390) projects.
 */
import { expect, test, type Page } from "@playwright/test";
import { page1Data, VALID_POD } from "../src/lib/lead/test-fixtures";

const FLOW_KEY = "versus.flow.v1";
const STEP_KEY = "versus.activation.step.v1";
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const GOOD_IBAN = "IT60X0542811101000000123456";
const BAD_CHECK_IBAN = "IT61X0542811101000000123456";
const CF_MARIO_ROSSI = "RSSMRA85T10A562S";
const PHONE_ERR = "Usa solo cifre e spazi, con + iniziale facoltativo (6–20 caratteri). Es. +39 095 1234567";
const DEFAULT_PHONE = "+39 095 0000000";
const NEW_PHONE = "+39 095 7654321";

type Json = Record<string, unknown>;
const rnd = () => Math.floor(Math.random() * 250);
const rand = () => Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8).padEnd(8, "q");

const luceOffer = {
  offer_id: "offer-aldo-10", commodity: "luce", offer_name: "Offerta Edison Energia",
  supplier_id: "edison-energia", supplier_name: "Edison Energia", supplier_logo_path: null,
  energy_price: 0.2, other_variable_costs: 0, fixed_fee_monthly: 0, other_fixed_costs_monthly: 0,
  locked_months: 12, activation_cost: 0, promo_text: null, monthly_cost: 50,
};
const catania = { istat: "087015", name: "Catania", province: "CT", caps: ["95121", "95122"], climate_zone: "B" };

function flowState(activation: Json = {}, over: Json = {}): Json {
  return {
    version: 1, commodity: "luce", customerType: "casa", firstName: "Mario", lastName: "Rossi",
    phone: "333 123 4567", comune: catania, privacyConsent: true, serviceType: "cambio_fornitore",
    currentSupplierLuce: "enel-energia", people: 2, gasUses: [], estimatedKwhYear: 1600, estimatedSmcYear: 500,
    chosenOffers: { luce: luceOffer, gas: null }, leadCreated: true,
    activation: {
      taxCode: CF_MARIO_ROSSI, housingTitle: "proprietario", cap: "95121", address: "Via Etnea",
      streetNumber: "12", isResident: true, voltage: 220, pod: VALID_POD, ...activation,
    },
    ...over,
  };
}

async function openStepB(page: Page, flow: Json) {
  await page.route((u) => u.pathname === "/offerte", (r) =>
    r.request().resourceType() === "document"
      ? r.fulfill({ contentType: "text/html", body: "<html><body>offerte</body></html>" })
      : r.abort());
  const ip = `10.6.${rnd()}.${rnd()}`;
  await page.route("**/api/lead/document", (r) => r.continue({ headers: { ...r.request().headers(), "x-forwarded-for": ip } }));
  await page.addInitScript(([fk, fv, sk]) => {
    if (sessionStorage.getItem("e2e.seeded")) return;
    sessionStorage.setItem("e2e.seeded", "1");
    sessionStorage.setItem(fk as string, fv as string);
    sessionStorage.setItem(sk as string, "B");
  }, [FLOW_KEY, JSON.stringify(flow), STEP_KEY]);
  await page.goto("/attivazione");
  await expect(page.getByTestId("activation-step-b")).toBeVisible();
}
const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);

async function createLead(page: Page, baseURL: string) {
  const r = await page.request.post("/api/lead", {
    data: { data: page1Data({ last_name: "Rossi" }) },
    headers: { Origin: baseURL, "x-forwarded-for": `10.5.${rnd()}.${rnd()}` },
  });
  expect(r.status(), await r.text()).toBeLessThan(300);
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

const JPEG_1PX = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

async function makeJpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 120;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3a7"; ctx.fillRect(0, 0, 200, 120);
    const blob: Blob = await new Promise((r) => c.toBlob((x) => r(x!), "image/jpeg", 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  });
  return Buffer.from(b64, "base64");
}

test.describe("A. admin settings", () => {
  test("resend.dev banner, test email result, callback number save + reject", async ({ page }, testInfo) => {
    // Root cause: the mock repository (and its single settings row) is one process-wide instance in the
    // dev server, shared by the desktop and mobile projects running in parallel; each project's save/reject
    // overwrote the number the other asserted. The settings flow is not viewport-specific, so run it once.
    test.skip(testInfo.project.name !== "desktop", "global settings row: covered once, on desktop");
    test.slow();
    try {
      await login(page);
      await page.goto("/admin/impostazioni");

      // Banner: playwright.config.ts sets RESEND_FROM=onboarding@resend.dev for the dev server.
      await expect(page.getByTestId("resend-dev-warning")).toBeVisible();
      await expect(page.getByTestId("resend-dev-warning")).toContainText(/resend\.dev/i);

      const form = page.getByTestId("test-email-form");
      await expect(form).toHaveAttribute("data-test-attempt", "0", { timeout: 20_000 });
      await page.getByRole("button", { name: "Invia email di prova" }).click();
      await expect(form).toHaveAttribute("data-test-attempt", "1");
      const result = (await page.getByTestId("test-email-result").innerText()).trim();
      expect(result.length).toBeGreaterThan(10);

      const settings = page.locator("form[data-attempt]");
      const phone = page.getByLabel("Numero da cui chiamiamo");
      let attempt = Number(await settings.getAttribute("data-attempt"));
      await phone.fill("abc");
      await page.getByRole("button", { name: "Salva" }).click();
      await expect(settings).toHaveAttribute("data-attempt", String(attempt + 1));
      await expect(page.getByText(PHONE_ERR)).toBeVisible();

      attempt += 1;
      await phone.fill(NEW_PHONE);
      await page.getByRole("button", { name: "Salva" }).click();
      await expect(settings).toHaveAttribute("data-attempt", String(attempt + 1));
      await expect(page.getByTestId("settings-saved")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Numero da cui chiamiamo")).toHaveValue(NEW_PHONE);

      // C. the thank-you page shows the saved number.
      await page.addInitScript((flow) => {
        if (sessionStorage.getItem("e2e.seeded")) return;
        sessionStorage.setItem("e2e.seeded", "1");
        sessionStorage.setItem("versus.flow.v1", flow);
      }, JSON.stringify({ version: 1, commodity: "luce", customerType: "private", firstName: "Mario", lastName: "Rossi", phone: "3331234567", chosenOffers: { luce: luceOffer, gas: null }, leadCreated: true, leadCompleted: true }));
      await page.goto("/grazie");
      await expect(page.getByTestId("thankyou-heading")).toHaveText("Grazie, Mario!");
      await expect(page.getByRole("link", { name: NEW_PHONE })).toHaveAttribute("href", "tel:+390957654321");

    } finally {
      // Restore the original number for the other specs, even when an assertion above failed.
      await page.goto("/admin/impostazioni");
      await page.getByLabel("Numero da cui chiamiamo").fill(DEFAULT_PHONE);
      const before = Number(await page.locator("form[data-attempt]").getAttribute("data-attempt"));
      await page.getByRole("button", { name: "Salva" }).click();
      await expect(page.locator("form[data-attempt]")).toHaveAttribute("data-attempt", String(before + 1));
    }
  });
});

test.describe("B/F. activation step B", () => {
  test("empty IBAN and no document: can continue to the thank-you page", async ({ page }) => {
    await page.route("**/api/lead/complete", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    await openStepB(page, flowState());
    await expect(field(page, "iban")).toHaveValue("");
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
  });

  test("IBAN: messy input accepted + normalized on submit; wrong check digit rejected", async ({ page }) => {
    let completeBody = "";
    await page.route("**/api/lead/complete", (r) => {
      completeBody = r.request().postData() ?? "";
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await openStepB(page, flowState());
    await field(page, "iban").fill(BAD_CHECK_IBAN);
    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("IBAN non valido: controlla le cifre.")).toBeVisible();
    await expect(page).toHaveURL(/\/attivazione/);

    await field(page, "iban").fill("it60 x054 2811 1010 0000 0123 456");
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
    expect(completeBody).toContain(GOOD_IBAN);
    expect(completeBody).not.toContain("it60");
  });

  test("holder different: 3 required fields; CF not matching the name rejected", async ({ page }) => {
    await openStepB(page, flowState({ iban: GOOD_IBAN }));
    await page.getByLabel("L'intestatario del conto è diverso").check();
    await expect(page.getByTestId("iban-holder-fields")).toBeVisible();
    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("Inserisci il nome dell'intestatario.")).toBeVisible();
    await expect(page.getByText("Inserisci il cognome dell'intestatario.")).toBeVisible();
    await expect(page.getByText("Inserisci il codice fiscale.").first()).toBeVisible();
    await field(page, "iban_holder_first_name").fill("Mario");
    await field(page, "iban_holder_last_name").fill("Bianchi");
    await field(page, "iban_holder_tax_code").fill(CF_MARIO_ROSSI);
    await field(page, "iban_holder_tax_code").blur();
    await expect(page.locator("#" + (await field(page, "iban_holder_tax_code").getAttribute("id")) + "-error")).toContainText(/cognome/i);
  });

  test("document with past expiry rejected", async ({ page }) => {
    await openStepB(page, flowState());
    await field(page, "document_type").selectOption("patente");
    await field(page, "document_number").fill("U1A234567B");
    await field(page, "document_expiry").fill("2020-01-01");
    await field(page, "document_issuer").fill("MIT-UCO");
    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("Il documento è scaduto: controlla la data di scadenza.")).toBeVisible();
    await expect(page).toHaveURL(/\/attivazione/);
  });

  test("upload: JPEG + PDF ok, 3rd rejected, remove + re-upload ok, .txt rejected", async ({ page }, testInfo) => {
    await createLead(page, String(testInfo.project.use.baseURL));
    await openStepB(page, flowState());
    const jpeg = await makeJpeg(page);
    const input = page.getByTestId("document-file");

    await input.setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByTestId("document-upload-error")).toHaveText("Formato non supportato: carica un file JPG o PDF.");
    await expect(page.getByTestId("document-item")).toHaveCount(0);

    await input.setInputFiles({ name: "fronte.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await expect(page.getByTestId("document-item")).toHaveCount(1);
    await input.setInputFiles({ name: "retro.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(page.getByTestId("document-item")).toHaveCount(2);
    await expect(page.getByTestId("document-item").nth(1)).toContainText("retro.pdf");
    // 3rd file: the input is gone (max 2) and a forced upload is refused by the server.
    await expect(page.getByTestId("document-file")).toHaveCount(0);
    const third = await page.request.post("/api/lead/document", {
      multipart: { file: { name: "terzo.jpg", mimeType: "image/jpeg", buffer: jpeg } },
      headers: { "x-forwarded-for": `10.4.${rnd()}.${rnd()}` },
    });
    expect(third.status()).toBeGreaterThanOrEqual(400);

    await page.getByRole("button", { name: "Rimuovi retro.pdf" }).click();
    await expect(page.getByTestId("document-item")).toHaveCount(1);
    await page.getByTestId("document-file").setInputFiles({ name: "nuovo.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await expect(page.getByTestId("document-item")).toHaveCount(2);
    await expect(page.getByTestId("document-item").nth(1)).toContainText("nuovo.jpg");
  });

  test("POD normalized, PDR in POD field flagged, IT002 POD with Catania warns without blocking", async ({ page }) => {
    await page.route("**/api/lead/complete", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    await openStepB(page, flowState({ pod: "" }));
    await field(page, "pod").fill("it001e 1234 5678");
    await field(page, "pod").blur();
    await expect(field(page, "pod")).toHaveValue("IT001E12345678");

    await field(page, "pod").fill("12345678901234");
    await field(page, "pod").blur();
    await expect(page.getByText("Sembra un codice PDR (gas): qui serve il POD della luce, che inizia con IT.")).toBeVisible();

    await field(page, "pod").fill("IT002E12345678");
    await field(page, "pod").blur();
    await expect(page.getByTestId("pod-warning")).toHaveText(
      "Controlla il POD: il distributore indicato non serve di solito questo comune.");
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
  });
});

test.describe("D. admin lead detail", () => {
  test("Pagamento/Documento, JPEG kept, removed PDF absent, luce distributor only, delete lead", async ({ page, playwright }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    const surname = `Accet${rand()}`;
    const ctx = await playwright.request.newContext({
      baseURL, extraHTTPHeaders: { Origin: baseURL, "x-forwarded-for": `10.3.${rnd()}.${rnd()}` },
    });
    const created = await ctx.post("/api/lead", { data: { data: page1Data({ first_name: "Livia", last_name: surname }) } });
    expect(created.status(), await created.text()).toBeLessThan(300);
    const patched = await ctx.patch("/api/lead", {
      data: { data: { pod: "IT001E12345678", pdr: null, iban: GOOD_IBAN, document_type: "carta_identita", document_number: "CA12345AB", document_expiry: "2032-03-04", document_issuer: "Comune di Catania" } },
    });
    expect(patched.status(), await patched.text()).toBeLessThan(300);
    const up1 = await ctx.post("/api/lead/document", { multipart: { file: { name: "doc.jpg", mimeType: "image/jpeg", buffer: JPEG_1PX } } });
    expect(up1.status(), await up1.text()).toBe(201);
    const up2 = await ctx.post("/api/lead/document", { multipart: { file: { name: "doc.pdf", mimeType: "application/pdf", buffer: PDF } } });
    expect(up2.status(), await up2.text()).toBe(201);
    const pdfId = (await up2.json()).document.id as string;
    const rm = await ctx.delete("/api/lead/document", { data: { id: pdfId } });
    expect(rm.status(), await rm.text()).toBe(200);
    await ctx.dispose();

    await login(page);
    await page.goto(`/admin/leads?tab=tutti&q=${surname}`);
    await page.locator('[data-testid="lead-item"]:visible').first().getByRole("link", { name: new RegExp(surname) }).click();
    await expect(page).toHaveURL(/\/admin\/leads\/[^/?]+$/);
    const leadUrl = page.url();

    await expect(page.getByTestId("group-pagamento")).toContainText("IT60 X054 2811 1010 0000 0123 456");
    await expect(page.getByTestId("group-documento")).toContainText("CA12345AB");
    await expect(page.getByTestId("lead-document")).toHaveCount(1);
    await expect(page.getByTestId("lead-document")).toContainText("JPEG");
    await expect(page.getByTestId("lead-document")).not.toContainText("PDF");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("lead-document-download").click()]);
    expect(download.suggestedFilename()).toMatch(/\.jpe?g$/i);
    await page.getByTestId("lead-document-preview").click();
    await expect(page.getByTestId("lead-document-inline")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);

    // Luce distributor shown; no gas distributor line (no PDR).
    await expect(page.getByTestId("pod-distributor")).toHaveText("Distributore luce: e-distribuzione");
    await expect(page.getByTestId("pdr-distributor")).toHaveCount(0);

    await page.getByTestId("lead-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/admin\/leads\?deleted=1$/);
    // File removal on lead delete is asserted at repository level (mock-documents.test.ts:86); here the lead is gone.
    const gone = await page.goto(leadUrl);
    expect(gone?.status()).toBe(404);
  });
});

test.describe("E. privacy", () => {
  test("shows the ID document + IBAN section", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText("IBAN e documento d'identità (facoltativi)")).toBeVisible();
    await expect(page.getByText("I file caricati sono cancellati insieme alla tua richiesta.")).toBeVisible();
  });
});
