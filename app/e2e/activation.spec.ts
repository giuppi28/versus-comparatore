/**
 * Activation form (PRD §10): Step A "Dati intestatario", Step B "Fornitura", sticky summary.
 * The flow state is seeded in sessionStorage; POST /api/lead/complete is intercepted, so the
 * specs do not depend on the other screens or on the network.
 *
 * Test ids (all inputs also have a `name` attribute equal to the API field):
 *   activation-loading, activation-step-a, activation-step-b, activation-next, activation-back,
 *   activation-submit, activation-error, activation-general-error,
 *   housing_title-{proprietario|inquilino|usufruttuario|altro}, is_resident-{yes|no},
 *   voltage-{220|380}, gas-use-{cucina|riscaldamento|acqua_calda}  (wrappers: click the inner role=radio/checkbox),
 *   activation-luce, activation-gas, activation-summary, summary-total, summary-toggle,
 *   summary-details, summary-offer-{luce|gas}, summary-monthly-{luce|gas}, summary-product-*,
 *   summary-activation-*, summary-locked-*, summary-price-*, summary-fixed-*.
 */
import { expect, test, type Page, type Request } from "@playwright/test";

const FLOW_KEY = "versus.flow.v1";
const STEP_KEY = "versus.activation.step.v1";

// Valid examples (check characters verified with the shared validators' algorithm).
const CF_MARIO_ROSSI = "RSSMRA85T10A562S";
const CF_GIULIA_BIANCHI = "BNCGLI90A41F205H";
const PIVA = "12345678903";
const POD = "IT001E12345678";
const PDR = "12345678901234";

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
const gasOffer = {
  ...luceOffer,
  offer_id: "offer-plenitude-gas-fisso-12",
  commodity: "gas",
  offer_name: "Plenitude Gas Fisso 12",
  supplier_id: "eni-plenitude",
  supplier_name: "Eni Plenitude",
  energy_price: 0.45,
  fixed_fee_monthly: 7,
  locked_months: 24,
  monthly_cost: 40.1,
};

const milano = {
  istat: "015146",
  name: "Milano",
  province: "MI",
  caps: ["20121", "20122"],
  climate_zone: "E",
};

type Json = Record<string, unknown>;

function casaLuce(over: Json = {}): Json {
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
    // Page 1 results the real /offerte screen needs (its guard redirects to "/" without them).
    estimatedKwhYear: 1600,
    estimatedSmcYear: 500,
    chosenOffers: { luce: luceOffer, gas: null },
    leadCreated: true,
    ...over,
  };
}

function businessDual(over: Json = {}): Json {
  return casaLuce({
    commodity: "dual",
    customerType: "business",
    firstName: "Giulia",
    lastName: "Bianchi",
    companyName: "Bianchi Srl",
    currentSupplierGas: "iren",
    hasGas: true,
    gasUses: ["cucina"],
    chosenOffers: { luce: luceOffer, gas: gasOffer },
    ...over,
  });
}

/** Seeds sessionStorage once per browser context (a reload keeps what the page left). */
async function open(page: Page, flow: Json | null, path = "/attivazione") {
  // /offerte belongs to another screen. router.push first fetches an RSC payload
  // ("/offerte?_rsc=..."), which a plain "**/offerte" glob does not match: match on the
  // pathname, abort the RSC fetch (Next then falls back to a document navigation) and
  // serve a stub document, so no test depends on that screen or on its cold compile.
  await page.route(
    (url) => url.pathname === "/offerte",
    (route) =>
      route.request().resourceType() === "document"
        ? route.fulfill({ contentType: "text/html", body: "<html><body>offerte</body></html>" })
        : route.abort(),
  );
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("e2e.seeded")) return;
      sessionStorage.setItem("e2e.seeded", "1");
      if (value) sessionStorage.setItem(key as string, value as string);
    },
    [FLOW_KEY, flow ? JSON.stringify(flow) : null],
  );
  await page.goto(path);
}

type CompleteMock = { requests: Json[] };

/** Intercepts POST /api/lead/complete: records the bodies and answers with `respond`. */
async function mockComplete(
  page: Page,
  respond: (n: number) => { status: number; body: Json; headers?: Record<string, string> } = () => ({
    status: 200,
    body: { ok: true },
  }),
): Promise<CompleteMock> {
  const mock: CompleteMock = { requests: [] };
  await page.route("**/api/lead/complete", async (route) => {
    const req: Request = route.request();
    mock.requests.push(JSON.parse(req.postData() ?? "{}") as Json);
    const r = respond(mock.requests.length);
    await route.fulfill({
      status: r.status,
      contentType: "application/json",
      headers: r.headers,
      body: JSON.stringify(r.body),
    });
  });
  return mock;
}

