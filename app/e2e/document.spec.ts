/**
 * Identity document in activation step B (T18.8): mandatory, type first, Fronte/Retro or the
 * passport photo page, per-side check, big collapsed "Documento caricato" state, reopen/remove,
 * back navigation, type change, blocked submit. The flow is seeded, the document and complete
 * APIs are mocked (the server rule is covered by its own unit tests).
 */
import { expect, test, type Page } from "@playwright/test";
import { ID_BACK, ID_FRONT, PASSPORT_PAGE, SEEDED_ID_DOCUMENT, uploadRequiredSides, uploadSide } from "./helpers/identity-document";

const FLOW_KEY = "versus.flow.v1";
const STEP_KEY = "versus.activation.step.v1";
type Json = Record<string, unknown>;

const luceOffer = {
  offer_id: "offer-doc-luce",
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

function flow(activation: Json = {}): Json {
  return {
    version: 1,
    commodity: "luce",
    customerType: "casa",
    firstName: "Mario",
    lastName: "Rossi",
    phone: "333 123 4567",
    email: "mario.rossi@example.it",
    comune: { istat: "015146", name: "Milano", province: "MI", caps: ["20121", "20122"], climate_zone: "E" },
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
      taxCode: "RSSMRA85T10A562S",
      housingTitle: "proprietario",
      cap: "20122",
      address: "Via Roma",
      streetNumber: "12",
      isResident: true,
      voltage: 220,
      pod: "IT001E12345678",
      ...activation,
    },
  };
}

type Mocks = { complete: Json[]; deleted: string[] };
/** The `data` object of a recorded complete request. */
const sent = (m: Mocks, i = 0) => m.complete[i].data as Json;

async function openStepB(
  page: Page,
  activation: Json = {},
  completeResponse: { status: number; body: Json } = { status: 200, body: { ok: true } },
): Promise<Mocks> {
  const mocks: Mocks = { complete: [], deleted: [] };
  await page.route(
    (url) => url.pathname === "/offerte",
    (route) =>
      route.request().resourceType() === "document"
        ? route.fulfill({ contentType: "text/html", body: "<html><body>offerte</body></html>" })
        : route.abort(),
  );
  let n = 0;
  await page.route("**/api/lead/document", async (route) => {
    const req = route.request();
    if (req.method() === "DELETE") {
      mocks.deleted.push((JSON.parse(req.postData() ?? "{}") as { id: string }).id);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        document: { id: `up-${++n}`, kind: "id_document", mime_type: "image/jpeg", size_bytes: 2000 },
      }),
    });
  });
  await page.route("**/api/lead/complete", async (route) => {
    mocks.complete.push(JSON.parse(route.request().postData() ?? "{}") as Json);
    await route.fulfill({
      status: completeResponse.status,
      contentType: "application/json",
      body: JSON.stringify(completeResponse.body),
    });
  });
  await page.addInitScript(
    ([fk, fv, sk]) => {
      if (sessionStorage.getItem("e2e.seeded")) return;
      sessionStorage.setItem("e2e.seeded", "1");
      sessionStorage.setItem(fk as string, fv as string);
      sessionStorage.setItem(sk as string, "B");
    },
    [FLOW_KEY, JSON.stringify(flow(activation)), STEP_KEY],
  );
  await page.goto("/attivazione");
  await expect(page.getByTestId("activation-step-b")).toBeVisible();
  return mocks;
}

const typeSelect = (page: Page) => page.locator('[name="document_type"]');
const collapsed = (page: Page) => page.getByTestId("document-collapsed");

test.describe("identity document: required sides per type", () => {
  test("starts with the type picker only; the old data fields and the optional wording are gone", async ({ page }) => {
    await openStepB(page);
    const section = page.getByTestId("activation-document");
    await expect(section.getByRole("heading", { name: "Documento d'identità" })).toBeVisible();
    await expect(typeSelect(page)).toHaveValue("");
    await expect(page.getByTestId("document-upload")).toHaveCount(0);
    for (const name of ["document_number", "document_expiry", "document_issuer"]) {
      await expect(page.locator(`[name="${name}"]`)).toHaveCount(0);
    }
    await expect(section).not.toContainText(/facoltativ/i);
    await expect(section).not.toContainText(/passaporto, o con un PDF/i);
  });

  for (const type of ["carta_identita", "patente"] as const) {
    test(`${type}: front and back are both required, then it collapses into the big check`, async ({ page }) => {
      const mocks = await openStepB(page);
      await typeSelect(page).selectOption(type);
      await expect(page.getByTestId("document-slot-front")).toContainText("Fronte del documento");
      await expect(page.getByTestId("document-slot-back")).toContainText("Retro del documento");

      await uploadSide(page, "front", ID_FRONT);
      await expect(collapsed(page)).toHaveCount(0);
      await uploadSide(page, "back", ID_BACK);

      await expect(collapsed(page)).toBeVisible();
      await expect(collapsed(page)).toContainText("Documento caricato");
      await expect(page.getByTestId("document-done-status")).toHaveText("Documento caricato");
      await expect(page.getByTestId("document-upload")).toHaveCount(0);

      await page.getByTestId("activation-submit").click();
      await expect(page).toHaveURL(/\/grazie$/);
      expect(mocks.complete).toHaveLength(1);
      expect(sent(mocks)).toMatchObject({ document_type: type });
      for (const k of ["document_number", "document_expiry", "document_issuer"]) {
        expect(sent(mocks)).not.toHaveProperty(k);
      }
    });
  }

  test("passaporto: a single 'Pagina con la foto' upload, no retro", async ({ page }) => {
    const mocks = await openStepB(page);
    await typeSelect(page).selectOption("passaporto");
    await expect(page.getByTestId("document-slot-front")).toContainText("Pagina con la foto");
    await expect(page.getByTestId("document-slot-back")).toHaveCount(0);
    await uploadSide(page, "front", PASSPORT_PAGE);
    await expect(collapsed(page)).toBeVisible();
    await expect(collapsed(page)).toContainText("Passaporto");
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
    expect(sent(mocks)).toMatchObject({ document_type: "passaporto" });
  });
});

