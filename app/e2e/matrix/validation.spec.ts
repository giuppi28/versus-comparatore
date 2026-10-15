/**
 * T7.2 — validation paths on the REAL flow (real lead API, mock repository):
 * every required field empty on Page 1 and on the activation steps A/B, invalid codice fiscale /
 * CF not matching the name / invalid P.IVA, POD, PDR and phone numbers, server-side re-validation,
 * back buttons keeping the data and a refresh in the middle of every step.
 */
import { completeData } from "../../src/lib/lead/test-fixtures";
import { MATRIX, makeCodiceFiscale, type MatrixCase } from "./cases";
import { card, chooseComune, field, openPage1, pick, radio, reachActivation } from "./flow";
import { expect, randomIp, test } from "./fixtures";
import { waitForLead } from "./lead-reader";
import { request, type Page } from "@playwright/test";

const TAG = { tag: "@mobile" };

// ---------------------------------------------------------------------------
// Page 1: build a valid form field by field, leaving one required field out.

type Key =
  | "commodity"
  | "customerType"
  | "firstName"
  | "lastName"
  | "phone"
  | "company"
  | "comune"
  | "privacy"
  | "service"
  | "supplierLuce"
  | "supplierGas"
  | "people"
  | "hasGas"
  | "gasUses"
  | "sqm"
  | "manualKwh"
  | "manualSmc";

type Kind = "casa" | "business";

/** All the actions, so a test can run each one either up front or later as the "fix". */
function actions(page: Page, kind: Kind): Record<Key, () => Promise<void>> {
  return {
    commodity: () => pick(page, "commodity-dual"),
    customerType: () => pick(page, kind === "casa" ? "customer-casa" : "customer-business"),
    firstName: () => page.getByTestId("first-name").fill("Mario"),
    lastName: () => page.getByTestId("last-name").fill("Rossi"),
    phone: () => page.getByTestId("phone").fill("333 123 4567"),
    company: () => page.getByTestId("company-name").fill("Rossi Impianti S.r.l."),
    comune: () => chooseComune(page, "Milano"),
    privacy: async () => {
      await page.getByTestId("privacy-consent").check();
    },
    service: () => pick(page, "service-cambio"),
    supplierLuce: async () => {
      await page.getByTestId("supplier-luce").selectOption("enel-energia");
    },
    supplierGas: async () => {
      await page.getByTestId("supplier-gas").selectOption("hera-comm");
    },
    people: () => pick(page, "people-3"),
    hasGas: () => pick(page, "has-gas-yes"),
    gasUses: () => pick(page, "gas-use-riscaldamento"),
    sqm: () => pick(page, "sqm-60_90"),
    manualKwh: () => page.getByTestId("manual-kwh").fill("4200"),
    manualSmc: () => page.getByTestId("manual-smc").fill("1300"),
  };
}

const ORDER: Record<Kind, Key[]> = {
  casa: ["commodity", "customerType", "service", "supplierLuce", "supplierGas", "people", "hasGas", "gasUses", "sqm", "firstName", "lastName", "phone", "comune", "privacy"],
  business: ["commodity", "customerType", "service", "supplierLuce", "supplierGas", "company", "firstName", "lastName", "phone", "comune", "manualKwh", "manualSmc", "privacy"],
};

/**
 * Fills a valid form except `skip`. Returns the actions that could not run because the field they
 * depend on was skipped (they are needed later to make the form valid again).
 */
async function fillAllBut(page: Page, kind: Kind, skip: Key): Promise<Key[]> {
  await openPage1(page);
  const act = actions(page, kind);
  const deferred: Key[] = [skip];
  for (const key of ORDER[kind]) {
    if (key === skip) continue;
    // A supplier select only exists once the commodity and the service are chosen.
    const needsCommodityAndService = key === "supplierLuce" || key === "supplierGas";
    const needsConsumption = ["people", "hasGas", "gasUses", "sqm", "manualKwh", "manualSmc"].includes(key);
    const dependencyMissing =
      (needsCommodityAndService && (skip === "commodity" || skip === "service")) ||
      (needsConsumption && (skip === "commodity" || skip === "customerType")) ||
      (key === "sqm" && skip === "gasUses");
    if (dependencyMissing) {
      deferred.push(key);
      continue;
    }
    await act[key]();
  }
  return deferred;
}