const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
const radio = (page: Page, testId: string) => page.getByTestId(testId).getByRole("radio");

async function fillStepA(page: Page, o: { cf?: string; housing?: string; piva?: string } = {}) {
  await field(page, "tax_code").fill(o.cf ?? CF_MARIO_ROSSI);
  if (o.piva) await field(page, "vat_number").fill(o.piva);
  await radio(page, `housing_title-${o.housing ?? "proprietario"}`).click();
}

async function fillAddress(page: Page) {
  await field(page, "cap").selectOption("20122");
  await field(page, "address").fill("Via Roma");
  await field(page, "street_number").fill("12/A");
  await radio(page, "is_resident-yes").click();
}

async function storedFlow(page: Page): Promise<Json> {
  return page.evaluate((k) => JSON.parse(sessionStorage.getItem(k) ?? "null"), FLOW_KEY);
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const shot = (page: Page, project: string, name: string) =>
  page.screenshot({ path: `e2e/screenshots/activation-${project}-${name}.png`, fullPage: true });

test.describe("activation form", () => {
  test("casa luce cambio fornitore: full happy path and request body", async ({ page }, testInfo) => {
    const mock = await mockComplete(page);
    await open(page, casaLuce());

    // Step A: prefilled + summary.
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(field(page, "first_name")).toHaveValue("Mario");
    await expect(field(page, "last_name")).toHaveValue("Rossi");
    await expect(field(page, "phone")).toHaveValue("333 123 4567");
    await expect(field(page, "email")).toHaveCount(0);
    await expect(field(page, "vat_number")).toHaveCount(0);
    await expect(page.getByTestId("summary-total")).toHaveText(/^50,00\s€$/);
    await expectNoOverflow(page);
    await shot(page, testInfo.project.name, "a-empty");

    await fillStepA(page);
    await shot(page, testInfo.project.name, "a-filled");
    await page.getByTestId("activation-next").click();

    // Step B.
    await expect(page.getByTestId("activation-step-b")).toBeVisible();
    await expect(field(page, "comune")).toHaveValue("Milano (MI)");
    await expect(field(page, "current_supplier_luce")).toHaveValue("enel-energia");
    await expect(field(page, "power_kw")).toHaveValue("3");
    await expect(page.getByTestId("activation-gas")).toHaveCount(0);
    await fillAddress(page);
    await field(page, "pod").fill("it001e123456789"); // 15 chars, lower case
    await field(page, "pod").blur();
    await expect(field(page, "pod")).toHaveValue(POD);
    await field(page, "power_kw").selectOption("4.5");
    await radio(page, "voltage-220").click();
    await expect(radio(page, "voltage-220")).toHaveAttribute("aria-checked", "true");
    await expectNoOverflow(page);
    await shot(page, testInfo.project.name, "b-filled");

    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);

    expect(mock.requests).toHaveLength(1);
    const body = mock.requests[0] as { data: Json };
    expect(Object.keys(body)).toEqual(["data"]);
    expect(body.data).toMatchObject({
      first_name: "Mario",
      last_name: "Rossi",
      phone: "333 123 4567",
      tax_code: CF_MARIO_ROSSI,
      housing_title: "proprietario",
      cap: "20122",
      address: "Via Roma",
      street_number: "12/A",
      is_resident: true,
      pod: POD,
      power_kw: 4.5,
      voltage: 220,
      current_supplier_luce: "enel-energia",
      chosen_offer_luce: luceOffer.offer_id,
      comune_istat: "015146",
      service_type: "cambio_fornitore",
    });
    expect(body.data).not.toHaveProperty("vat_number");
    expect(body.data).not.toHaveProperty("pdr");
    expect(body.data).not.toHaveProperty("email");

    // Contract with /grazie: leadCompleted is set before navigating (the thank-you page
    // redirects to "/" otherwise) and the names + chosen offers stay in the flow state.
    await expect(page.getByRole("heading", { name: /Grazie, Mario/ })).toBeVisible();
    await expect(page).toHaveURL(/\/grazie$/);
  });

  test("business dual with P.IVA: both sections, both offers in the summary", async ({ page }, testInfo) => {
    const mock = await mockComplete(page);
    await open(page, businessDual());

    await expect(field(page, "company_name")).toHaveValue("Bianchi Srl");
    await expect(page.getByTestId("summary-total")).toHaveText(/^90,10\s€$/);
    await expect(page.getByTestId("summary-monthly-luce")).toContainText("50,00");
    await expect(page.getByTestId("summary-monthly-gas")).toContainText("40,10");
    await fillStepA(page, { cf: CF_GIULIA_BIANCHI, piva: PIVA, housing: "inquilino" });
    await page.getByTestId("activation-next").click();

    await expect(page.getByTestId("activation-luce")).toBeVisible();
    await expect(page.getByTestId("activation-gas")).toBeVisible();
    await expect(field(page, "current_supplier_gas")).toHaveValue("iren");
    await expect(page.getByTestId("gas-use-cucina").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    await fillAddress(page);
    await field(page, "pod").fill(POD);
    await field(page, "power_kw").selectOption("altro");
    await radio(page, "voltage-380").click();
    await field(page, "pdr").fill("1234 5678 9012 34");
    await field(page, "pdr").blur();
    await expect(field(page, "pdr")).toHaveValue(PDR);
    await page.getByTestId("gas-use-riscaldamento").getByRole("checkbox").click();
    await expectNoOverflow(page);
    await shot(page, testInfo.project.name, "b-dual");

    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);

    const data = (mock.requests[0] as { data: Json }).data;
    expect(data).toMatchObject({
      customer_type: "business",
      commodity: "dual",
      company_name: "Bianchi Srl",
      vat_number: PIVA,
      tax_code: CF_GIULIA_BIANCHI,
      housing_title: "inquilino",
      pod: POD,
      power_kw: null,
      voltage: 380,
      pdr: PDR,
      gas_uses: ["cucina", "riscaldamento"],
      current_supplier_gas: "iren",
      chosen_offer_luce: luceOffer.offer_id,
      chosen_offer_gas: gasOffer.offer_id,
    });
  });

  test("primo allaccio: POD/PDR optional, current supplier hidden", async ({ page }) => {
    const mock = await mockComplete(page);
    await open(
      page,
      businessDual({
        firstName: "Mario",
        lastName: "Rossi",
        customerType: "casa",
        companyName: "",
        serviceType: "primo_allaccio",
        currentSupplierLuce: null,
        currentSupplierGas: null,
      }),
    );
    await fillStepA(page);
    await page.getByTestId("activation-next").click();

    await expect(field(page, "current_supplier_luce")).toHaveCount(0);
    await expect(field(page, "current_supplier_gas")).toHaveCount(0);
    await expect(page.getByText(/^Codice (POD|PDR) \(facoltativo\)/)).toHaveCount(2);
    await fillAddress(page);
    await radio(page, "voltage-220").click();
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);

    const data = (mock.requests[0] as { data: Json }).data;
    expect(data).toMatchObject({ service_type: "primo_allaccio", voltage: 220, power_kw: 3 });
    expect(data).not.toHaveProperty("pod");
    expect(data).not.toHaveProperty("pdr");
    expect(data).not.toHaveProperty("current_supplier_luce");
    expect(data).not.toHaveProperty("current_supplier_gas");
  });

  test("subentro hides the current supplier but still requires POD", async ({ page }) => {
    await mockComplete(page);
    await open(page, casaLuce({ serviceType: "subentro", currentSupplierLuce: null }));
    await fillStepA(page);
    await page.getByTestId("activation-next").click();
    await expect(field(page, "current_supplier_luce")).toHaveCount(0);
    await fillAddress(page);
    await radio(page, "voltage-220").click();
    await page.getByTestId("activation-submit").click();
    await expect(page.locator("#" + (await field(page, "pod").getAttribute("id")) + "-error")).toHaveText(
      "Inserisci il codice POD.",
    );
  });

  test("hasGas = false on a gas-only flow behaves like primo allaccio for gas", async ({ page }) => {
    await mockComplete(page);
    await open(
      page,
      casaLuce({
        commodity: "gas",
        hasGas: false,
        gasUses: ["cucina"],
        currentSupplierLuce: null,
        currentSupplierGas: null,
        chosenOffers: { luce: null, gas: gasOffer },
      }),
    );
    await fillStepA(page);
    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-luce")).toHaveCount(0);
    await expect(field(page, "current_supplier_gas")).toHaveCount(0);
    await fillAddress(page);
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
  });

  test("step A validation: required fields, CF format, CF mismatch, P.IVA", async ({ page }) => {
    await open(page, businessDual({ firstName: "", phone: "" }));
    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(page.getByText("Inserisci il nome.")).toBeVisible();
    await expect(page.getByText("Inserisci il numero di cellulare.")).toBeVisible();
    await expect(page.getByText("Inserisci il codice fiscale.")).toBeVisible();
    await expect(page.getByText("Inserisci la partita IVA.")).toBeVisible();
    await expect(page.getByText("Seleziona una risposta.")).toBeVisible();

    await field(page, "first_name").fill("Giulia");
    await field(page, "phone").fill("12345");
    await expect(page.getByText("Inserisci un numero di cellulare italiano valido", { exact: false })).toBeVisible();
    await field(page, "phone").fill("333 123 4567");

    await field(page, "tax_code").fill("ABC123");
    await expect(page.getByText("Il codice fiscale deve essere di 16 caratteri.")).toBeVisible();
    await field(page, "tax_code").fill("BNCGLI90A41F205X");
    await expect(page.getByText("Il codice fiscale non è valido", { exact: false })).toBeVisible();
    // Valid CF of another person: surname does not match.
    await field(page, "tax_code").fill(CF_MARIO_ROSSI);
    await expect(page.getByText("Il codice fiscale non corrisponde al cognome inserito.")).toBeVisible();
    await field(page, "tax_code").fill(CF_GIULIA_BIANCHI);
    await expect(page.getByText("Il codice fiscale non corrisponde", { exact: false })).toHaveCount(0);
    // Name change makes it inconsistent again.
    await field(page, "first_name").fill("Luca");
    await expect(page.getByText("Il codice fiscale non corrisponde al nome inserito.")).toBeVisible();
    await field(page, "first_name").fill("Giulia");

    await field(page, "vat_number").fill("12345678900");
    await expect(page.getByText("La partita IVA non è valida", { exact: false })).toBeVisible();
    await field(page, "vat_number").fill("1234");
    await expect(page.getByText("La partita IVA deve essere di 11 cifre.")).toBeVisible();

    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await field(page, "vat_number").fill(PIVA);
    await radio(page, "housing_title-altro").click();
    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-step-b")).toBeVisible();
  });

  test("step B validation: address, POD, PDR and missing choices", async ({ page }) => {
    const mock = await mockComplete(page);
    await open(page, businessDual());
    await fillStepA(page, { cf: CF_GIULIA_BIANCHI, piva: PIVA });
    await page.getByTestId("activation-next").click();

    await page.getByTestId("activation-submit").click();
    for (const msg of [
      "Seleziona il CAP.",
      "Inserisci l'indirizzo.",
      "Inserisci il numero civico.",
      "Inserisci il codice POD.",
      "Seleziona il livello di tensione.",
      "Inserisci il codice PDR.",
    ]) {
      await expect(page.getByText(msg)).toBeVisible();
    }
    await expect(page.getByText("Seleziona una risposta.")).toBeVisible(); // is_resident

    await field(page, "pod").fill("XX001E12345678");
    await expect(page.getByText("Il POD deve iniziare con IT.")).toBeVisible();
    await field(page, "pod").fill("IT001");
    await expect(page.getByText("Il POD deve essere di 14 caratteri.")).toBeVisible();
    await field(page, "pdr").fill("123");
    await expect(page.getByText("Il PDR deve essere di 14 cifre.")).toBeVisible();
    await field(page, "pdr").fill("1234567890123A");
    await expect(page.getByText("Il PDR deve contenere solo cifre.")).toBeVisible();

    await page.getByTestId("gas-use-cucina").getByRole("checkbox").click(); // deselect the only use
    await expect(page.getByText("Seleziona almeno un uso del gas.")).toBeVisible();
    expect(mock.requests).toHaveLength(0); // nothing is sent while invalid
  });

  test("back buttons keep the data", async ({ page }) => {
    await mockComplete(page);
    await open(page, casaLuce());
    await fillStepA(page, { housing: "usufruttuario" });
    await field(page, "last_name").fill("Rossi Verdi");
    await field(page, "last_name").fill("Rossi");
    await page.getByTestId("activation-next").click();
    await fillAddress(page);
    await field(page, "pod").fill(POD);

    await page.getByTestId("activation-back").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(field(page, "tax_code")).toHaveValue(CF_MARIO_ROSSI);
    await expect(radio(page, "housing_title-usufruttuario")).toHaveAttribute("aria-checked", "true");

    await page.getByTestId("activation-next").click();
    await expect(field(page, "address")).toHaveValue("Via Roma");
    await expect(field(page, "pod")).toHaveValue(POD);
    await expect(field(page, "cap")).toHaveValue("20122");

    // Back from step B then from step A leaves the flow state intact.
    await page.getByTestId("activation-back").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await page.getByTestId("activation-back").click();
    await expect(page).toHaveURL(/\/offerte/);
    const flow = await storedFlow(page);
    expect((flow.activation as Json).taxCode).toBe(CF_MARIO_ROSSI);
    expect((flow.chosenOffers as { luce: Json }).luce.offer_id).toBe(luceOffer.offer_id);
  });

  test("refresh keeps the current step and the typed data", async ({ page }) => {
    await open(page, casaLuce());
    await fillStepA(page);
    await page.getByTestId("activation-next").click();
    await fillAddress(page);
    await field(page, "pod").fill("IT001E1234");
    await page.reload();

    await expect(page.getByTestId("activation-step-b")).toBeVisible();
    await expect(field(page, "address")).toHaveValue("Via Roma");
    await expect(field(page, "street_number")).toHaveValue("12/A");
    await expect(field(page, "pod")).toHaveValue("IT001E1234");
    await expect(radio(page, "is_resident-yes")).toHaveAttribute("aria-checked", "true");
    expect(await page.evaluate((k) => sessionStorage.getItem(k), STEP_KEY)).toBe("B");

    await page.getByTestId("activation-back").click();
    await page.reload();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(field(page, "tax_code")).toHaveValue(CF_MARIO_ROSSI);
  });

  test("server 422 field codes are shown inline (and step A errors go back to step A)", async ({ page }) => {
    const mock = await mockComplete(page, (n) =>
      n === 1
        ? { status: 422, body: { ok: false, error: "validation", fields: { pod: "prefix", street_number: "invalid" } } }
        : n === 2
          ? { status: 422, body: { ok: false, error: "validation", fields: { tax_code: "surname_mismatch" } } }
          : { status: 200, body: { ok: true } },
    );
    await open(page, casaLuce());
    await fillStepA(page);
    await page.getByTestId("activation-next").click();
    await fillAddress(page);
    await field(page, "pod").fill(POD);
    await radio(page, "voltage-220").click();

    await page.getByTestId("activation-submit").click();
    await expect(page.getByText("Il POD deve iniziare con IT.")).toBeVisible();
    await expect(page.getByText("Valore non valido.")).toBeVisible();
    // Editing a field drops its server error.
    await field(page, "pod").fill(POD + "1");
    await expect(page.getByText("Il POD deve iniziare con IT.")).toHaveCount(0);

    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(page.getByText("Il codice fiscale non corrisponde al cognome inserito.")).toBeVisible();
    expect(mock.requests).toHaveLength(2);

    await field(page, "tax_code").fill(CF_MARIO_ROSSI);
    await page.getByTestId("activation-next").click();
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
    // Every attempt sends the same { data } contract.
    expect(mock.requests).toHaveLength(3);
    for (const r of mock.requests) expect(Object.keys(r as Json)).toEqual(["data"]);
  });

  test("chosen offer no longer available is reported at form level", async ({ page }) => {
    await mockComplete(page, () => ({
      status: 422,
      body: { ok: false, error: "validation", fields: { chosen_offer_luce: "not_available" } },
    }));
    await open(page, casaLuce());
    await fillStepA(page);
    await page.getByTestId("activation-next").click();
    await fillAddress(page);
    await field(page, "pod").fill(POD);
    await radio(page, "voltage-220").click();
    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("activation-general-error")).toContainText("non è più disponibile");
    await expect(page.getByRole("link", { name: "Torna alle offerte" })).toBeVisible();
  });

  test("429 and network errors show a message and re-enable the button", async ({ page }) => {
    await mockComplete(page, (n) =>
      n === 1
        ? { status: 429, body: { ok: false, error: "rate_limited" }, headers: { "Retry-After": "300" } }
        : { status: 500, body: { ok: false, error: "server_error" } },
    );
    await open(page, casaLuce());
    await fillStepA(page);
    await page.getByTestId("activation-next").click();
    await fillAddress(page);
    await field(page, "pod").fill(POD);
    await radio(page, "voltage-220").click();

    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("activation-error")).toContainText("Hai effettuato troppi tentativi");
    await expect(page.getByTestId("activation-submit")).toBeEnabled();
    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("activation-error")).toContainText("Si è verificato un problema");
    expect((await storedFlow(page)).leadCompleted).toBeFalsy();
  });

  test("submit button shows a loading state while the request is pending", async ({ page }) => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/api/lead/complete", async (route) => {
      await gate;
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await open(page, casaLuce());
    await fillStepA(page);
    await page.getByTestId("activation-next").click();
    await fillAddress(page);
    await field(page, "pod").fill(POD);
    await radio(page, "voltage-220").click();
    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("activation-submit")).toBeDisabled();
    await expect(page.getByTestId("activation-submit")).toHaveAttribute("aria-busy", "true");
    release();
    await expect(page).toHaveURL(/\/grazie$/);
  });

  test("redirects: no Page 1 data -> /, no chosen offer -> /offerte", async ({ page }) => {
    await open(page, null);
    await expect(page).toHaveURL(/\/$/);
  });

  test("redirect to /offerte when no offer is chosen", async ({ page }) => {
    await open(page, casaLuce({ chosenOffers: { luce: null, gas: null } }));
    await expect(page).toHaveURL(/\/offerte/);
  });

  test("every option card in steps A and B has a decorative icon", async ({ page }) => {
    await open(page, businessDual());
    const expectIcons = async (ids: string[]) => {
      for (const id of ids) {
        const card = page.getByTestId(id).locator('[role="radio"], [role="checkbox"]');
        // Icon wrapper is aria-hidden and holds an svg; the label stays plain text.
        await expect(card.locator('span[aria-hidden="true"] svg').first()).toBeVisible();
      }
    };
    await expectIcons(["proprietario", "inquilino", "usufruttuario", "altro"].map((v) => `housing_title-${v}`));
    await fillStepA(page, { cf: CF_GIULIA_BIANCHI, piva: PIVA });
    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-step-b")).toBeVisible();
    await expectIcons(["is_resident-yes", "is_resident-no", "voltage-220", "voltage-380"]);
    await expectIcons(["cucina", "riscaldamento", "acqua_calda"].map((u) => `gas-use-${u}`));
    await expectNoOverflow(page);
  });

  test("summary details and no forbidden wording", async ({ page }, testInfo) => {
    await open(page, businessDual());
    if (testInfo.project.name === "mobile") {
      await expect(page.getByTestId("summary-details")).toBeHidden();
      await page.getByTestId("summary-toggle").click();
    }
    await expect(page.getByTestId("summary-details")).toBeVisible();
    const luce = page.getByTestId("summary-offer-luce");
    await expect(luce).toContainText("Edison Luce Fissa 12");
    await expect(page.getByTestId("summary-activation-luce")).toHaveText(/^0,00\s€$/);
    await expect(luce).toContainText("Cambio contatore");
    await expect(page.getByTestId("summary-locked-luce")).toHaveText("12 mesi");
    await expect(page.getByTestId("summary-price-luce")).toHaveText(/^0,1290\s€\/kWh$/);
    await expect(page.getByTestId("summary-fixed-luce")).toHaveText(/^9,00\s€$/);
    await expect(page.getByTestId("summary-locked-gas")).toHaveText("24 mesi");
    await expect(page.getByTestId("summary-price-gas")).toHaveText(/^0,4500\s€\/Smc$/);

    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const word of ["demo", "chiam", "richiamat", "call", "club", "e-mail", "email"]) {
      expect(text, `forbidden wording "${word}"`).not.toContain(word);
    }
    await shot(page, testInfo.project.name, "summary");

    if (testInfo.project.name === "desktop") {
      // Sticky summary stays in view while the (long) step B scrolls.
      await fillStepA(page, { cf: CF_GIULIA_BIANCHI, piva: PIVA });
      await page.getByTestId("activation-next").click();
      await expect(page.getByTestId("activation-step-b")).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const box = await page.getByTestId("activation-summary").boundingBox();
      expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
      expect(box?.y ?? 9999).toBeLessThan(60);
    }
  });
});
