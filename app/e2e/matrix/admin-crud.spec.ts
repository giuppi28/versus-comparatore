/**
 * T7.4 (part 2) — supplier and offer CRUD through the admin UI, and its effect on what customers see.
 * These tests change the public offers / dropdown, so they are tagged @serial: run-matrix.mjs runs them
 * alone, after the parallel phase. Everything created here has a unique name and is either deleted again
 * (Phase 11 deletions) or left DEACTIVATED and un-featured, so the mock state is restored.
 */
import { request, type Page } from "@playwright/test";
import { MOCK_OFFERS } from "../../src/lib/data/mock/data";
import type { Offer } from "../../src/lib/data/types";
import { annualFromMonthly, formatEuro, monthlyCost, rankOffers } from "../../src/lib/logic/pricing";
import { expect, test } from "./fixtures";
import { ADMIN_STATE_FILE } from "./paths";

const TAG = { tag: ["@serial", "@mobile"] };
const FLOW_KEY = "versus.flow.v1";

const CLEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect id="qa-rect" width="100" height="40" fill="#0a8045"/><circle cx="20" cy="20" r="10" fill="#fff"/></svg>`;
const MALICIOUS_SVG = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 40" onload="alert(1)">
<script>alert(document.cookie)</script>
<foreignObject width="10" height="10"><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(2)"/></body></foreignObject>
<a xlink:href="javascript:alert(3)"><rect width="100" height="40" fill="#123456" onclick="alert(4)"/></a>
<rect id="logo-rect" width="50" height="40" fill="#0a8045" style="fill:url(https://evil.example/x.svg#a)" onmouseover="alert(5)"/>
<use xlink:href="https://evil.example/s.svg#x"/>
<animate attributeName="href" values="javascript:alert(6)"/>
<image href="https://evil.example/track.png"/>
<style>@import url(https://evil.example/x.css); rect { fill: red }</style>
</svg>`;
const FORBIDDEN_IN_SVG = /<script|foreignObject|onload|onclick|onmouseover|onerror|javascript:|evil\.example|<animate|<a[\s>]|DOCTYPE|ENTITY|alert|<image[^>]*href|@import|<style/i;

const svgFile = (content: string, name = "logo.svg") => ({ name, mimeType: "image/svg+xml", buffer: Buffer.from(content, "utf8") });

async function dataUrlSvg(src: string | null): Promise<string> {
  expect(src).toMatch(/^data:image\/svg\+xml;base64,/);
  return Buffer.from(src!.split(",")[1], "base64").toString("utf8");
}

const submit = (page: Page, name: RegExp) => page.getByRole("button", { name });

