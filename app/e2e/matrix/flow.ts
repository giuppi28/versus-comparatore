/**
 * Drives the REAL customer UI for one matrix case, from Page 1 to the thank-you page, against the real
 * lead API on the mock repository, and asserts every PRD-relevant outcome on the way (T7.1).
 */
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { randomInt } from "node:crypto";
import { MOCK_COMUNI, MOCK_OFFERS, MOCK_SUPPLIERS } from "../../src/lib/data/mock/data";
import type { Offer, ServiceType } from "../../src/lib/data/types";
import { estimateGas, estimateLuce } from "../../src/lib/logic/consumption";
import {
  annualFromMonthly,
  formatEuro,
  formatPrice,
  monthlyCost,
  monthlyFromAnnual,
  rankOffers,
  roundCents,
} from "../../src/lib/logic/pricing";
import { needsCurrentSupplier, needsMeterCode } from "../../src/lib/lead/rules";
import {
  COMMODITY_LABELS,
  CUSTOMER_TYPE_LABELS,
  HOUSING_TITLE_LABELS,
  SERVICE_TYPE_LABELS,
  applianceLabel,
  gasUseLabel,
  sqmLabel,
} from "../../src/app/admin/(protected)/leads/labels";
import type { MatrixCase } from "./cases";
import { waitForLead, type LeadView } from "./lead-reader";

// ---------------------------------------------------------------------------
// small UI helpers (test ids come from the Page 1 / results / activation / thank-you screens)

/** Clicks the SelectCard inside the element with the given data-testid. */
export const card = (page: Page, testId: string): Locator => page.getByTestId(testId).locator("button");
export const pick = async (page: Page, ...testIds: string[]) => {
  for (const id of testIds) await card(page, id).click();
};
export const field = (page: Page, name: string): Locator => page.locator(`[name="${name}"]`);
export const radio = (page: Page, testId: string): Locator => page.getByTestId(testId).getByRole("radio");

export async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow").toBeLessThanOrEqual(0);
}

export async function openPage1(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
}

export async function chooseComune(page: Page, query: string) {
  const input = page.locator("#p1-comune");
  await input.fill(query);
  await page.getByRole("option", { name: new RegExp(`^${query}`) }).first().click();
  await expect(input).toHaveValue(query);
}

export interface Identity {
  /** Unique national mobile number (10 digits, starts with 3): the lead's search key. */
  phone: string;
  pod: string;
  pdr: string;
}

export function newIdentity(): Identity {
  const digits = (n: number) => Array.from({ length: n }, () => randomInt(0, 10)).join("");
  return { phone: `3${digits(9)}`, pod: `IT001E${digits(8)}`, pdr: digits(14) };
}