test.describe("identity document: blocked submit", () => {
  test("no type: the submit is blocked, the select shows the error and has the focus", async ({ page }) => {
    const mocks = await openStepB(page);
    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("Seleziona il tipo di documento.")).toBeVisible();
    await expect(typeSelect(page)).toBeFocused();
    expect(mocks.complete).toHaveLength(0);
  });

  test("a side missing: blocked client-side with an Italian message, document section focused", async ({ page }) => {
    const mocks = await openStepB(page);
    await typeSelect(page).selectOption("carta_identita");
    await uploadSide(page, "front", ID_FRONT);
    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("document-missing-error")).toHaveText("Carica entrambi i lati: fronte e retro del documento.");
    await expect
      .poll(() =>
        page.evaluate(() => document.querySelector('[data-testid="document-section"]')?.contains(document.activeElement) ?? false),
      )
      .toBe(true);
    await expect(page.getByTestId("document-section")).toBeInViewport();
    expect(mocks.complete).toHaveLength(0);

    // Uploading the missing side clears the error and the submit goes through.
    await uploadSide(page, "back", ID_BACK);
    await expect(page.getByTestId("document-missing-error")).toHaveCount(0);
    await expect(collapsed(page)).toBeVisible();
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
  });

  test("passport without the photo page: the passport wording", async ({ page }) => {
    await openStepB(page);
    await typeSelect(page).selectOption("passaporto");
    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("document-missing-error")).toHaveText("Carica la pagina del passaporto con la foto.");
  });

  test("the server answers id_document required: mapped to the document section", async ({ page }) => {
    // Files look complete to the client (seeded) but the server says they are missing.
    await openStepB(page, SEEDED_ID_DOCUMENT, {
      status: 422,
      body: { ok: false, error: "validation", fields: { id_document: "required" } },
    });
    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("activation-step-b")).toBeVisible();
    await expect(page).toHaveURL(/\/attivazione/);
    await expect(collapsed(page)).toHaveCount(0);
    await expect(page.getByTestId("document-missing-error")).toContainText("documento d'identità");
  });
});

test.describe("identity document: reversible", () => {
  test("big check state: Modifica reopens with a check per side, Rimuovi works, uploading again collapses", async ({ page }) => {
    const mocks = await openStepB(page, SEEDED_ID_DOCUMENT);
    await expect(collapsed(page)).toBeVisible();
    await expect(page.getByTestId("document-done-status")).toHaveText(""); // restored, not announced

    await page.getByTestId("document-edit").click();
    await expect(collapsed(page)).toHaveCount(0);
    await expect(page.getByTestId("document-slot-front-badge")).toBeVisible();
    await expect(page.getByTestId("document-slot-back-badge")).toBeVisible();

    await page.getByTestId("document-slot-back").getByTestId("document-remove").click();
    await expect(page.getByTestId("document-file-back")).toHaveCount(1);
    await expect(page.getByTestId("document-slot-back-badge")).toHaveCount(0);
    expect(mocks.deleted).toEqual(["e2e-doc-back"]);

    await uploadSide(page, "back", ID_BACK);
    await expect(collapsed(page)).toBeVisible();
  });

  test("Fatto closes a reviewed section without changing anything", async ({ page }) => {
    await openStepB(page, SEEDED_ID_DOCUMENT);
    await page.getByTestId("document-edit").click();
    await expect(collapsed(page)).toHaveCount(0);
    await page.getByTestId("document-done").click();
    await expect(collapsed(page)).toBeVisible();
  });

  test("going back to step A and returning keeps the checks and the remove option", async ({ page }) => {
    await openStepB(page);
    await uploadRequiredSides(page, "patente");
    await expect(collapsed(page)).toBeVisible();

    await page.getByTestId("activation-back").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-step-b")).toBeVisible();

    await expect(collapsed(page)).toBeVisible();
    await page.getByTestId("document-edit").click();
    await expect(typeSelect(page)).toHaveValue("patente");
    await expect(page.getByTestId("document-slot-front-badge")).toBeVisible();
    await expect(page.getByTestId("document-slot-back-badge")).toBeVisible();
    await expect(page.getByTestId("document-slot-front").getByTestId("document-remove")).toBeVisible();
    await expect(page.getByTestId("document-slot-back").getByTestId("document-remove")).toBeVisible();
  });

  test("changing the type keeps the files that still fit", async ({ page }) => {
    const mocks = await openStepB(page, SEEDED_ID_DOCUMENT);
    await page.getByTestId("document-edit").click();

    await typeSelect(page).selectOption("passaporto");
    await expect(page.getByTestId("document-slot-back")).toHaveCount(0);
    await expect(page.getByTestId("document-slot-front-badge")).toBeVisible();
    await expect.poll(() => mocks.deleted).toEqual(["e2e-doc-back"]); // the unused retro is dropped

    await typeSelect(page).selectOption("patente");
    await expect(page.getByTestId("document-slot-front-badge")).toBeVisible(); // front kept
    await expect(page.getByTestId("document-file-back")).toHaveCount(1); // retro asked again
    await expect(collapsed(page)).toHaveCount(0);
  });

  test("no horizontal overflow with the section open and collapsed", async ({ page }) => {
    await openStepB(page, SEEDED_ID_DOCUMENT);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.getByTestId("document-edit").click();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