test.describe("admin CRUD (suppliers, logos, offers)", () => {
  test.use({ storageState: ADMIN_STATE_FILE });
  test.describe.configure({ mode: "serial" });

  const unique = (project: string) => `${project}${Date.now().toString(36)}`;

  test("supplier: create, edit, sanitized / rejected logos, dropdown visibility, deactivate", TAG, async ({ page }, testInfo) => {
    const suffix = unique(testInfo.project.name);
    const name = `QA Energia ${suffix}`;
    const slug = `qa-energia-${suffix}`;

    await page.goto("/admin/fornitori");
    await expect(page.getByRole("heading", { name: "Fornitori" })).toBeVisible();
    await page.getByRole("link", { name: "Nuovo fornitore" }).click();

    // Validation: empty form, duplicate slug.
    await submit(page, /Crea fornitore/).click();
    await expect(page.getByTestId("form-error")).toHaveText("Controlla i campi evidenziati.");
    await expect(page.getByText("Inserisci il nome del fornitore.")).toBeVisible();
    await page.getByLabel("Nome").fill(name);
    await expect(page.getByLabel("Slug")).toHaveValue(slug);
    await page.getByLabel("Slug").fill("enel-energia");
    await submit(page, /Crea fornitore/).click();
    await expect(page.getByText("Questo slug è già in uso.")).toBeVisible();
    await page.getByLabel("Slug").fill(slug);

    // Create: visible in the customer's "Fornitore attuale" dropdown (luce + gas, shown, active).
    await page.getByLabel("Vende gas").check();
    await submit(page, /Crea fornitore/).click();
    await expect(page).toHaveURL(/\/admin\/fornitori\/[^/]+\?creato=1/);
    await expect(page.getByTestId("created-banner")).toContainText("Fornitore creato.");
    const editUrl = page.url().split("?")[0];
    const supplierId = new URL(editUrl).pathname.split("/").pop()!;
    expect(supplierId.length).toBeGreaterThan(3);

    const dropdown = async () => {
      await page.goto("/");
      await expect(page.getByTestId("page1-form")).toHaveAttribute("data-hydrated", "true");
      await page.getByTestId("customer-casa").locator("button").click();
      await page.getByTestId("commodity-dual").locator("button").click();
      await page.getByTestId("service-cambio").locator("button").click();
      return {
        luce: await page.getByTestId("supplier-luce").locator("option").allTextContents(),
        gas: await page.getByTestId("supplier-gas").locator("option").allTextContents(),
      };
    };
    let options = await dropdown();
    expect(options.luce).toContain(name);
    expect(options.gas).toContain(name);

    // Edit: flags, name, sort order (persisted).
    await page.goto(editUrl);
    await page.getByLabel("Vende gas").uncheck();
    await page.getByLabel("Ordine di visualizzazione").fill("77");
    await page.getByLabel("Nome").fill(`${name} SpA`);
    await submit(page, /Salva modifiche/).click();
    await expect(page.getByTestId("form-success")).toContainText("Fornitore salvato.");
    await page.goto(editUrl);
    await expect(page.getByLabel("Nome")).toHaveValue(`${name} SpA`);
    await expect(page.getByLabel("Vende gas")).not.toBeChecked();
    await expect(page.getByLabel("Ordine di visualizzazione")).toHaveValue("77");
    options = await dropdown();
    expect(options.luce).toContain(`${name} SpA`);
    expect(options.gas).not.toContain(`${name} SpA`); // no longer sells gas

    // Logo rejections: wrong type and oversize on the client, not-an-SVG on the server.
    await page.goto(editUrl);
    const logo = page.locator("#logo");
    await logo.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from("png") });
    await expect(page.getByTestId("logo-error")).toHaveText("Carica un file in formato SVG.");
    await logo.setInputFiles(svgFile(`<svg xmlns="http://www.w3.org/2000/svg">${" ".repeat(210_000)}</svg>`));
    await expect(page.getByTestId("logo-error")).toHaveText("Il file supera il limite di 200 KB.");
    await logo.setInputFiles(svgFile("<html><body><script>alert(1)</script></body></html>", "finto.svg"));
    await submit(page, /Salva modifiche/).click();
    await expect(page.getByTestId("logo-error")).toContainText("Il file non è un SVG");
    // Nothing was stored for the rejected file.
    await page.goto(editUrl);
    await expect(page.locator('[data-testid="logo-preview"] img')).toHaveCount(0);

    // Clean logo is stored; malicious logo is sanitized (shapes kept, everything dangerous removed).
    const logo2 = page.locator("#logo");
    await logo2.setInputFiles(svgFile(CLEAN_SVG));
    await submit(page, /Salva modifiche/).click();
    await expect(page.getByTestId("form-notice")).toHaveText("Logo aggiornato.");
    const clean = await dataUrlSvg(await page.locator('[data-testid="logo-preview"] img').getAttribute("src"));
    expect(clean).toContain('id="qa-rect"');

    await logo2.setInputFiles(svgFile(MALICIOUS_SVG, "malevolo.svg"));
    await submit(page, /Salva modifiche/).click();
    await expect(page.getByTestId("form-notice")).toContainText("Il logo è stato ripulito automaticamente");
    const sanitized = await dataUrlSvg(await page.locator('[data-testid="logo-preview"] img').getAttribute("src"));
    expect(sanitized).toContain('id="logo-rect"');
    expect(sanitized).not.toMatch(FORBIDDEN_IN_SVG);
    await page.goto(editUrl);
    expect(await dataUrlSvg(await page.locator('[data-testid="logo-preview"] img').getAttribute("src"))).toBe(sanitized);

    // The logo shows in the admin list.
    await page.goto("/admin/fornitori");
    const row = page.locator(`[data-testid="supplier-row"][data-slug="${slug}"]`);
    await expect(row).toContainText(`${name} SpA`);
    await expect(row.locator("img")).toBeVisible();

    // Deactivate: stays in the admin list (flagged), disappears from the customer dropdown.
    await page.goto(editUrl);
    await page.getByLabel("Attivo").uncheck();
    await submit(page, /Salva modifiche/).click();
    await expect(page.getByTestId("form-success")).toBeVisible();
    await page.goto("/admin/fornitori");
    await expect(page.locator(`[data-testid="supplier-row"][data-slug="${slug}"]`)).toHaveAttribute("data-active", "false");
    options = await dropdown();
    expect(options.luce).not.toContain(`${name} SpA`);
  });

  test("offers: create -> customers see it in the right position -> edit price -> feature -> business-only -> deactivate", TAG, async ({ page, context }, testInfo) => {
    const suffix = unique(testInfo.project.name);
    const supplierName = `QA Offerte ${suffix}`;
    const offerName = `QA Luce Prova ${suffix}`;

    // A throw-away supplier with a (sanitized) logo, so the logo of the offer card can be checked too.
    await page.goto("/admin/fornitori/nuovo");
    await page.getByLabel("Nome").fill(supplierName);
    await page.getByLabel(/Mostra nell'elenco/).uncheck();
    await page.locator("#logo").setInputFiles(svgFile(MALICIOUS_SVG, "logo.svg"));
    await submit(page, /Crea fornitore/).click();
    await expect(page).toHaveURL(/\/admin\/fornitori\/[^/]+\?creato=1/);
    const supplierId = new URL(page.url()).pathname.split("/").pop()!;

    // The public side: a second page of the same context with a seeded Casa / Luce comparison.
    const pub = await context.newPage();
    await pub.route("**/api/lead", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
    const seedPublic = async (customerType: "casa" | "business") => {
      await pub.addInitScript(
        ([key, value]) => window.sessionStorage.setItem(key, value),
        [
          FLOW_KEY,
          JSON.stringify({
            version: 1,
            commodity: "luce",
            customerType,
            serviceType: "cambio_fornitore",
            currentSupplierLuce: "edison-energia", // the featured seed offer is excluded
            manualConsumption: customerType === "business",
            manualKwhYear: customerType === "business" ? 2700 : null,
            estimatedKwhYear: 2700,
          }),
        ],
      );
    };
    await seedPublic("casa");
    const openPublic = async () => {
      await pub.goto("/offerte?fast=1");
      await expect(pub.getByTestId("offer-card").first()).toBeVisible();
    };
    const publicIds = () => pub.getByTestId("offer-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-offer-id")!));

    // ---- create (expensive, not featured) ----
    await page.goto("/admin/offerte/nuova");
    await page.locator("[name=supplier_id]").selectOption(supplierId);
    await page.locator("[name=name]").fill(offerName);
    await page.locator("[name=commodity]").selectOption("luce");
    await page.locator("[name=customer_type]").selectOption("casa");
    await page.locator("[name=energy_price]").fill("0,3000");
    await page.locator("[name=other_variable_costs]").fill("0,06");
    await page.locator("[name=fixed_fee]").fill("20");
    await page.locator("[name=fixed_fee_period]").selectOption("month");
    await page.locator("[name=locked_months]").fill("18");
    await page.locator("[name=promo_text]").fill("Sconto QA primo anno");
    await page.getByRole("button", { name: "Aggiungi vantaggio" }).click();
    await page.locator("input[name=advantages]").first().fill("Vantaggio **uno** di prova");
    await page.getByRole("button", { name: "Aggiungi vantaggio" }).click();
    await page.locator("input[name=advantages]").last().fill("Vantaggio due di prova");
    await submit(page, /Crea offerta/).click();
    await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
    const offerId = new URL(page.url()).pathname.split("/").pop()!;

    const made = (over: Partial<Offer>): Offer => ({
      id: offerId,
      supplier_id: supplierId,
      name: offerName,
      commodity: "luce",
      customer_type: "casa",
      price_type: "fixed",
      energy_price: 0.3,
      other_variable_costs: 0.06,
      fixed_fee_monthly: 20,
      other_fixed_costs_monthly: 0,
      locked_months: 18,
      activation_cost: 0,
      promo_text: "Sconto QA primo anno",
      advantages: [],
      details: null,
      featured: false,
      active: true,
      price_verified: false,
      updated_at: "",
      ...over,
    });
    const luceOffers = MOCK_OFFERS.filter((o) => o.commodity === "luce");
    const expectedIds = (offer: Offer) =>
      rankOffers([...luceOffers, offer], annualFromMonthly(225), { excludeSupplierId: "edison-energia" }).map((r) => r.offer.id);
    const cleanup = async () => {
      await page.goto("/admin/offerte?vista=tutte");
      const r = page.locator(`[data-testid="offer-row"][data-offer-id="${offerId}"]`);
      if ((await r.getAttribute("data-featured")) === "true") await r.getByTestId("toggle-featured").click();
      await expect(r).toHaveAttribute("data-featured", "false");
      if ((await r.getAttribute("data-active")) === "true") await r.getByTestId("toggle-active").click();
      await expect(r).toHaveAttribute("data-active", "false");
    };

    try {
      // ---- customers see it: last (expensive), correct cost, logo sanitized, promo ----
      await openPublic();
      const mine = pub.locator(`[data-testid="offer-card"][data-offer-id="${offerId}"]`);
      await expect(mine).toBeVisible();
      expect(await publicIds()).toEqual(expectedIds(made({})));
      expect((await publicIds()).at(-1)).toBe(offerId);
      const cost = monthlyCost(made({}), annualFromMonthly(225));
      await expect(mine.getByTestId("offer-monthly")).toHaveText(formatEuro(cost));
      await expect(mine.getByTestId("offer-name")).toHaveText(offerName);
      await expect(mine.getByTestId("offer-locked")).toHaveText("Bloccato 18 mesi");
      await expect(mine.getByTestId("offer-promo")).toContainText("Sconto QA primo anno");
      const publicLogo = await dataUrlSvg(await mine.getByTestId("offer-logo").locator("img").getAttribute("src"));
      expect(publicLogo).not.toMatch(FORBIDDEN_IN_SVG);
      expect(publicLogo).toContain("logo-rect");

      // The modal lists the advantages from the database, in order, with bold words.
      await mine.getByTestId("offer-cta").click();
      const items = pub.getByRole("dialog").getByTestId("offer-modal-advantages").locator("li");
      await expect(items).toHaveCount(2);
      await expect(items.nth(0)).toHaveText("Vantaggio uno di prova");
      await expect(items.nth(0).locator("strong")).toHaveText("uno");
      await expect(items.nth(1)).toHaveText("Vantaggio due di prova");
      await pub.getByRole("dialog").getByRole("button", { name: /chiudi/i }).first().click();

      // ---- edit the price (cheap): moves to the first place among non-featured, cost follows ----
      await page.goto(`/admin/offerte/${offerId}`);
      await page.locator("[name=energy_price]").fill("0,0500");
      await submit(page, /Salva modifiche/).click();
      await page.waitForURL(/\?esito=salvata$/);
      await openPublic();
      const cheap = made({ energy_price: 0.05 });
      expect(await publicIds()).toEqual(expectedIds(cheap));
      expect((await publicIds())[0]).toBe(offerId);
      await expect(mine.getByTestId("offer-monthly")).toHaveText(formatEuro(monthlyCost(cheap, annualFromMonthly(225))));

      // ---- back to expensive, then featured: first despite the cost, with the band ----
      await page.goto(`/admin/offerte/${offerId}`);
      await page.locator("[name=energy_price]").fill("0,3000");
      await submit(page, /Salva modifiche/).click();
      await page.waitForURL(/\?esito=salvata$/);
      await page.goto("/admin/offerte");
      const row = page.locator(`[data-testid="offer-row"][data-offer-id="${offerId}"]`);
      await row.getByTestId("toggle-featured").click();
      await expect(row).toHaveAttribute("data-featured", "true");
      await openPublic();
      expect(await publicIds()).toEqual(expectedIds(made({ featured: true })));
      expect((await publicIds())[0]).toBe(offerId);
      await expect(mine).toHaveAttribute("data-featured", "true");
      await expect(mine.getByTestId("offer-featured-band")).toHaveText("In evidenza");

      // un-feature: back to the last place
      await row.getByTestId("toggle-featured").click();
      await expect(row).toHaveAttribute("data-featured", "false");
      await openPublic();
      expect((await publicIds()).at(-1)).toBe(offerId);

      // ---- customer type: casa-only offer is invisible to a Partita IVA, visible once set to "both" ----
      const business = await context.newPage();
      await business.route("**/api/lead", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
      await business.addInitScript(
        ([key, value]) => window.sessionStorage.setItem(key, value),
        [FLOW_KEY, JSON.stringify({ version: 1, commodity: "luce", customerType: "business", serviceType: "cambio_fornitore", currentSupplierLuce: "edison-energia", manualConsumption: true, manualKwhYear: 2700, estimatedKwhYear: 2700 })],
      );
      await business.goto("/offerte?fast=1");
      await expect(business.getByTestId("offer-card").first()).toBeVisible();
      await expect(business.locator(`[data-offer-id="${offerId}"]`)).toHaveCount(0);
      await page.goto(`/admin/offerte/${offerId}`);
      await page.locator("[name=customer_type]").selectOption("both");
      await submit(page, /Salva modifiche/).click();
      await page.waitForURL(/\?esito=salvata$/);
      await business.goto("/offerte?fast=1");
      await expect(business.locator(`[data-offer-id="${offerId}"]`)).toHaveCount(1);
      await business.close();

      // ---- deactivate: gone for customers, still in the admin "Tutte" view ----
      await page.goto("/admin/offerte");
      await row.getByTestId("toggle-active").click();
      await expect(row).toHaveCount(0); // the default admin view lists what customers see
      await openPublic();
      await expect(pub.locator(`[data-offer-id="${offerId}"]`)).toHaveCount(0);
      expect(await publicIds()).toEqual(expectedIds(made({ active: false })).filter((id) => id !== offerId));
      await page.goto("/admin/offerte?vista=tutte");
      await expect(page.locator(`[data-testid="offer-row"][data-offer-id="${offerId}"]`)).toHaveAttribute("data-active", "false");
      // ... and reactivation brings it back.
      const inactiveRow = page.locator(`[data-testid="offer-row"][data-offer-id="${offerId}"]`);
      await inactiveRow.getByTestId("toggle-active").click();
      await expect(inactiveRow).toHaveAttribute("data-active", "true");
      await openPublic();
      await expect(pub.locator(`[data-offer-id="${offerId}"]`)).toHaveCount(1);
    } finally {
      await cleanup();
      // Also deactivate the throw-away supplier.
      await page.goto(`/admin/fornitori/${supplierId}`);
      await page.getByLabel("Attivo").uncheck();
      await submit(page, /Salva modifiche/).click();
      await expect(page.getByTestId("form-success")).toBeVisible();
    }

    // Final state: nothing of ours is visible to customers.
    await openPublic();
    await expect(pub.locator(`[data-offer-id="${offerId}"]`)).toHaveCount(0);
    expect(await publicIds()).toEqual(rankOffers(luceOffers, annualFromMonthly(225), { excludeSupplierId: "edison-energia" }).map((r) => r.offer.id));
  });

  test("deletions: an offer, then a supplier with offers, disappear for customers; placeholders are protected", TAG, async ({ page }, testInfo) => {
    const suffix = unique(testInfo.project.name);
    const supplierName = `QA Cancellabile ${suffix}`;
    page.on("dialog", (d) => {
      throw new Error(`Unexpected native dialog: ${d.message()}`);
    });

    // Supplier + two offers (luce, Casa).
    await page.goto("/admin/fornitori/nuovo");
    await page.getByLabel("Nome").fill(supplierName);
    const slug = await page.getByLabel("Slug").inputValue();
    await submit(page, /Crea fornitore/).click();
    await expect(page).toHaveURL(/\/admin\/fornitori\/[^/]+\?creato=1/);
    const supplierId = new URL(page.url()).pathname.split("/").pop()!;
    try {
      const offerIds: string[] = [];
      for (const n of ["A", "B"]) {
        await page.goto("/admin/offerte/nuova");
        await page.locator("[name=supplier_id]").selectOption(supplierId);
        await page.locator("[name=name]").fill(`QA Offerta ${n} ${suffix}`);
        await page.locator("[name=commodity]").selectOption("luce");
        await page.locator("[name=customer_type]").selectOption("casa");
        await page.locator("[name=energy_price]").fill("0,0900");
        await page.locator("[name=fixed_fee]").fill("5");
        await page.locator("[name=fixed_fee_period]").selectOption("month");
        await page.locator("[name=locked_months]").fill("12");
        await submit(page, /Crea offerta/).click();
        await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
        offerIds.push(new URL(page.url()).pathname.split("/").pop()!);
      }
      // Seed the flow before every document (a late hydration of Page 1 could overwrite a one-off write).
      await page.addInitScript(
        ([key, value]) => window.sessionStorage.setItem(key, value),
        [FLOW_KEY, JSON.stringify({ version: 1, commodity: "luce", customerType: "casa", serviceType: "cambio_fornitore", currentSupplierLuce: "edison-energia", estimatedKwhYear: 2700 })],
      );
      const publicOfferIds = async () => {
        await page.goto("/offerte?fast=1");
        await expect(page.getByTestId("offer-card").first()).toBeVisible();
        return page.getByTestId("offer-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-offer-id")));
      };
      expect(await publicOfferIds()).toEqual(expect.arrayContaining(offerIds));

      // Offer A: cancel keeps it, confirm removes it (B stays).
      await page.goto("/admin/offerte");
      const row = (id: string) => page.locator(`[data-testid="offer-row"][data-offer-id="${id}"]`);
      await row(offerIds[0]).getByTestId("delete-offer").click();
      await page.getByTestId("confirm-dialog-cancel").click();
      await expect(row(offerIds[0])).toHaveCount(1);
      await row(offerIds[0]).getByTestId("delete-offer").click();
      await page.getByTestId("confirm-dialog-confirm").click();
      await expect(page.getByTestId("deleted-notice")).toHaveText("Offerta eliminata.");
      await expect(row(offerIds[0])).toHaveCount(0);
      const afterOffer = await publicOfferIds();
      expect(afterOffer).not.toContain(offerIds[0]);
      expect(afterOffer).toContain(offerIds[1]);

      // Supplier: the dialog counts the remaining offer, confirm removes supplier and offer.
      await page.goto("/admin/fornitori");
      const supplierRow = page.locator(`[data-testid="supplier-row"][data-slug="${slug}"]`);
      await supplierRow.getByTestId("delete-supplier").click();
      await expect(page.getByTestId("delete-supplier-offers")).toHaveText("Questo fornitore ha 1 offerta: verrà eliminata anche l'offerta.");
      await page.getByTestId("confirm-dialog-confirm").click();
      await expect(page.getByTestId("deleted-banner")).toContainText(`Fornitore «${supplierName}» eliminato.`);
      await expect(supplierRow).toHaveCount(0);
      expect(await publicOfferIds()).not.toContain(offerIds[1]);
      expect((await page.goto(`/admin/offerte/${offerIds[1]}`))?.status()).toBe(404);

      // Placeholder suppliers (Tutela / Altro fornitore / Non lo so) cannot be deleted from the UI.
      await page.goto("/admin/fornitori");
      for (const placeholder of ["tutela", "altro-fornitore"]) {
        const r = page.locator(`[data-testid="supplier-row"][data-slug="${placeholder}"]`);
        await expect(r).toBeVisible();
        await expect(r.getByTestId("delete-supplier")).toHaveCount(0);
      }
  
    } finally {
      // Failure path: the supplier delete removes its offers too, so no fixture leaks into later tests.
      await page.goto("/admin/fornitori");
      const leftover = page.locator(`[data-testid="supplier-row"][data-slug="${slug}"]`);
      if ((await leftover.count()) > 0) {
        await leftover.getByTestId("delete-supplier").click();
        await page.getByTestId("confirm-dialog-confirm").click();
        await expect(page.getByTestId("deleted-banner")).toBeVisible();
      }
    }
  });

  test("offers: invalid input is refused and the form is protected", TAG, async ({ page }) => {
    await page.goto("/admin/offerte/nuova");
    await submit(page, /Crea offerta/).click();
    await expect(page.getByTestId("form-error")).toHaveText("Controlla i campi evidenziati.");
    await expect(page.getByText("Seleziona un fornitore.")).toBeVisible();
    await expect(page.getByText("Inserisci il nome dell'offerta.")).toBeVisible();
    await page.locator("[name=supplier_id]").selectOption("iren");
    await page.locator("[name=name]").fill("x");
    await page.locator("[name=energy_price]").fill("abc");
    await page.locator("[name=fixed_fee]").fill("-3");
    await page.locator("[name=locked_months]").fill("0");
    await submit(page, /Crea offerta/).click();
    await expect(page.getByText("Prezzo energia: inserisci un numero (es. 0,1290).")).toBeVisible();
    await expect(page.getByText("I mesi di blocco devono essere tra 1 e 120.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/offerte\/nuova$/);

    // Explicitly empty storage: request.newContext() would otherwise inherit the admin session of test.use().
    const anonymous = await request.newContext({ baseURL: String(test.info().project.use.baseURL), storageState: { cookies: [], origins: [] } });
    const res = await anonymous.get("/admin/offerte/nuova", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    await anonymous.dispose();
  });
});
