/**
 * Step B bill section (T14.14): upload a digital PDF, in-browser reading, review dialog
 * (prefill, conflict asks, cancel), unreadable PDF, removal. Mock data mode; the document API is
 * mocked so the PDF text is the only thing under test.
 */
import { expect, test, type Page } from "@playwright/test";

const FLOW_KEY = "versus.flow.v1";
const STEP_KEY = "versus.activation.step.v1";
const CF = "BNCGLI90A41F205H";
const POD_BILL = "IT001E87654321";
const POD_TYPED = "IT001E12345678";

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

type Json = Record<string, unknown>;

function flow(over: Json = {}, activation: Json = {}): Json {
  return {
    version: 1,
    commodity: "luce",
    customerType: "casa",
    firstName: "Giulia",
    lastName: "Bianchi",
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
      taxCode: CF,
      housingTitle: "proprietario",
      cap: "20122",
      address: "Via Roma",
      streetNumber: "12",
      isResident: true,
      voltage: 220,
      pod: "",
      ...activation,
    },
    ...over,
  };
}

/** Minimal one-page text PDF (Helvetica), xref offsets computed. */
function textPdf(lines: string[]): Buffer {
  const esc = (t: string) => t.replace(/[\\()]/g, "\\$&");
  const stream = `BT /F1 12 Tf 14 TL 50 780 Td ${lines.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

const BILL = textPdf([
  "Edison Energia S.p.A.",
  "Bolletta luce",
  `Codice fiscale: ${CF}`,
  `Codice POD: ${POD_BILL}`,
]);
const EMPTY_BILL = textPdf(["Documento senza alcun dato utile", "Grazie"]);

async function openStepB(page: Page, state: Json) {
  await page.route(
    (url) => url.pathname === "/offerte",
    (route) =>
      route.request().resourceType() === "document"
        ? route.fulfill({ contentType: "text/html", body: "<html><body>offerte</body></html>" })
        : route.abort(),
  );
  let n = 0;
  await page.route("**/api/lead/document", async (route) => {
    const method = route.request().method();
    const body =
      method === "DELETE"
        ? { ok: true }
        : { ok: true, document: { id: `bill-${++n}`, kind: "bill", mime_type: "application/pdf", size_bytes: 1200 } };
    await route.fulfill({ status: method === "DELETE" ? 200 : 201, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.addInitScript(
    ([fk, fv, sk]) => {
      if (sessionStorage.getItem("e2e.seeded")) return;
      sessionStorage.setItem("e2e.seeded", "1");
      sessionStorage.setItem(fk as string, fv as string);
      sessionStorage.setItem(sk as string, "B");
    },
    [FLOW_KEY, JSON.stringify(state), STEP_KEY],
  );
  await page.goto("/attivazione");
  await expect(page.getByTestId("activation-step-b")).toBeVisible();
}

const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
const pick = (page: Page, name: string, buffer: Buffer) =>
  page.getByTestId("bill-file").setInputFiles({ name, mimeType: "application/pdf", buffer });

async function noOverflow(page: Page) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(o).toBeLessThanOrEqual(0);
}

test.describe("activation step B: bill", () => {
  test("PDF read in the browser: dialog prefilled, confirm fills empty fields, bill removable", async ({ page }) => {
    await openStepB(page, flow());
    await expect(page.getByTestId("activation-bill")).toContainText("Bolletta (facoltativa)");
    await pick(page, "bolletta.pdf", BILL);

    const dialog = page.getByRole("dialog", { name: "Dati letti dalla bolletta: verifica e correggi" });
    await expect(dialog).toBeVisible();
    await expect(field(page, "bill_pod")).toHaveValue(POD_BILL);
    await expect(field(page, "bill_tax_code")).toHaveValue(CF);
    await expect(field(page, "bill_supplier_luce")).toHaveValue("edison-energia");
    await expect(field(page, "bill_pdr")).toHaveCount(0);
    await expect(page.getByTestId("bill-replace-pod")).toHaveCount(0);
    // The supplier select already had a value: it asks before replacing it.
    await expect(page.getByTestId("bill-replace-supplierLuce")).not.toBeChecked();
    await page.getByTestId("bill-replace-supplierLuce").check();
    // Same codice fiscale as step A: nothing to ask.
    await expect(page.getByTestId("bill-replace-taxCode")).toHaveCount(0);
    await noOverflow(page);

    await page.getByTestId("bill-dialog-confirm").click();
    await expect(dialog).toHaveCount(0);
    await expect(field(page, "pod")).toHaveValue(POD_BILL);
    await expect(field(page, "current_supplier_luce")).toHaveValue("edison-energia");
    await expect(page.getByTestId("bill-item")).toContainText("bolletta.pdf");
    // The ID document section is untouched by the bill.
    await expect(page.getByTestId("document-item")).toHaveCount(0);
    await expect(page.getByTestId("document-file")).toHaveCount(1);

    await page.getByTestId("bill-remove").click();
    await expect(page.getByTestId("bill-item")).toHaveCount(0);
    await expect(page.getByTestId("bill-file")).toHaveCount(1);
    await expect(field(page, "pod")).toHaveValue(POD_BILL);
  });

  test("conflict: a typed value is replaced only if ticked; cancel changes nothing", async ({ page }) => {
    await openStepB(page, flow({ currentSupplierLuce: "enel-energia" }, { pod: POD_TYPED }));
    await pick(page, "bolletta.pdf", BILL);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("bill-replace-pod")).not.toBeChecked();
    await expect(page.getByTestId("bill-replace-supplierLuce")).not.toBeChecked();
    await expect(page.getByText(`Sostituisci il valore inserito (${POD_TYPED})?`)).toBeVisible();

    // Cancel: nothing written, the bill itself stays uploaded.
    await page.getByTestId("bill-dialog-cancel").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(field(page, "pod")).toHaveValue(POD_TYPED);
    await expect(field(page, "current_supplier_luce")).toHaveValue("enel-energia");
    await expect(page.getByTestId("bill-item")).toBeVisible();

    // Confirm without ticking: still the typed values.
    await page.getByTestId("bill-remove").click();
    await pick(page, "bolletta.pdf", BILL);
    await page.getByTestId("bill-dialog-confirm").click();
    await expect(field(page, "pod")).toHaveValue(POD_TYPED);
    await expect(field(page, "current_supplier_luce")).toHaveValue("enel-energia");

    // Tick only the POD.
    await page.getByTestId("bill-remove").click();
    await pick(page, "bolletta.pdf", BILL);
    await page.getByTestId("bill-replace-pod").check();
    await page.getByTestId("bill-dialog-confirm").click();
    await expect(field(page, "pod")).toHaveValue(POD_BILL);
    await expect(field(page, "current_supplier_luce")).toHaveValue("enel-energia");
  });

  test("dialog values go through validation; unreadable PDF asks to type by hand", async ({ page }) => {
    await openStepB(page, flow());
    await pick(page, "bolletta.pdf", BILL);
    await field(page, "bill_pod").fill("IT12");
    await page.getByTestId("bill-dialog-confirm").click();
    await expect(page.getByText("Codice POD non valido: controlla i caratteri.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByTestId("bill-dialog-cancel").click();

    await page.getByTestId("bill-remove").click();
    await pick(page, "vuota.pdf", EMPTY_BILL);
    await expect(page.getByTestId("bill-unreadable")).toHaveText("Non siamo riusciti a leggere i dati: inseriscili a mano.");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("bill-item")).toContainText("vuota.pdf");
    await expect(field(page, "pod")).toHaveValue("");
  });

  test("non-PDF and oversized files are refused before any upload", async ({ page }) => {
    await openStepB(page, flow());
    await page.getByTestId("bill-file").setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") });
    await expect(page.getByTestId("bill-error")).toHaveText("Carica la bolletta in formato PDF.");
    await page.getByTestId("bill-file").setInputFiles({
      name: "grande.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(4 * 1024 * 1024 + 1),
    });
    await expect(page.getByTestId("bill-error")).toContainText("4 MB");
    await expect(page.getByTestId("bill-item")).toHaveCount(0);
    await noOverflow(page);
  });
});