interface Missing {
  key: Key;
  kind: Kind;
  message: string;
  /** data-testid of the error element when the field has one (otherwise the message is searched by text). */
  errorTestId?: string;
}

const MISSING: Missing[] = [
  { key: "commodity", kind: "casa", message: "Scegli cosa vuoi confrontare.", errorTestId: "error-commodity" },
  { key: "customerType", kind: "casa", message: "Indica se la fornitura è per la casa o per una Partita IVA.", errorTestId: "error-customerType" },
  { key: "firstName", kind: "casa", message: "Inserisci il tuo nome." },
  { key: "lastName", kind: "casa", message: "Inserisci il tuo cognome." },
  { key: "phone", kind: "casa", message: "Inserisci il numero di cellulare." },
  { key: "comune", kind: "casa", message: "Cerca e seleziona il tuo comune dall'elenco." },
  { key: "privacy", kind: "casa", message: "Per proseguire devi accettare l'informativa sulla privacy.", errorTestId: "error-privacy" },
  // No "service" entry: Cambio fornitore is preselected, so the service can never be missing (see the
  // "service is preselected" test below).
  { key: "supplierLuce", kind: "casa", message: "Seleziona il fornitore attuale." },
  { key: "supplierGas", kind: "casa", message: "Seleziona il fornitore attuale." },
  { key: "people", kind: "casa", message: "Indica quante persone vivono in casa.", errorTestId: "error-people" },
  { key: "hasGas", kind: "casa", message: "Indica se hai già il gas a casa.", errorTestId: "error-hasGas" },
  { key: "gasUses", kind: "casa", message: "Seleziona almeno un utilizzo del gas.", errorTestId: "error-gasUses" },
  { key: "sqm", kind: "casa", message: "Indica la superficie della casa da riscaldare.", errorTestId: "error-sqmRange" },
  { key: "company", kind: "business", message: "Inserisci la ragione sociale." },
  { key: "manualKwh", kind: "business", message: "Inserisci il consumo annuo di energia elettrica (kWh)." },
  { key: "manualSmc", kind: "business", message: "Inserisci il consumo annuo di gas (Smc)." },
];