function phoneAsTyped(phone: string, format: MatrixCase["phoneFormat"]): string {
  const spaced = `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  return format === "plain" ? phone : format === "spaced" ? spaced : `+39 ${spaced}`;
}

const groupFmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });
/** Same formatting as the admin lead detail (labels of numbers). */
const adminNum = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const adminEuro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const norm = (s: string | null | undefined) => (s ?? "").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// expectations derived from the case (independent of the UI: they use the shared logic)

export interface Derived {
  luce: boolean;
  gas: boolean;
  manual: boolean;
  annualKwh: number | null;
  annualSmc: number | null;
  monthlyKwh: number | null;
  monthlySmc: number | null;
  luceService: ServiceType | null;
  gasService: ServiceType | null;
  /** Current supplier that must be excluded from the results (null when none applies). */
  excludeLuce: string | null;
  excludeGas: string | null;
}

export function derive(c: MatrixCase): Derived {
  const luce = c.commodity !== "gas";
  const gas = c.commodity !== "luce";
  const manual = c.manual || c.customer === "business";
  const annualKwh = !luce ? null : manual ? c.manualKwh! : estimateLuce({ people: c.people!, appliances: c.appliances });
  const annualSmc = !gas
    ? null
    : manual
      ? c.manualSmc!
      : estimateGas({ people: c.people!, uses: c.gasUses, sqmRange: c.sqm, climateZone: c.zone, provinceCode: c.provinceCode });
  const luceService = luce ? c.service : null;
  const gasService: ServiceType | null = gas ? (c.hasGas === false ? "primo_allaccio" : c.service) : null;
  return {
    luce,
    gas,
    manual,
    annualKwh,
    annualSmc,
    monthlyKwh: annualKwh == null ? null : Math.max(1, monthlyFromAnnual(annualKwh)),
    monthlySmc: annualSmc == null ? null : Math.max(1, monthlyFromAnnual(annualSmc)),
    luceService,
    gasService,
    excludeLuce: luceService && needsCurrentSupplier(luceService) ? c.supplierLuce : null,
    excludeGas: gasService && needsCurrentSupplier(gasService) ? c.supplierGas : null,
  };
}

const supplierName = (id: string) => MOCK_SUPPLIERS.find((s) => s.id === id)!.name;
const comuneOf = (c: MatrixCase) => MOCK_COMUNI.find((x) => x.name === c.comune)!;

function offerPool(commodity: "luce" | "gas", customer: MatrixCase["customer"]): Offer[] {
  return MOCK_OFFERS.filter(
    (o) => o.commodity === commodity && o.active && (o.customer_type === "both" || o.customer_type === customer),
  );
}

// ---------------------------------------------------------------------------
// Page 1

export async function fillPage1(page: Page, c: MatrixCase, d: Derived, id: Identity) {
  await openPage1(page);
  await pick(page, `commodity-${c.commodity}`, `customer-${c.customer}`);
  const business = c.customer === "business";

  // Service type. Gas-only + hasGas=no locks the service to Primo allaccio (decided below).
  const serviceTestId = {
    cambio_fornitore: "service-cambio",
    subentro: "service-subentro",
    voltura: "service-voltura",
    primo_allaccio: "service-primo-allaccio",
  }[c.service];
  const lockedByNoGas = c.commodity === "gas" && c.hasGas === false;
  if (!lockedByNoGas) await pick(page, serviceTestId);

  // ---- Block C ----
  if (business) await page.getByTestId("company-name").fill(c.company!);
  await page.getByTestId("first-name").fill(c.person.first);
  await page.getByTestId("last-name").fill(c.person.last);
  await page.getByTestId("phone").fill(phoneAsTyped(id.phone, c.phoneFormat));
  await chooseComune(page, c.comune);

  // ---- Block F ----
  if (business) {
    await expect(page.getByTestId("manual-toggle")).toHaveCount(0);
    await expect(page.getByTestId("has-gas-yes")).toHaveCount(0);
    if (d.luce) await page.getByTestId("manual-kwh").fill(String(c.manualKwh));
    else await expect(page.getByTestId("manual-kwh")).toHaveCount(0);
    if (d.gas) await page.getByTestId("manual-smc").fill(String(c.manualSmc));
    else await expect(page.getByTestId("manual-smc")).toHaveCount(0);
  } else {
    if (c.manual) await page.getByTestId("manual-toggle").check();
    else await pick(page, `people-${c.people}`);
    if (d.luce && !c.manual) {
      for (const a of c.appliances) await pick(page, `appliance-${a}`);
    }
    if (d.gas) {
      await pick(page, c.hasGas ? "has-gas-yes" : "has-gas-no");
      for (const u of c.gasUses) await pick(page, `gas-use-${u}`);
      if (!c.manual && c.sqm) await pick(page, `sqm-${c.sqm}`);
    } else {
      await expect(page.getByTestId("has-gas-yes")).toHaveCount(0);
    }
    if (c.manual) {
      if (d.luce) await page.getByTestId("manual-kwh").fill(String(c.manualKwh));
      if (d.gas) await page.getByTestId("manual-smc").fill(String(c.manualSmc));
    }
  }

  // The service lock for gas-only / hasGas=no must have selected Primo allaccio by itself.
  if (lockedByNoGas) {
    await expect(page.getByTestId("service-primo-allaccio")).toHaveAttribute("data-selected", "true");
    await expect(card(page, "service-cambio")).toBeDisabled();
  }

  // ---- Block E ----
  const luceSupplierShown = d.luce && !!d.luceService && needsCurrentSupplier(d.luceService);
  const gasSupplierShown = d.gas && !!d.gasService && needsCurrentSupplier(d.gasService);
  if (luceSupplierShown) await page.getByTestId("supplier-luce").selectOption(c.supplierLuce!);
  else await expect(page.getByTestId("supplier-luce")).toHaveCount(0);
  if (gasSupplierShown) await page.getByTestId("supplier-gas").selectOption(c.supplierGas!);
  else await expect(page.getByTestId("supplier-gas")).toHaveCount(0);
  if (!luceSupplierShown && !gasSupplierShown) await expect(page.getByTestId("block-supplier")).toHaveCount(0);

  // ---- live estimates (PRD §6) ----
  if (!d.manual) {
    if (d.luce) {
      await expect(page.getByTestId("estimate-luce")).toHaveText(`Consumo stimato: ~${groupFmt.format(d.annualKwh!)} kWh/anno`);
    }
    if (d.gas) {
      await expect(page.getByTestId("estimate-gas")).toHaveText(`Consumo stimato: ~${groupFmt.format(d.annualSmc!)} Smc/anno`);
    }
  } else {
    await expect(page.getByTestId("estimate-luce")).toHaveCount(0);
    await expect(page.getByTestId("estimate-gas")).toHaveCount(0);
  }

  // ---- privacy consent: the lead is saved right here (POST /api/lead 201) ----
  const created = page.waitForResponse((r) => r.url().endsWith("/api/lead") && r.request().method() === "POST");
  await page.getByTestId("privacy-consent").check();
  const createdResponse = await created;
  expect(createdResponse.status(), "POST /api/lead at consent").toBe(201);
  const cookie = (await page.context().cookies()).find((k) => k.name === "versus_lead");
  expect(cookie?.httpOnly, "lead token cookie is httpOnly").toBe(true);

  // ---- submit: PATCH with the whole Page 1 ----
  const patched = page.waitForResponse((r) => r.url().endsWith("/api/lead") && r.request().method() === "PATCH");
  await page.getByTestId("submit").click();
  const patchResponse = await patched;
  expect(patchResponse.status(), "PATCH /api/lead on submit").toBe(200);
  const patch = patchResponse.request().postDataJSON().data as Record<string, unknown>;
  expect(patch).toMatchObject({
    commodity: c.commodity,
    customer_type: c.customer,
    first_name: c.person.first,
    last_name: c.person.last,
    phone: id.phone,
    comune_istat: comuneOf(c).istat_code,
    service_type: c.hasGas === false && c.commodity === "gas" ? "primo_allaccio" : c.service,
    manual_consumption: d.manual,
  });
  if (d.luce) expect(patch.estimated_kwh_year).toBe(d.annualKwh);
  if (d.gas) expect(patch.estimated_smc_year).toBe(d.annualSmc);
  await page.waitForURL(/\/offerte$/);
}

// ---------------------------------------------------------------------------
// Results + modal

export interface Chosen {
  offer: Offer;
  cost: number;
}

async function ids(cards: Locator, attr: string): Promise<string[]> {
  return cards.evaluateAll((els, a) => els.map((e) => e.getAttribute(a) ?? ""), attr);
}

export async function resultsStep(
  page: Page,
  c: MatrixCase,
  commodity: "luce" | "gas",
  monthly: number,
  exclude: string | null,
  pickIndex: number,
  isDual: boolean,
): Promise<Chosen> {
  const cards = page.getByTestId("offer-card");
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  const label = commodity === "luce" ? "Luce" : "Gas";
  await expect(page.getByTestId("results-title")).toHaveText(`Le migliori offerte ${label} per te`);
  if (isDual) await expect(page.getByTestId("dual-step-indicator")).toHaveAttribute("data-active", commodity);

  const annual = annualFromMonthly(monthly);
  const expected = rankOffers(offerPool(commodity, c.customer), annual, { excludeSupplierId: exclude });
  expect(expected.length).toBeGreaterThan(0);

  // (1) exactly the expected offers in the expected order: featured first, then cost ascending
  await expect.poll(() => ids(cards, "data-offer-id"), { message: `${commodity} offer order` }).toEqual(
    expected.map((r) => r.offer.id),
  );
  // (2) the current supplier's offers are excluded
  const suppliers = await ids(cards, "data-supplier-id");
  if (exclude) expect(suppliers, `current ${commodity} supplier ${exclude} must be excluded`).not.toContain(exclude);
  // (3) featured block first, then ascending cents inside each block
  const featured = (await ids(cards, "data-featured")).map((v) => v === "true");
  const firstNonFeatured = featured.indexOf(false);
  if (firstNonFeatured >= 0) expect(featured.slice(firstNonFeatured).some(Boolean), "featured offers come first").toBe(false);
  const cents = (await ids(cards, "data-monthly-cost")).map(Number);
  expect(cents).toEqual(expected.map((r) => Math.round(r.monthlyCost * 100)));
  for (const [from, to] of [[0, firstNonFeatured < 0 ? cents.length : firstNonFeatured], [firstNonFeatured < 0 ? cents.length : firstNonFeatured, cents.length]]) {
    const part = cents.slice(from, to);
    expect(part, "ascending monthly cost within block").toEqual([...part].sort((a, b) => a - b));
  }
  // (4) the editable consumption is prefilled with annual / 12 and only the current commodity shows
  await expect(page.getByTestId(commodity === "luce" ? "results-consumption-kwh" : "results-consumption-smc")).toHaveValue(
    String(monthly),
  );
  await expect(page.getByTestId(commodity === "luce" ? "results-consumption-smc" : "results-consumption-kwh")).toHaveCount(0);

  // (5) choose one card (rotating position), check its cost and the modal
  const at = pickIndex % expected.length;
  const chosen = expected[at];
  const chosenCard = cards.nth(at);
  await expect(chosenCard).toHaveAttribute("data-offer-id", chosen.offer.id);
  await expect(chosenCard.getByTestId("offer-monthly")).toHaveText(formatEuro(chosen.monthlyCost));
  await expect(chosenCard.getByTestId("offer-price")).toHaveText(
    formatPrice(chosen.offer.energy_price, commodity === "luce" ? "kWh" : "Smc"),
  );
  await expect(chosenCard.getByTestId("offer-locked")).toHaveText(`Bloccato ${chosen.offer.locked_months} mesi`);
  await expect(chosenCard.getByTestId("offer-cta")).toHaveText("Attiva online in 1 minuto");
  if (chosen.offer.featured) await expect(chosenCard.getByTestId("offer-featured-band")).toHaveText("In evidenza");
  await chosenCard.getByTestId("offer-cta").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("I vantaggi dell'offerta")).toBeVisible();
  const items = dialog.getByTestId("offer-modal-advantages").locator("li");
  await expect(items).toHaveCount(chosen.offer.advantages.length);
  for (const [i, adv] of chosen.offer.advantages.entries()) {
    await expect(items.nth(i)).toHaveText(adv.replace(/\*\*/g, ""));
  }
  await expect(dialog.getByTestId("offer-modal-monthly")).toContainText(formatEuro(chosen.monthlyCost));
  if (isDual) await expect(dialog.getByTestId("offer-modal-step")).toHaveText(`Offerta ${label}`);
  await dialog.getByTestId("offer-modal-cta").click();
  return { offer: chosen.offer, cost: chosen.monthlyCost };
}

// ---------------------------------------------------------------------------
// Activation form

export async function fillActivation(
  page: Page,
  c: MatrixCase,
  d: Derived,
  id: Identity,
  chosen: { luce: Chosen | null; gas: Chosen | null },
  hooks: { beforeNext?: () => Promise<void>; beforeSubmit?: () => Promise<void> } = {},
) {
  const total = (chosen.luce?.cost ?? 0) + (chosen.gas?.cost ?? 0);
  await expect(page.getByTestId("activation-step-a")).toBeVisible();

  // Sticky summary: chosen offer(s) and the total monthly cost.
  await expect(page.getByTestId("summary-total")).toHaveText(formatEuro(total));
  const summaryToggle = page.getByTestId("summary-toggle");
  if (await summaryToggle.isVisible()) await summaryToggle.click();
  for (const key of ["luce", "gas"] as const) {
    const ch = chosen[key];
    if (!ch) {
      await expect(page.getByTestId(`summary-offer-${key}`)).toHaveCount(0);
      continue;
    }
    const unit = key === "luce" ? "kWh" : "Smc";
    await expect(page.getByTestId(`summary-offer-${key}`)).toContainText(ch.offer.name);
    await expect(page.getByTestId(`summary-price-${key}`)).toHaveText(formatPrice(ch.offer.energy_price, unit));
    await expect(page.getByTestId(`summary-fixed-${key}`)).toHaveText(formatEuro(ch.offer.fixed_fee_monthly));
    await expect(page.getByTestId(`summary-locked-${key}`)).toHaveText(`${ch.offer.locked_months} mesi`);
    await expect(page.getByTestId(`summary-activation-${key}`)).toHaveText(formatEuro(ch.offer.activation_cost));
    if (chosen.luce && chosen.gas) await expect(page.getByTestId(`summary-monthly-${key}`)).toContainText(formatEuro(ch.cost));
  }

  // ---- Step A ----
  await expect(field(page, "first_name")).toHaveValue(c.person.first);
  await expect(field(page, "last_name")).toHaveValue(c.person.last);
  await expect(field(page, "phone")).toHaveValue(phoneAsTyped(id.phone, c.phoneFormat));
  await expect(field(page, "email")).toHaveCount(0);
  if (c.customer === "business") {
    await expect(field(page, "company_name")).toHaveValue(c.company!);
    await field(page, "vat_number").fill(c.vat!);
  } else {
    await expect(field(page, "vat_number")).toHaveCount(0);
  }
  await field(page, "tax_code").fill(c.person.cf);
  await radio(page, `housing_title-${c.housing}`).click();
  await hooks.beforeNext?.();
  await page.getByTestId("activation-next").click();

  // ---- Step B ----
  await expect(page.getByTestId("activation-step-b")).toBeVisible();
  const comune = comuneOf(c);
  await expect(field(page, "comune")).toHaveValue(`${comune.name} (${comune.province_code})`);
  const capField = field(page, "cap");
  const cap = comune.caps[c.index % comune.caps.length];
  if ((await capField.evaluate((el) => el.tagName)) === "SELECT") {
    expect(comune.caps.length).toBeGreaterThan(1);
    await capField.selectOption(cap);
  } else {
    expect(comune.caps).toHaveLength(1);
    await expect(capField).toHaveValue(comune.caps[0]);
  }
  await field(page, "address").fill(`Via Garibaldi ${c.index}`);
  await field(page, "street_number").fill(`${(c.index % 90) + 1}/A`);
  await radio(page, `is_resident-${c.resident ? "yes" : "no"}`).click();

  const fillMeter = c.index % 2 === 0;
  let expectedOptional = 0;
  if (d.luce) {
    await expect(page.getByTestId("activation-luce")).toBeVisible();
    if (needsCurrentSupplier(d.luceService!)) {
      await expect(field(page, "current_supplier_luce")).toHaveValue(c.supplierLuce!);
    } else {
      await expect(field(page, "current_supplier_luce")).toHaveCount(0);
    }
    if (needsMeterCode(d.luceService!)) {
      // 15 characters in lower case are accepted and normalised to 14 upper-case characters
      await field(page, "pod").fill(c.index % 3 === 0 ? `${id.pod.toLowerCase()}9` : id.pod);
      await field(page, "pod").blur();
      await expect(field(page, "pod")).toHaveValue(id.pod);
    } else {
      expectedOptional += 1;
      if (fillMeter) await field(page, "pod").fill(id.pod);
    }
    await field(page, "power_kw").selectOption(c.powerKw === null ? "altro" : String(c.powerKw));
    await radio(page, `voltage-${c.voltage}`).click();
  } else {
    await expect(page.getByTestId("activation-luce")).toHaveCount(0);
  }
  if (d.gas) {
    await expect(page.getByTestId("activation-gas")).toBeVisible();
    if (needsCurrentSupplier(d.gasService!)) {
      await expect(field(page, "current_supplier_gas")).toHaveValue(c.supplierGas!);
    } else {
      await expect(field(page, "current_supplier_gas")).toHaveCount(0);
    }
    if (needsMeterCode(d.gasService!)) {
      await field(page, "pdr").fill(c.index % 3 === 1 ? `${id.pdr.slice(0, 4)} ${id.pdr.slice(4, 8)} ${id.pdr.slice(8, 12)} ${id.pdr.slice(12)}` : id.pdr);
      await field(page, "pdr").blur();
      await expect(field(page, "pdr")).toHaveValue(id.pdr);
    } else {
      expectedOptional += 1;
      if (fillMeter) await field(page, "pdr").fill(id.pdr);
    }
    // Gas uses: prefilled from Page 1 (Casa); Partita IVA asks nothing on Page 1, so one is picked here.
    for (const use of ["cucina", "riscaldamento", "acqua_calda"] as const) {
      const box = page.getByTestId(`gas-use-${use}`).getByRole("checkbox");
      const expectedChecked = c.customer === "casa" && c.gasUses.includes(use);
      await expect(box).toHaveAttribute("aria-checked", String(expectedChecked));
    }
    if (c.customer === "business") await page.getByTestId(`gas-use-${c.businessGasUse}`).getByRole("checkbox").click();
  }
  await expect(page.getByText("(facoltativo)")).toHaveCount(expectedOptional);

  await hooks.beforeSubmit?.();
  const completed = page.waitForResponse((r) => r.url().endsWith("/api/lead/complete") && r.request().method() === "POST");
  await page.getByTestId("activation-submit").click();
  const response = await completed;
  expect(response.status(), `POST /api/lead/complete: ${await response.text()}`).toBe(200);
  await expect(page).toHaveURL(/\/grazie$/);
  return { filledOptionalMeter: fillMeter, cap };
}

// ---------------------------------------------------------------------------
// Thank-you

export async function checkThankYou(page: Page, c: MatrixCase, chosen: { luce: Chosen | null; gas: Chosen | null }) {
  await expect(page.getByTestId("thankyou-heading")).toHaveText(`Grazie, ${c.person.first}!`);
  await expect(
    page.getByText("Riceverai a breve una chiamata dal numero +39 095 0000000 da un nostro consulente per confermare l'attivazione."),
  ).toBeVisible();
  for (const key of ["luce", "gas"] as const) {
    const ch = chosen[key];
    const block = page.getByTestId(`thankyou-offer-${key}`);
    if (!ch) {
      await expect(block).toHaveCount(0);
      continue;
    }
    // The supplier must be identifiable: either the visible text chip or the logo <img> with the supplier name as alt.
    const sName = supplierName(ch.offer.supplier_id);
    const asText = block.getByText(sName, { exact: false });
    const asLogo = block.locator(`img[alt="${sName}"]`);
    await expect(asText.or(asLogo).first(), `thank-you supplier ${key}: ${sName}`).toBeVisible();
    await expect(block).toContainText(ch.offer.name);
    await expect(block).toContainText(formatEuro(ch.cost));
    await expect(block).toContainText(`${ch.offer.locked_months} mesi`);
    await expect(block).toContainText(formatPrice(ch.offer.energy_price, key === "luce" ? "kWh" : "Smc"));
    await expect(block).toContainText(`${formatEuro(ch.offer.fixed_fee_monthly)}/mese`);
  }
  if (chosen.luce && chosen.gas) {
    await expect(page.getByTestId("thankyou-total")).toContainText(formatEuro(chosen.luce.cost + chosen.gas.cost));
  } else {
    await expect(page.getByTestId("thankyou-total")).toHaveCount(0);
  }
}

// ---------------------------------------------------------------------------
// Server-side lead (through the admin pages)

function same(actual: string | null | undefined, expected: string | null, label: string) {
  expect(norm(actual) || null, `admin lead field "${label}"`).toBe(expected === null ? null : norm(expected));
}

function sameSet(actual: string | null | undefined, expected: string[], label: string) {
  const got = norm(actual) ? norm(actual).split(", ").sort() : [];
  expect(got, `admin lead field "${label}"`).toEqual([...expected].sort());
}

export function expectCompletedLead(
  lead: LeadView,
  c: MatrixCase,
  d: Derived,
  id: Identity,
  chosen: { luce: Chosen | null; gas: Chosen | null },
  extra: { cap: string; filledOptionalMeter: boolean },
) {
  const f = lead.fields;
  expect(lead.step, "lead step_reached").toBe("completed");
  expect(lead.status, "lead status").toBe("new");

  const business = c.customer === "business";
  same(f["Nome"], c.person.first, "Nome");
  same(f["Cognome"], c.person.last, "Cognome");
  same(f["Telefono"], id.phone, "Telefono");
  same(f["Tipo cliente"], CUSTOMER_TYPE_LABELS[c.customer], "Tipo cliente");
  if (business) {
    same(f["Ragione sociale"], c.company, "Ragione sociale");
    same(f["Partita IVA"], c.vat, "Partita IVA");
  } else {
    same(f["Codice fiscale"], c.person.cf, "Codice fiscale");
    same(f["Titolo abitazione"], HOUSING_TITLE_LABELS[c.housing], "Titolo abitazione");
  }

  const comune = comuneOf(c);
  const storedService: ServiceType = c.commodity === "gas" && c.hasGas === false ? "primo_allaccio" : c.service;
  same(f["Richiesta"], COMMODITY_LABELS[c.commodity], "Richiesta");
  same(f["Tipo di pratica"], SERVICE_TYPE_LABELS[storedService], "Tipo di pratica");
  same(f["Comune"], `${comune.name} (${comune.province_code})`, "Comune");
  same(f["CAP"], extra.cap, "CAP");
  same(f["Indirizzo"], `Via Garibaldi ${c.index}, ${(c.index % 90) + 1}/A`, "Indirizzo");
  same(f["Residente"], c.resident ? "Sì" : "No", "Residente");
  same(f["Fornitore attuale luce"], d.excludeLuce ? supplierName(d.excludeLuce) : null, "Fornitore attuale luce");
  same(f["Fornitore attuale gas"], d.excludeGas ? supplierName(d.excludeGas) : null, "Fornitore attuale gas");
  same(f["Ha anche il gas"], d.gas && c.customer === "casa" ? (c.hasGas ? "Sì" : "No") : null, "Ha anche il gas");

  same(f["Persone"], c.people == null || d.manual ? null : String(c.people), "Persone");
  sameSet(f["Elettrodomestici"], d.luce && !d.manual ? c.appliances.map(applianceLabel) : [], "Elettrodomestici");
  const gasUsesStored = !d.gas ? [] : business ? [c.businessGasUse] : c.gasUses;
  sameSet(f["Usi del gas"], gasUsesStored.map(gasUseLabel), "Usi del gas");
  same(f["Superficie"], d.gas && !d.manual && c.sqm ? sqmLabel(c.sqm) : null, "Superficie");
  same(f["Stima luce (kWh/anno)"], d.luce ? adminNum.format(d.annualKwh!) : null, "Stima luce");
  same(f["Stima gas (Smc/anno)"], d.gas ? adminNum.format(d.annualSmc!) : null, "Stima gas");
  same(f["Consumo inserito a mano"], d.manual ? "Sì" : "No", "Consumo inserito a mano");
  same(f["Consumo finale luce (kWh/mese)"], d.luce ? adminNum.format(d.monthlyKwh!) : null, "Consumo finale luce");
  same(f["Consumo finale gas (Smc/mese)"], d.gas ? adminNum.format(d.monthlySmc!) : null, "Consumo finale gas");

  const offerLabel = (ch: Chosen | null) => (ch ? `${supplierName(ch.offer.supplier_id)} — ${ch.offer.name}` : null);
  same(f["Offerta luce"], offerLabel(chosen.luce), "Offerta luce");
  same(f["Offerta gas"], offerLabel(chosen.gas), "Offerta gas");
  const total = (chosen.luce?.cost ?? 0) + (chosen.gas?.cost ?? 0);
  same(f["Costo mensile mostrato"], adminEuro.format(Math.round(total * 100) / 100), "Costo mensile mostrato");

  const podStored = d.luce && (needsMeterCode(d.luceService!) || extra.filledOptionalMeter) ? id.pod : null;
  const pdrStored = d.gas && (needsMeterCode(d.gasService!) || extra.filledOptionalMeter) ? id.pdr : null;
  same(f["POD"], podStored, "POD");
  same(f["Potenza (kW)"], d.luce && c.powerKw !== null ? adminNum.format(c.powerKw) : null, "Potenza");
  same(f["Tensione"], d.luce ? `${c.voltage} V` : null, "Tensione");
  same(f["PDR"], pdrStored, "PDR");
  same(f["Privacy"], "Sì", "Privacy");
}

// ---------------------------------------------------------------------------
// The whole run

export async function runCase(page: Page, admin: APIRequestContext, c: MatrixCase): Promise<void> {
  const d = derive(c);
  const id = newIdentity();
  const chosen: { luce: Chosen | null; gas: Chosen | null } = { luce: null, gas: null };

  await test.step("Page 1: choices, estimate, consent (lead created), submit", async () => {
    await fillPage1(page, c, d, id);
  });

  await test.step("lead saved on the server after Page 1", async () => {
    const lead = await waitForLead(admin, id.phone, (l) => !!l.fields["Telefono"]);
    expect(["page1", "results"]).toContain(lead.step);
    same(lead.fields["Nome"], c.person.first, "Nome");
    same(lead.fields["Richiesta"], COMMODITY_LABELS[c.commodity], "Richiesta");
    same(lead.fields["Privacy"], "Sì", "Privacy");
  });

  await test.step("results + offer modal", async () => {
    const dual = d.luce && d.gas;
    if (d.luce) chosen.luce = await resultsStep(page, c, "luce", d.monthlyKwh!, d.excludeLuce, c.pickLuce, dual);
    if (d.gas) chosen.gas = await resultsStep(page, c, "gas", d.monthlySmc!, d.excludeGas, c.pickGas, dual);
    await page.waitForURL(/\/attivazione$/);
  });

  await test.step("lead updated to offer_chosen", async () => {
    const lead = await waitForLead(admin, id.phone, (l) => l.step === "offer_chosen");
    expect(lead.step).toBe("offer_chosen");
    same(lead.fields["Offerta luce"], chosen.luce ? `${supplierName(chosen.luce.offer.supplier_id)} — ${chosen.luce.offer.name}` : null, "Offerta luce");
    same(lead.fields["Offerta gas"], chosen.gas ? `${supplierName(chosen.gas.offer.supplier_id)} — ${chosen.gas.offer.name}` : null, "Offerta gas");
  });

  let extra!: { cap: string; filledOptionalMeter: boolean };
  await test.step("activation A + B, submit", async () => {
    extra = await fillActivation(page, c, d, id, chosen);
  });

  await test.step("thank-you page", async () => {
    await checkThankYou(page, c, chosen);
  });

  await test.step("lead completed with all fields (admin detail)", async () => {
    const lead = await waitForLead(admin, id.phone, (l) => l.step === "completed");
    expectCompletedLead(lead, c, d, id, chosen, extra);
  });
}

/**
 * Runs Page 1 and the results steps (real UI + real lead API) and stops on the activation form.
 * Used by the validation / copy / screenshot suites that need a real session in that state.
 */
export async function reachActivation(page: Page, c: MatrixCase) {
  const d = derive(c);
  const id = newIdentity();
  const chosen: { luce: Chosen | null; gas: Chosen | null } = { luce: null, gas: null };
  await fillPage1(page, c, d, id);
  const dual = d.luce && d.gas;
  if (d.luce) chosen.luce = await resultsStep(page, c, "luce", d.monthlyKwh!, d.excludeLuce, c.pickLuce, dual);
  if (d.gas) chosen.gas = await resultsStep(page, c, "gas", d.monthlySmc!, d.excludeGas, c.pickGas, dual);
  await page.waitForURL(/\/attivazione$/);
  await expect(page.getByTestId("activation-step-a")).toBeVisible();
  return { d, id, chosen };
}

export { monthlyCost, roundCents };
