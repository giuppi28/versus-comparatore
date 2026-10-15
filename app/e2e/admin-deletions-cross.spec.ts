import { expect, test, type APIRequestContext, type Page, type PlaywrightWorkerArgs, type TestInfo } from "@playwright/test";
import { chooseComune, noOverflow, openPage1, pick } from "./matrix/flow";
import { page1Data } from "../src/lib/lead/test-fixtures";

// Phase 11 / D6: cross-area deletion checks (admin <-> customer flow).
//   a. deleting an offer keeps what a lead chose (snapshot shown in the lead detail);
//   b. deleting a supplier removes it (and its offers) for customers, and old leads keep its name;
//   c. the delete server actions reject a caller without an admin session (end to end).
// Every test creates and removes its OWN fixtures (unique names): desktop and mobile share ONE mock
// server and run in parallel, and seeded data is never deleted.
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const FLOW_KEY = "versus.flow.v1";
const SHOTS = "e2e/screenshots";
const CLEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect width="100" height="40" fill="#0a8045"/><circle cx="20" cy="20" r="10" fill="#fff"/></svg>`;

// The public lead API rate-limits per client IP: every test gets its own, so repeated runs never couple.
test.beforeEach(async ({ page }) => {
  const n = Math.floor(Math.random() * 16_000_000);
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}` });
});

const rand = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]/g, "")
    .slice(0, 8)
    .padEnd(8, "q");
const unique = (label: string, info: TestInfo) => `E2E ${label} ${info.project.name} ${Date.now().toString(36)}`;

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  await page.waitForURL((url) => url.pathname === "/admin");
}

/** Creates a supplier through the admin form. Returns its id and slug. */
async function createSupplier(
  page: Page,
  name: string,
  opts: { showInDropdown: boolean; logo?: boolean },
): Promise<{ id: string; slug: string }> {
  await page.goto("/admin/fornitori/nuovo");
  await page.getByLabel("Nome").fill(name);
  const slug = await page.getByLabel("Slug").inputValue();
  const dropdown = page.getByLabel(/Mostra nell'elenco/);
  if (opts.showInDropdown) await dropdown.check();
  else await dropdown.uncheck();
  if (opts.logo) {
    await page.locator("#logo").setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(CLEAN_SVG) });
    await expect(page.locator('[data-testid="logo-preview"] img')).toBeVisible();
  }
  await page.getByRole("button", { name: /Crea fornitore/ }).click();
  await expect(page).toHaveURL(/\/admin\/fornitori\/[^/]+\?creato=1/);
  return { id: new URL(page.url()).pathname.split("/").pop()!, slug };
}