test.describe("Page 1: every required field", () => {
  for (const m of MISSING) {
    test(`missing ${m.key} (${m.kind}) is reported inline, nothing is saved, then the fix lets the form through`, TAG, async ({ page }) => {
      let patches = 0;
      page.on("request", (r) => {
        if (r.url().endsWith("/api/lead") && r.method() === "PATCH") patches += 1;
      });
      const toFix = await fillAllBut(page, m.kind, m.key);
      await page.getByTestId("submit").click();

      const error = m.errorTestId ? page.getByTestId(m.errorTestId) : page.getByText(m.message, { exact: true });
      await expect(error).toBeVisible();
      await expect(error).toContainText(m.message);
      await expect(page).toHaveURL(/\/$/);
      expect(patches, "no lead update while the form is invalid").toBe(0);
      // Only that one problem is reported (fields with an error test id).
      if (m.errorTestId) await expect(page.locator('[data-testid^="error-"]')).toHaveCount(1);

      // Fix it: the error clears and the form goes through.
      const act = actions(page, m.kind);
      for (const key of toFix) {
        if (key === "sqm" && toFix.includes("gasUses")) continue;
        if (key === "gasUses") await pick(page, "gas-use-cucina"); // no m2 question for this one
        else await act[key]();
      }
      await expect(error).toHaveCount(0);
      await page.getByTestId("submit").click();
      await expect(page).toHaveURL(/\/offerte$/);
      expect(patches).toBeGreaterThanOrEqual(1);
    });
  }

  test("a completely empty form lists every missing section and focuses the first", TAG, async ({ page }) => {
    await openPage1(page);
    await page.getByTestId("submit").click();
    for (const id of ["error-commodity", "error-customerType", "error-privacy"]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    // The service is preselected, so there is no service error.
    await expect(page.getByTestId("error-serviceType")).toHaveCount(0);
    await expect(page.getByTestId("service-cambio")).toHaveAttribute("data-selected", "true");
    for (const text of ["Inserisci il tuo nome.", "Inserisci il tuo cognome.", "Inserisci il numero di cellulare.", "Cerca e seleziona il tuo comune dall'elenco."]) {
      await expect(page.getByText(text)).toBeVisible();
    }
    await expect(card(page, "commodity-luce")).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
  });

  test("Casa + Luce + Gas with the consumption block incomplete lists the household questions", TAG, async ({ page }) => {
    await openPage1(page);
    await pick(page, "commodity-dual", "customer-casa", "service-subentro");
    await page.getByTestId("submit").click();
    for (const id of ["error-people", "error-hasGas", "error-gasUses"]) await expect(page.getByTestId(id)).toBeVisible();
    // Manual consumption removes the household questions but keeps the gas ones.
    await page.getByTestId("manual-toggle").check();
    await expect(page.getByTestId("error-people")).toHaveCount(0);
    await page.getByTestId("submit").click();
    await expect(page.getByText("Inserisci il consumo annuo di energia elettrica (kWh).")).toBeVisible();
    await expect(page.getByText("Inserisci il consumo annuo di gas (Smc).")).toBeVisible();
    await expect(page.getByTestId("error-gasUses")).toBeVisible();
  });
});

test.describe("Page 1: invalid values", () => {
  const BAD_PHONES = ["12345", "212345678", "3331234", "abcdefghij", "+39 333 12345678901", "333 123 456 78901"];
  const GOOD_PHONES = ["+39 333 123 4567", "0039 333 1234567", "333-123-4567", "(333) 1234567", "3331234567", "340 1234567"];

  test("invalid mobile numbers are refused, every accepted notation is normalised", TAG, async ({ page }) => {
    await openPage1(page);
    for (const bad of BAD_PHONES) {
      await page.getByTestId("phone").fill(bad);
      await page.getByTestId("submit").click();
      await expect(page.getByText("Inserisci un numero di cellulare italiano valido (es. 333 123 4567).", { exact: true }), `phone "${bad}"`).toBeVisible();
    }
    for (const good of GOOD_PHONES) {
      await page.getByTestId("phone").fill(good);
      await expect(page.getByText(/numero di cellulare italiano valido/), `phone "${good}"`).toHaveCount(0);
    }
    // an unknown comune text is not accepted (must be chosen from the list)
    await page.locator("#p1-comune").fill("Cittàinesistente");
    await expect(page.getByText("Nessun comune trovato")).toBeVisible();
    await page.getByTestId("submit").click();
    await expect(page.getByText("Cerca e seleziona il tuo comune dall'elenco.")).toBeVisible();
  });

  test("Partita IVA manual consumption: zero, absurdly large and non numeric values", TAG, async ({ page }) => {
    await openPage1(page);
    await pick(page, "commodity-dual", "customer-business", "service-subentro");
    for (const bad of ["0", "10000001", "000"]) {
      await page.getByTestId("manual-kwh").fill(bad);
      await page.getByTestId("manual-smc").fill(bad);
      await page.getByTestId("submit").click();
      await expect(page.getByText("Inserisci un valore maggiore di zero.")).toHaveCount(2);
    }
    // non numeric characters are stripped; "1.200" and "1 200" both mean 1200
    await page.getByTestId("manual-kwh").fill("abc");
    await expect(page.getByTestId("manual-kwh")).toHaveValue("");
    await page.getByTestId("manual-kwh").fill("1.200");
    await expect(page.getByTestId("manual-kwh")).toHaveValue("1200");
    await page.getByTestId("manual-smc").fill("2 500");
    await expect(page.getByTestId("manual-smc")).toHaveValue("2500");
  });
});

// ---------------------------------------------------------------------------
// Activation form A / B on a real session

const CASA_DUAL: MatrixCase = {
  ...(MATRIX.find((c) => c.commodity === "dual" && c.customer === "casa" && c.service === "cambio_fornitore" && c.hasGas === true && !c.manual && c.zone === "E")!),
};
const BUSINESS_DUAL: MatrixCase = MATRIX.find((c) => c.commodity === "dual" && c.customer === "business" && c.service === "cambio_fornitore")!;
const BUSINESS_LUCE: MatrixCase = MATRIX.find((c) => c.commodity === "luce" && c.customer === "business" && c.service === "primo_allaccio")!;

const POD = "IT001E12345678";
const PDR = "12345678901234";

test.describe("activation step A", () => {
  test("empty required fields and prefilled fields that get cleared", TAG, async ({ page }) => {
    await reachActivation(page, BUSINESS_DUAL);
    const next = page.getByTestId("activation-next");
    await next.click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(page.getByText("Inserisci il codice fiscale.")).toBeVisible();
    await expect(page.getByText("Inserisci la partita IVA.")).toBeVisible();
    await expect(page.getByText("Seleziona una risposta.")).toBeVisible();

    for (const [name, message] of [
      ["first_name", "Inserisci il nome."],
      ["last_name", "Inserisci il cognome."],
      ["phone", "Inserisci il numero di cellulare."],
      ["company_name", "Inserisci la ragione sociale."],
    ] as const) {
      await field(page, name).fill("");
      await next.click();
      await expect(page.getByText(message), name).toBeVisible();
    }
    await expect(page.getByTestId("activation-step-b")).toHaveCount(0);
  });

  test("invalid codice fiscale: length, format, check character, wrong surname, wrong name", TAG, async ({ page }) => {
    await reachActivation(page, CASA_DUAL);
    const { first, last, cf } = CASA_DUAL.person;
    const tax = field(page, "tax_code");
    const cases: Array<[string, string]> = [
      ["ABC123", "Il codice fiscale deve essere di 16 caratteri."],
      ["1234567890123456", "Il codice fiscale non è in un formato valido."],
      [`${cf.slice(0, 15)}${cf[15] === "A" ? "B" : "A"}`, "Il codice fiscale non è valido: controlla di averlo scritto correttamente."],
      [makeCodiceFiscale(first, "Verdi", 5), "Il codice fiscale non corrisponde al cognome inserito."],
      [makeCodiceFiscale("Paolo", last, 6), "Il codice fiscale non corrisponde al nome inserito."],
    ];
    for (const [value, message] of cases) {
      await tax.fill(value);
      await tax.blur();
      await expect(page.getByText(message, { exact: true }), `CF ${value}`).toBeVisible();
    }
    // The name used for the check is the one in the form: editing it re-validates the CF.
    await tax.fill(cf.toLowerCase());
    await expect(page.getByText(/Il codice fiscale/)).toHaveCount(0);
    await field(page, "first_name").fill("Paolo");
    await expect(page.getByText("Il codice fiscale non corrisponde al nome inserito.")).toBeVisible();
    await field(page, "first_name").fill(first);
    await expect(page.getByText(/Il codice fiscale/)).toHaveCount(0);

    // And nothing moves forward with an invalid CF.
    await tax.fill("ABC123");
    await radio(page, "housing_title-altro").click();
    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-step-b")).toHaveCount(0);
  });

  test("invalid P.IVA and phone", TAG, async ({ page }) => {
    await reachActivation(page, BUSINESS_LUCE);
    const vat = field(page, "vat_number");
    for (const [value, message] of [
      ["abcdefghijk", "La partita IVA deve contenere solo cifre."],
      ["1234", "La partita IVA deve essere di 11 cifre."],
      ["12345678900", "La partita IVA non è valida: controlla di averla scritta correttamente."],
      ["00000000000", "La partita IVA non è valida: controlla di averla scritta correttamente."],
    ] as const) {
      await vat.fill(value);
      await vat.blur();
      await expect(page.getByText(message), `P.IVA ${value}`).toBeVisible();
    }
    await vat.fill(BUSINESS_LUCE.vat!);
    await expect(page.getByText(/^La partita IVA /)).toHaveCount(0);

    const phone = field(page, "phone");
    for (const bad of ["12345", "212345678", "abc"]) {
      await phone.fill(bad);
      await phone.blur();
      await expect(page.getByText("Inserisci un numero di cellulare italiano valido (es. 333 123 4567).")).toBeVisible();
    }
    await phone.fill("333 123 4567");
    await expect(page.getByText(/numero di cellulare italiano valido/)).toHaveCount(0);
  });
});

test.describe("activation step B", () => {
  async function toStepB(page: Page, c: MatrixCase) {
    const ctx = await reachActivation(page, c);
    if (c.customer === "business") await field(page, "vat_number").fill(c.vat!);
    await field(page, "tax_code").fill(c.person.cf);
    await radio(page, "housing_title-proprietario").click();
    await page.getByTestId("activation-next").click();
    await expect(page.getByTestId("activation-step-b")).toBeVisible();
    return ctx;
  }

  test("every required field of a Luce + Gas supply is reported, nothing is sent", TAG, async ({ page }) => {
    let completes = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/lead/complete")) completes += 1;
    });
    await toStepB(page, CASA_DUAL);
    await page.getByTestId("activation-submit").click();
    for (const message of [
      "Seleziona il CAP.",
      "Inserisci l'indirizzo.",
      "Inserisci il numero civico.",
      "Seleziona una risposta.",
      "Inserisci il codice POD.",
      "Seleziona il livello di tensione.",
      "Inserisci il codice PDR.",
    ]) {
      await expect(page.getByText(message).first(), message).toBeVisible();
    }
    // The gas uses are prefilled from Page 1; unticking all of them is an error.
    for (const use of ["riscaldamento"] as const) {
      await page.getByTestId(`gas-use-${use}`).getByRole("checkbox").click();
    }
    await expect(page.getByText("Seleziona almeno un uso del gas.")).toBeVisible();
    expect(completes).toBe(0);
    await expect(page).toHaveURL(/\/attivazione$/);
  });

  test("invalid POD and PDR", TAG, async ({ page }) => {
    await toStepB(page, CASA_DUAL);
    const pod = field(page, "pod");
    for (const [value, message] of [
      ["XX001E12345678", "Il POD deve iniziare con IT."],
      ["IT001", "Il POD deve essere di 14 caratteri."],
      ["IT001E1234567890123", "Il POD deve essere di 14 caratteri."],
      ["IT001E1234567!", "Il POD può contenere solo lettere e numeri."],
    ] as const) {
      await pod.fill(value);
      await pod.blur();
      await expect(page.getByText(message, { exact: true }), `POD ${value}`).toBeVisible();
    }
    await pod.fill(POD);
    await expect(page.getByText(/Il POD/)).toHaveCount(0);

    const pdr = field(page, "pdr");
    for (const [value, message] of [
      ["123", "Il PDR deve essere di 14 cifre."],
      ["1234567890123A", "Il PDR deve contenere solo cifre."],
      ["123456789012345", "Il PDR deve essere di 14 cifre."],
    ] as const) {
      await pdr.fill(value);
      await pdr.blur();
      await expect(page.getByText(message, { exact: true }), `PDR ${value}`).toBeVisible();
    }
    await pdr.fill(PDR);
    await expect(page.getByText(/Il PDR/)).toHaveCount(0);
  });

  test("Primo allaccio: POD / PDR are optional, but a wrong one is still refused", TAG, async ({ page }) => {
    const primo = MATRIX.find((c) => c.commodity === "dual" && c.customer === "casa" && c.service === "primo_allaccio" && c.hasGas === true)!;
    await toStepB(page, primo);
    await expect(page.getByText("(facoltativo)")).toHaveCount(2);
    await field(page, "pod").fill("XX1");
    await field(page, "pod").blur();
    await expect(page.getByText(/Il POD/)).toBeVisible();
    await field(page, "pod").fill("");
    await expect(page.getByText(/Il POD/)).toHaveCount(0);
    await field(page, "pdr").fill("12");
    await field(page, "pdr").blur();
    await expect(page.getByText("Il PDR deve essere di 14 cifre.")).toBeVisible();
    await field(page, "pdr").fill("");
    await expect(page.getByText(/Il PDR/)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Server-side re-validation of the complete payload (the client checks can be bypassed)

test.describe("server-side validation of /api/lead/complete", () => {
  test("tampered submissions are rejected with field codes and the lead stays intact", async ({ page, baseURL, admin }) => {
    const { id } = await reachActivation(page, MATRIX.find((c) => c.commodity === "luce" && c.customer === "casa" && c.service === "cambio_fornitore" && !c.manual)!);
    const headers = { Origin: baseURL!, "Content-Type": "application/json" };
    // A fresh client IP per request: the complete route allows 10 attempts / 10 min / IP.
    const post = (data: Record<string, unknown>) =>
      page.request.post("/api/lead/complete", {
        headers: { ...headers, "x-forwarded-for": randomIp() },
        data: { data },
      });
    const base = completeData();

    const expectReject = async (patch: Record<string, unknown>, field: string, code: string | string[]) => {
      const res = await post({ ...base, ...patch });
      expect(res.status(), JSON.stringify(patch)).toBe(422);
      const body = await res.json();
      expect(body.error).toBe("validation");
      const codes = Array.isArray(code) ? code : [code];
      expect(codes, `${field} for ${JSON.stringify(patch)}: got ${body.fields?.[field]}`).toContain(body.fields?.[field]);
    };

    await expectReject({ tax_code: "BNCGLI90A41F205H" }, "tax_code", "surname_mismatch");
    await expectReject({ tax_code: "RSSMRA85T10A562X" }, "tax_code", "checksum");
    await expectReject({ tax_code: "RSS" }, "tax_code", "length");
    await expectReject({ pod: "XX001E12345678" }, "pod", "prefix");
    await expectReject({ pod: "IT00" }, "pod", "length");
    await expectReject({ phone: "12345" }, "phone", "format");
    await expectReject({ first_name: "" }, "first_name", ["required", "invalid"]);
    await expectReject({ housing_title: "boh" }, "housing_title", "invalid");
    await expectReject({ voltage: 110 }, "voltage", "invalid");
    await expectReject({ power_kw: 7 }, "power_kw", "invalid");
    await expectReject({ chosen_offer_luce: "offer-inesistente" }, "chosen_offer_luce", "not_available");
    await expectReject({ customer_type: "business", company_name: "Acme", vat_number: "12345678900" }, "vat_number", "checksum");
    await expectReject({ commodity: "gas", pdr: "123", chosen_offer_gas: "offer-plenitude-gas-fisso-12" }, "pdr", "length");
    await expectReject({ comune_istat: "999999" }, "comune_istat", "not_found");

    // Unknown fields (mass assignment) are refused; so is a request without the lead cookie.
    const unknown = await post({ ...base, status: "closed" });
    expect(unknown.status()).toBe(422);
    const anonymous = await request.newContext({ baseURL: baseURL! });
    const noCookie = await anonymous.post("/api/lead/complete", {
      headers: { ...headers, "x-forwarded-for": randomIp() },
      data: { data: base },
    });
    expect(noCookie.status()).toBe(401);
    await anonymous.dispose();

    // None of the rejected attempts completed the lead.
    const lead = await waitForLead(admin, id.phone, () => true);
    expect(lead.step).not.toBe("completed");
  });

  test("the UI shows the server error when the CF check is bypassed (tampered request)", async ({ page }) => {
    await reachActivation(page, CASA_DUAL);
    await field(page, "tax_code").fill(CASA_DUAL.person.cf);
    await radio(page, "housing_title-proprietario").click();
    await page.getByTestId("activation-next").click();
    await field(page, "address").fill("Via Roma");
    await field(page, "street_number").fill("1");
    await field(page, "cap").selectOption("20121");
    await radio(page, "is_resident-yes").click();
    await field(page, "pod").fill(POD);
    await radio(page, "voltage-220").click();
    await field(page, "pdr").fill(PDR);

    // Another person's (valid) codice fiscale slips through "the client".
    await page.route("**/api/lead/complete", async (route) => {
      const body = route.request().postDataJSON();
      body.data.tax_code = makeCodiceFiscale("Mario", "Verdi", 3);
      await route.continue({ postData: JSON.stringify(body) });
    });
    await page.getByTestId("activation-submit").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(page.getByText("Il codice fiscale non corrisponde al cognome inserito.")).toBeVisible();
    await expect(page).toHaveURL(/\/attivazione$/);
  });
});

// ---------------------------------------------------------------------------
// Back buttons keep the data; refresh in the middle of every step

test.describe("back buttons and refresh", () => {
  test("back buttons keep the data all the way to Page 1 (Luce + Gas, Casa)", TAG, async ({ page }) => {
    const c = CASA_DUAL;
    const { chosen } = await reachActivation(page, c);

    // Step A -> B -> back -> A keeps CF and housing; B keeps its data.
    await field(page, "tax_code").fill(c.person.cf);
    await radio(page, "housing_title-usufruttuario").click();
    await page.getByTestId("activation-next").click();
    await field(page, "address").fill("Via Verdi");
    await field(page, "street_number").fill("7");
    await field(page, "pod").fill(POD);
    await page.getByTestId("activation-back").click();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(field(page, "tax_code")).toHaveValue(c.person.cf);
    await expect(radio(page, "housing_title-usufruttuario")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("activation-next").click();
    await expect(field(page, "address")).toHaveValue("Via Verdi");
    await expect(field(page, "street_number")).toHaveValue("7");
    await expect(field(page, "pod")).toHaveValue(POD);

    // Back from step B then from step A leaves the activation form for the results.
    await page.getByTestId("activation-back").click();
    await page.getByTestId("activation-back").click();
    await page.waitForURL(/\/offerte/);
    // The results come back without a new loading animation; they restart from the Luce step with
    // the earlier choice highlighted, and the Gas choice is kept too.
    await expect(page.getByTestId("offer-card").first()).toBeVisible();
    await expect(page.getByTestId("loading-screen")).toHaveCount(0);
    await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "luce");
    await expect(page.locator(`[data-offer-id="${chosen.luce!.offer.id}"]`)).toHaveAttribute("data-chosen", "true");
    await page.locator(`[data-offer-id="${chosen.luce!.offer.id}"]`).getByTestId("offer-cta").click();
    await page.getByTestId("offer-modal-cta").click();
    await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "gas");
    await expect(page.locator(`[data-offer-id="${chosen.gas!.offer.id}"]`)).toHaveAttribute("data-chosen", "true");
    await page.getByTestId("dual-back").click();
    await expect(page.locator(`[data-offer-id="${chosen.luce!.offer.id}"]`)).toHaveAttribute("data-chosen", "true");

    // Browser back to Page 1: every answer is still there.
    const creations: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith("/api/lead") && r.method() === "POST") creations.push(r.url());
    });
    for (let i = 0; i < 8 && new URL(page.url()).pathname !== "/"; i++) await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
    await expect(page.getByTestId("commodity-dual")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("customer-casa")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("service-cambio")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("first-name")).toHaveValue(c.person.first);
    await expect(page.getByTestId("last-name")).toHaveValue(c.person.last);
    await expect(page.locator("#p1-comune")).toHaveValue(c.comune);
    await expect(page.getByTestId("privacy-consent")).toBeChecked();
    await expect(page.getByTestId("supplier-luce")).toHaveValue(c.supplierLuce!);
    await expect(page.getByTestId("supplier-gas")).toHaveValue(c.supplierGas!);
    await expect(page.getByTestId("estimate-luce")).toBeVisible();
    await expect(page.getByTestId("estimate-gas")).toBeVisible();
    // No second lead creation: the lead already exists.
    expect(creations).toEqual([]);
  });

  test("refresh in the middle of Page 1, results, activation A and activation B, then complete", async ({ page, admin }) => {
    const c = CASA_DUAL;

    // ---- Page 1 ----
    await openPage1(page);
    await pick(page, "commodity-dual", "customer-casa", "service-cambio", "people-2", "appliance-forno", "has-gas-yes", "gas-use-cucina", "gas-use-riscaldamento", "sqm-90_120");
    await page.getByTestId("supplier-luce").selectOption("edison-energia");
    await page.getByTestId("supplier-gas").selectOption("eni-plenitude");
    await page.getByTestId("first-name").fill(c.person.first);
    await page.getByTestId("last-name").fill(c.person.last);
    const phone = `3${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`;
    await page.getByTestId("phone").fill(phone);
    await chooseComune(page, "Milano");
    const created = page.waitForResponse((r) => r.url().endsWith("/api/lead") && r.request().method() === "POST");
    await page.getByTestId("privacy-consent").check();
    expect((await created).status()).toBe(201);
    await page.reload();
    await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
    await expect(page.getByTestId("commodity-dual")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("appliance-forno")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("sqm-90_120")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("supplier-luce")).toHaveValue("edison-energia");
    await expect(page.getByTestId("supplier-gas")).toHaveValue("eni-plenitude");
    await expect(page.getByTestId("first-name")).toHaveValue(c.person.first);
    await expect(page.locator("#p1-comune")).toHaveValue("Milano");
    await expect(page.getByTestId("privacy-consent")).toBeChecked();
    // 1300 + 150 = 1.450 kWh; cucina 40+20 + 105*13 = 1.425 Smc
    await expect(page.getByTestId("estimate-luce")).toHaveText("Consumo stimato: ~1.450 kWh/anno");
    await expect(page.getByTestId("estimate-gas")).toHaveText("Consumo stimato: ~1.425 Smc/anno");
    await page.getByTestId("submit").click();
    await page.waitForURL(/\/offerte$/);

    // ---- results (luce step) ----
    const cards = page.getByTestId("offer-card");
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    const luceIds = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-offer-id")));
    expect(luceIds).toHaveLength(3); // Edison (current supplier) excluded
    await page.reload();
    await expect(cards.first()).toBeVisible();
    await expect(page.getByTestId("loading-screen")).toHaveCount(0);
    expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-offer-id")))).toEqual(luceIds);
    await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "luce");

    // choose the luce offer, then refresh on the gas step: the page restarts from the luce step but
    // the luce choice survives
    await cards.nth(1).getByTestId("offer-cta").click();
    await page.getByTestId("offer-modal-cta").click();
    await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "gas");
    await page.reload();
    await expect(cards.first()).toBeVisible();
    await expect(page.locator(`[data-offer-id="${luceIds[1]}"]`)).toHaveAttribute("data-chosen", "true");
    await cards.nth(1).getByTestId("offer-cta").click();
    await page.getByTestId("offer-modal-cta").click();
    await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", "gas");
    await cards.first().getByTestId("offer-cta").click();
    await page.getByTestId("offer-modal-cta").click();
    await page.waitForURL(/\/attivazione$/);

    // ---- activation A ----
    await field(page, "tax_code").fill(c.person.cf);
    await radio(page, "housing_title-inquilino").click();
    await page.reload();
    await expect(page.getByTestId("activation-step-a")).toBeVisible();
    await expect(field(page, "tax_code")).toHaveValue(c.person.cf);
    await expect(radio(page, "housing_title-inquilino")).toHaveAttribute("aria-checked", "true");
    await expect(field(page, "first_name")).toHaveValue(c.person.first);
    await page.getByTestId("activation-next").click();

    // ---- activation B ----
    await field(page, "cap").selectOption("20124");
    await field(page, "address").fill("Via Torino");
    await field(page, "street_number").fill("18");
    await radio(page, "is_resident-no").click();
    await field(page, "pod").fill(POD);
    await field(page, "pdr").fill(PDR);
    await radio(page, "voltage-380").click();
    await field(page, "power_kw").selectOption("4.5");
    await page.reload();
    await expect(page.getByTestId("activation-step-b")).toBeVisible();
    await expect(field(page, "cap")).toHaveValue("20124");
    await expect(field(page, "address")).toHaveValue("Via Torino");
    await expect(field(page, "street_number")).toHaveValue("18");
    await expect(radio(page, "is_resident-no")).toHaveAttribute("aria-checked", "true");
    await expect(field(page, "pod")).toHaveValue(POD);
    await expect(field(page, "pdr")).toHaveValue(PDR);
    await expect(radio(page, "voltage-380")).toHaveAttribute("aria-checked", "true");
    await expect(field(page, "power_kw")).toHaveValue("4.5");
    await expect(page.getByTestId("summary-total")).toBeVisible();

    // The lead cookie survived every refresh: the submit completes the same lead.
    await page.getByTestId("activation-submit").click();
    await expect(page).toHaveURL(/\/grazie$/);
    await expect(page.getByTestId("thankyou-heading")).toHaveText(`Grazie, ${c.person.first}!`);
    const lead = await waitForLead(admin, phone, (l) => l.step === "completed");
    expect(lead.fields["POD"]).toBe(POD);
    expect(lead.fields["PDR"]).toBe(PDR);
    expect(lead.fields["Potenza (kW)"]).toBe("4,5");
    expect(lead.fields["Tensione"]).toBe("380 V");
    expect(lead.fields["Residente"]).toBe("No");
    expect(lead.fields["CAP"]).toBe("20124");
  });

  test("a refresh on the thank-you page, and a direct visit without a session, go back to the start", TAG, async ({ page }) => {
    await page.goto("/grazie");
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/attivazione");
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/offerte");
    await page.waitForURL((url) => url.pathname === "/");
  });
});