/** Creates an active business-only gas offer for `supplierId`. Returns the offer id. */
async function createGasOffer(page: Page, supplierId: string, name: string, featured = false): Promise<string> {
  await page.goto("/admin/offerte/nuova");
  await page.locator("[name=supplier_id]").selectOption(supplierId);
  await page.locator("[name=name]").fill(name);
  await page.locator("[name=commodity]").selectOption("gas");
  await page.locator("[name=customer_type]").selectOption("business");
  await page.locator("[name=energy_price]").fill("0,0100");
  await page.locator("[name=other_variable_costs]").fill("0");
  await page.locator("[name=fixed_fee]").fill("1");
  await page.locator("[name=fixed_fee_period]").selectOption("month");
  await page.locator("[name=locked_months]").fill("12");
  if (featured) await page.locator("[name=featured]").check();
  await page.getByRole("button", { name: "Crea offerta" }).click();
  await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

const offerRow = (page: Page, id: string) => page.locator(`[data-testid="offer-row"][data-offer-id="${id}"]`);
const supplierRow = (page: Page, slug: string) => page.locator(`[data-testid="supplier-row"][data-slug="${slug}"]`);
const leadItems = (page: Page) => page.locator('[data-testid="lead-item"]:visible');
const leadListUrl = (surname: string) => `/admin/leads?tab=tutti&q=${surname}`;

async function deleteOfferFromList(page: Page, id: string) {
  await page.goto("/admin/offerte?vista=tutte");
  await offerRow(page, id).getByTestId("delete-offer").click();
  await page.getByTestId("confirm-dialog-confirm").click();
  await expect(page.getByTestId("deleted-notice")).toBeVisible();
  await expect(offerRow(page, id)).toHaveCount(0);
}

/** Removes the leads of a surname (own fixtures) through the admin bulk action. */
async function deleteLeadsOf(page: Page, surname: string) {
  await page.goto(leadListUrl(surname));
  if ((await leadItems(page).count()) === 0) return;
  await page.getByTestId("lead-select-all").check();
  await page.getByTestId("lead-bulk-delete").click();
  await page.getByTestId("confirm-dialog-confirm").click();
  await expect(page.getByTestId("lead-empty")).toBeVisible();
}

/** Opens the (single) lead of a unique surname in the admin detail page. */
async function openLeadDetail(page: Page, surname: string) {
  await page.goto(leadListUrl(surname));
  await expect(leadItems(page)).toHaveCount(1);
  await leadItems(page)
    .first()
    .getByRole("link", { name: new RegExp(surname) })
    .click();
  await expect(page).toHaveURL(/\/admin\/leads\/[^/?]+$/);
}

/** Seeds a Partita IVA gas flow in sessionStorage and opens the public results (no loading delay). */
async function openPublicResults(page: Page, path = "/offerte?fast=1") {
  await page.evaluate(
    ([key, value]) => {
      window.sessionStorage.setItem(key, value);
      // A previous visit marks the comparison as "already loaded": forget it so the loading screen shows.
      window.sessionStorage.removeItem("versus.results.loaded.v1");
    },
    [
      FLOW_KEY,
      JSON.stringify({
        version: 1,
        commodity: "gas",
        customerType: "business",
        serviceType: "cambio_fornitore",
        currentSupplierGas: "eni-plenitude",
        hasGas: true,
        manualConsumption: true,
        manualSmcYear: 720,
        estimatedSmcYear: 720,
      }),
    ],
  );
  await page.goto(path);
}

/** Customer flow, Page 1 (Partita IVA, gas, Milano) up to the results page. Returns the lead's surname. */
async function runPage1BusinessGas(page: Page, currentSupplierGas: string): Promise<string> {
  const surname = `Cross${rand()}`;
  await openPage1(page);
  await pick(page, "commodity-gas", "customer-business", "service-cambio");
  await page.getByTestId("company-name").fill(`Cross ${surname} Srl`);
  await page.getByTestId("first-name").fill("Carlo");
  await page.getByTestId("last-name").fill(surname);
  await page.getByTestId("phone").fill(`3${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`);
  await chooseComune(page, "Milano");
  await page.getByTestId("manual-smc").fill("720");
  await page.getByTestId("supplier-gas").selectOption(currentSupplierGas);
  const created = page.waitForResponse((r) => r.url().endsWith("/api/lead") && r.request().method() === "POST");
  await page.getByTestId("privacy-consent").check();
  expect((await created).status()).toBe(201);
  const patched = page.waitForResponse((r) => r.url().endsWith("/api/lead") && r.request().method() === "PATCH");
  await page.getByTestId("submit").click();
  expect((await patched).status()).toBe(200);
  await page.waitForURL(/\/offerte$/);
  return surname;
}

test.describe("deletions across admin and customer flow", () => {
  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => {
      throw new Error(`Unexpected native dialog: ${d.message()}`);
    });
  });

  test("a. deleting an offer keeps the lead's copy of it visible in the lead detail", async ({ page }, info) => {
    await login(page);
    const offerName = unique("Offerta scelta", info);
    const offerId = await createGasOffer(page, "iren", offerName, true);
    let surname: string | null = null;
    try {
      // Real customer flow: Page 1 -> results -> choose THAT offer -> activation (lead = offer_chosen).
      surname = await runPage1BusinessGas(page, "eni-plenitude");
      const card = page.locator(`[data-testid="offer-card"][data-offer-id="${offerId}"]`);
      await expect(card).toBeVisible({ timeout: 20_000 });
      // Other (featured) offers may come first: only locate our own card, never rely on global order.
      await card.scrollIntoViewIfNeeded();
      await card.getByTestId("offer-cta").click();
      await page.getByTestId("offer-modal-cta").click();
      await page.waitForURL(/\/attivazione$/);

      // The admin sees the live offer.
      await openLeadDetail(page, surname);
      const offer = page.getByTestId("offer-gas");
      await expect(offer).toContainText(offerName);
      await expect(offer).not.toHaveAttribute("data-deleted", "true");
      const liveLabel = ((await offer.textContent()) ?? "").trim(); // "<supplier> — <offer>"
      expect(liveLabel).toMatch(/ — /);
      const leadUrl = page.url();

      // Delete the offer: it disappears from the admin list and from customers...
      await deleteOfferFromList(page, offerId);
      await openPublicResults(page);
      await expect(page.getByTestId("offer-card").first()).toBeVisible();
      await expect(page.locator(`[data-offer-id="${offerId}"]`)).toHaveCount(0);

      // ...but the lead keeps a copy.
      await page.goto(leadUrl);
      const kept = page.getByTestId("offer-gas");
      await expect(kept).toHaveAttribute("data-deleted", "true");
      await expect(kept).toContainText(`Offerta eliminata: ${liveLabel}`);
      await expect(page.getByTestId("group-offerte")).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: `${SHOTS}/admin-deletions-lead-snapshot-${info.project.name}.png`, fullPage: true });
    } finally {
      await page.goto("/admin/offerte?vista=tutte");
      if ((await offerRow(page, offerId).count()) > 0) await deleteOfferFromList(page, offerId);
      if (surname) await deleteLeadsOf(page, surname);
    }
  });

  test("b. deleting a supplier removes it and its offers for customers; leads keep its name", async ({ page }, info) => {
    await login(page);
    const supplierName = unique("Fornitore Cross", info);
    const offerName = unique("Offerta Cross", info);
    const { id: supplierId, slug } = await createSupplier(page, supplierName, { showInDropdown: true, logo: true });
    let surname: string | null = null;
    let deleted = false;
    try {
      const offerId = await createGasOffer(page, supplierId, offerName);

      // Before: the offer is in the results, the supplier in the loading marquee and in the dropdown.
      await openPublicResults(page);
      await expect(page.locator(`[data-testid="offer-card"][data-offer-id="${offerId}"]`)).toBeVisible();
      await openPublicResults(page, "/offerte");
      await expect(page.getByTestId("loading-screen")).toBeVisible();
      await expect(page.locator(`[data-testid="loading-supplier"][data-supplier-id="${supplierId}"]`)).toHaveCount(1);
      await openPage1(page);
      await pick(page, "commodity-gas", "customer-business");
      await expect(page.locator(`[data-testid="supplier-gas"] option[value="${supplierId}"]`)).toHaveCount(1);

      // A lead whose CURRENT supplier is the new supplier.
      surname = await runPage1BusinessGas(page, supplierId);
      // Forget the lead cookie: the seeded flows below must not PATCH this lead (the results page updates it).
      await page.context().clearCookies({ name: "versus_lead" });
      await openLeadDetail(page, surname);
      const leadUrl = page.url();
      await expect(page.getByTestId("group-fornitura")).toContainText(supplierName);
      await expect(page.getByTestId("group-fornitura")).not.toContainText("(fornitore eliminato)");

      // Delete the supplier (its offer goes too).
      await page.goto("/admin/fornitori");
      await expect(supplierRow(page, slug)).toHaveAttribute("data-offers", "1");
      await supplierRow(page, slug).getByTestId("delete-supplier").click();
      await expect(page.getByTestId("delete-supplier-offers")).toHaveText(
        "Questo fornitore ha 1 offerta: verrà eliminata anche l'offerta.",
      );
      await page.getByTestId("confirm-dialog-confirm").click();
      await expect(page.getByTestId("deleted-banner")).toContainText(`Fornitore «${supplierName}» eliminato.`);
      deleted = true;
      await expect(supplierRow(page, slug)).toHaveCount(0);

      // After: gone from results, loading marquee and dropdown.
      await openPublicResults(page);
      await expect(page.getByTestId("offer-card").first()).toBeVisible();
      await expect(page.locator(`[data-offer-id="${offerId}"]`)).toHaveCount(0);
      await expect(page.getByText(offerName)).toHaveCount(0);
      await openPublicResults(page, "/offerte");
      await expect(page.getByTestId("loading-screen")).toBeVisible();
      await expect(page.getByTestId("loading-supplier").first()).toBeVisible();
      await expect(page.locator(`[data-testid="loading-supplier"][data-supplier-id="${supplierId}"]`)).toHaveCount(0);
      await openPage1(page);
      await pick(page, "commodity-gas", "customer-business");
      await expect(page.getByTestId("supplier-gas")).toBeVisible();
      await expect(page.locator(`[data-testid="supplier-gas"] option[value="${supplierId}"]`)).toHaveCount(0);

      // The old lead keeps the supplier's name.
      await page.goto(leadUrl);
      await expect(page.getByTestId("group-fornitura")).toContainText(`${supplierName} (fornitore eliminato)`);
      await noOverflow(page);
      await page.screenshot({ path: `${SHOTS}/admin-deletions-lead-supplier-${info.project.name}.png`, fullPage: true });
    } finally {
      if (!deleted) {
        // Failure path: remove the fixtures anyway (offers first: the supplier delete does both).
        await page.goto("/admin/fornitori");
        if ((await supplierRow(page, slug).count()) > 0) {
          await supplierRow(page, slug).getByTestId("delete-supplier").click();
          await page.getByTestId("confirm-dialog-confirm").click();
          await expect(page.getByTestId("deleted-banner")).toBeVisible();
        }
      }
      if (surname) await deleteLeadsOf(page, surname);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// c. Server actions called without an admin session.

interface CapturedAction {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** Captures the server-action POST fired by `trigger` (header Next-Action) so it can be replayed. */
async function captureAction(page: Page, trigger: () => Promise<void>): Promise<CapturedAction> {
  const request = page.waitForRequest((r) => r.method() === "POST" && !!r.headers()["next-action"]);
  await trigger();
  const r = await request;
  const h = r.headers();
  const headers: Record<string, string> = {};
  for (const k of ["next-action", "content-type", "accept", "next-router-state-tree"]) if (h[k]) headers[k] = h[k];
  return { url: r.url(), headers, body: r.postData() ?? "" };
}

/** Replays a captured action against another target id, with the given request context. */
async function replay(ctx: APIRequestContext, base: string, a: CapturedAction, fromId: string, toId: string) {
  expect(a.body).toContain(fromId);
  return ctx.post(a.url, {
    headers: { ...a.headers, origin: base },
    data: a.body.split(fromId).join(toId),
    maxRedirects: 0,
    failOnStatusCode: false,
  });
}

async function createLeadViaApi(
  baseURL: string,
  playwright: PlaywrightWorkerArgs["playwright"],
  surname: string,
  first_name: string,
): Promise<void> {
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const ctx = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL, "x-forwarded-for": ip },
  });
  const res = await ctx.post("/api/lead", { data: { data: page1Data({ first_name, last_name: surname }) } });
  expect(res.status(), await res.text()).toBeLessThan(300);
  await ctx.dispose();
}

async function leadId(page: Page, surname: string, first: string): Promise<string> {
  await page.goto(leadListUrl(surname));
  const link = leadItems(page).filter({ hasText: first }).getByRole("link", { name: new RegExp(surname) }).first();
  const href = await link.getAttribute("href");
  return href!.split("/").pop()!;
}

test.describe("delete server actions without an admin session", () => {
  test("c. leads: a captured delete action replayed without cookies deletes nothing", async ({ page, playwright }, info) => {
    const base = String(info.project.use.baseURL);
    await login(page);
    const surname = `Cross${rand()}`;
    await createLeadViaApi(base, playwright, surname, "Anna");
    await createLeadViaApi(base, playwright, surname, "Bruno");
    try {
      const idA = await leadId(page, surname, "Anna");
      const idB = await leadId(page, surname, "Bruno");

      // Delete Anna from the UI and capture the real server-action request.
      await page.goto(leadListUrl(surname));
      const action = await captureAction(page, async () => {
        await leadItems(page).filter({ hasText: "Anna" }).getByTestId("lead-row-delete").click();
        await page.getByTestId("confirm-dialog-confirm").click();
      });
      await expect(leadItems(page)).toHaveCount(1);

      // Fresh context, NO cookies: the same request aimed at Bruno must not delete him.
      const anonymous = await playwright.request.newContext({ baseURL: base });
      const rejected = await replay(anonymous, base, action, idA, idB);
      expect(rejected.status(), "the anonymous replay is answered, not crashing the server").toBeLessThan(500);
      await anonymous.dispose();
      expect((await page.goto(`/admin/leads/${idB}`))?.status(), "Bruno still exists").toBe(200);

      // Positive control: the very same replay WITH the admin session does delete him.
      const accepted = await replay(page.request, base, action, idA, idB);
      expect(accepted.status()).toBeLessThan(500);
      await expect.poll(async () => (await page.goto(`/admin/leads/${idB}`))?.status()).toBe(404);
    } finally {
      await deleteLeadsOf(page, surname);
    }
  });

  test("c. offers: a captured delete action replayed without cookies deletes nothing", async ({ page, playwright }, info) => {
    const base = String(info.project.use.baseURL);
    await login(page);
    const idA = await createGasOffer(page, "iren", unique("Offerta Anon A", info));
    const idB = await createGasOffer(page, "iren", unique("Offerta Anon B", info));
    try {
      await page.goto("/admin/offerte?vista=tutte");
      const action = await captureAction(page, async () => {
        await offerRow(page, idA).getByTestId("delete-offer").click();
        await page.getByTestId("confirm-dialog-confirm").click();
      });
      await expect(offerRow(page, idA)).toHaveCount(0);

      const anonymous = await playwright.request.newContext({ baseURL: base });
      const rejected = await replay(anonymous, base, action, idA, idB);
      expect(rejected.status()).toBeLessThan(500);
      await anonymous.dispose();
      await page.goto("/admin/offerte?vista=tutte");
      await expect(offerRow(page, idB)).toHaveCount(1);

      const accepted = await replay(page.request, base, action, idA, idB);
      expect(accepted.status()).toBeLessThan(500);
      await page.goto("/admin/offerte?vista=tutte");
      await expect(offerRow(page, idB)).toHaveCount(0);
    } finally {
      await page.goto("/admin/offerte?vista=tutte");
      for (const id of [idA, idB]) if ((await offerRow(page, id).count()) > 0) await deleteOfferFromList(page, id);
    }
  });

  test("c. suppliers: a captured delete action replayed without cookies deletes nothing", async ({ page, playwright }, info) => {
    const base = String(info.project.use.baseURL);
    await login(page);
    const a = await createSupplier(page, unique("Fornitore Anon A", info), { showInDropdown: false });
    const b = await createSupplier(page, unique("Fornitore Anon B", info), { showInDropdown: false });
    const offerB = await createGasOffer(page, b.id, unique("Offerta Anon B", info));
    try {
      await page.goto("/admin/fornitori");
      const action = await captureAction(page, async () => {
        await supplierRow(page, a.slug).getByTestId("delete-supplier").click();
        await page.getByTestId("confirm-dialog-confirm").click();
      });
      await expect(supplierRow(page, a.slug)).toHaveCount(0);

      const anonymous = await playwright.request.newContext({ baseURL: base });
      const rejected = await replay(anonymous, base, action, a.id, b.id);
      expect(rejected.status()).toBeLessThan(500);
      await anonymous.dispose();
      // Neither the supplier nor its offer was touched.
      await page.goto("/admin/fornitori");
      await expect(supplierRow(page, b.slug)).toHaveCount(1);
      await page.goto("/admin/offerte?vista=tutte");
      await expect(offerRow(page, offerB)).toHaveCount(1);

      const accepted = await replay(page.request, base, action, a.id, b.id);
      expect(accepted.status()).toBeLessThan(500);
      await page.goto("/admin/fornitori");
      await expect(supplierRow(page, b.slug)).toHaveCount(0);
      await page.goto("/admin/offerte?vista=tutte");
      await expect(offerRow(page, offerB)).toHaveCount(0);
    } finally {
      await page.goto("/admin/fornitori");
      for (const s of [a, b]) {
        if ((await supplierRow(page, s.slug).count()) > 0) {
          await supplierRow(page, s.slug).getByTestId("delete-supplier").click();
          await page.getByTestId("confirm-dialog-confirm").click();
          await expect(page.getByTestId("deleted-banner")).toBeVisible();
        }
      }
    }
  });
});
