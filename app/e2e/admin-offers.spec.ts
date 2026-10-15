import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { formatEuro, monthlyCost } from "../src/lib/logic/pricing";

// Must match the webServer env in playwright.config.ts (mock auth, test-only).
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const SHOTS = "e2e/screenshots";

// Both projects run in parallel against ONE mock server: every test uses offers it creates
// itself (unique names) and leaves them deactivated and unfeatured. Seeded offers are never touched.
test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  await page.waitForURL((url) => url.pathname === "/admin");
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const uniqueName = (label: string, info: TestInfo) => `E2E ${label} ${info.project.name} ${Date.now()}`;

interface NewOffer {
  name: string;
  commodity?: "luce" | "gas";
  customer?: "casa" | "business" | "both";
  price?: string;
  otherVariable?: string;
  fee?: string;
  feePeriod?: "month" | "year";
  active?: boolean;
  advantages?: string[];
}

/** Fills the "Nuova offerta" form through the UI and submits it. Returns the new offer id. */
async function createOffer(page: Page, o: NewOffer): Promise<string> {
  await page.goto("/admin/offerte/nuova");
  await page.locator("[name=supplier_id]").selectOption("iren");
  await page.locator("[name=name]").fill(o.name);
  await page.locator("[name=commodity]").selectOption(o.commodity ?? "gas");
  await page.locator("[name=customer_type]").selectOption(o.customer ?? "business");
  await page.locator("[name=energy_price]").fill(o.price ?? "0,4500");
  await page.locator("[name=other_variable_costs]").fill(o.otherVariable ?? "0,25");
  await page.locator("[name=fixed_fee]").fill(o.fee ?? "99");
  await page.locator("[name=fixed_fee_period]").selectOption(o.feePeriod ?? "year");
  await page.locator("[name=locked_months]").fill("12");
  if (o.active === false) await page.locator("[name=active]").uncheck();
  for (const text of o.advantages ?? []) {
    await page.getByRole("button", { name: "Aggiungi vantaggio" }).click();
    await page.locator("input[name=advantages]").last().fill(text);
  }
  await page.getByRole("button", { name: "Crea offerta" }).click();
  await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

const row = (page: Page, id: string) => page.locator(`[data-testid="offer-row"][data-offer-id="${id}"]`);

test.describe("admin offers", () => {
  test("requires an admin session", async ({ page }) => {
    for (const path of ["/admin/offerte", "/admin/offerte/nuova", "/admin/offerte/qualsiasi"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
  });

  test("list: filters, badges, price and quota fissa", async ({ page }, info) => {
    await login(page);
    await page.goto("/admin/offerte");
    await expect(page.getByRole("heading", { name: "Offerte", level: 1 })).toBeVisible();
    await expect(page.getByTestId("filter-visible")).toHaveAttribute("aria-current", "page");
    const rows = page.getByTestId("offer-row");
    await expect(rows.first()).toBeVisible();
    // The default view is exactly what customers see: every row is active and visible.
    const visibleFlags = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-visible")));
    expect(visibleFlags.length).toBeGreaterThanOrEqual(8);
    expect(new Set(visibleFlags)).toEqual(new Set(["true"]));
    // Other specs create and delete their own offers at the same time: compare SEEDED offers only.
    const seededVisible = (await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-offer-id") ?? ""))).filter(
      (id) => id.startsWith("offer-"),
    );
    expect(seededVisible.length).toBeGreaterThanOrEqual(8);

    const edison = row(page, "offer-edison-luce-fissa-12");
    await expect(edison).toContainText("Edison Energia");
    await expect(edison).toContainText("Luce");
    await expect(edison).toContainText("Casa e Partita IVA");
    await expect(edison.getByTestId("offer-price")).toHaveText("0,1290 €/kWh");
    await expect(edison.getByTestId("offer-fee")).toHaveText("9,00 €");
    await expect(edison.getByTestId("badge-active")).toHaveText("Attiva");
    await expect(edison.getByTestId("badge-featured")).toHaveText("In evidenza");
    await expect(edison.getByTestId("badge-verified")).toHaveText(/Da verificare|Prezzo verificato/);
    const sorgenia = row(page, "offer-sorgenia-luce-sicura-24");
    await expect(sorgenia.getByTestId("badge-featured")).toHaveCount(0);
    await expect(row(page, "offer-plenitude-gas-fisso-12").getByTestId("offer-price")).toContainText("€/Smc");

    // "Tutte" is a superset of "Visibili ai clienti".
    await page.getByTestId("filter-all").click();
    await expect(page).toHaveURL(/vista=tutte/);
    await expect(page.getByTestId("filter-all")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("offer-row").first()).toBeVisible();
    const allIds = await page.getByTestId("offer-row").evaluateAll((els) => els.map((e) => e.getAttribute("data-offer-id") ?? ""));
    for (const id of seededVisible) expect(allIds, `${id} in "Tutte"`).toContain(id);

    await noOverflow(page);
    await page.screenshot({ path: `${SHOTS}/admin-offers-${info.project.name}-list.png`, fullPage: true });
  });

  test("create with a yearly quota fissa: stored monthly, visible to customers, featured, then deactivated", async ({
    page,
  }, info) => {
    await login(page);
    const name = uniqueName("Gas annuale", info);
    await page.goto("/admin/offerte/nuova");
    await expect(page.getByTestId("price-type-info")).toContainText("Prezzo fisso monorario");

    // Live preview: 1.400 Smc/anno, IVA esclusa.
    await page.locator("[name=supplier_id]").selectOption("iren");
    await page.locator("[name=name]").fill(name);
    await page.locator("[name=commodity]").selectOption("gas");
    await page.locator("[name=customer_type]").selectOption("business");
    await expect(page.locator("label", { hasText: "Prezzo energia (€/Smc)" })).toBeVisible();
    await page.locator("[name=energy_price]").fill("0,4500");
    await page.locator("[name=other_variable_costs]").fill("0,25");
    await page.locator("[name=fixed_fee]").fill("99");
    await page.locator("[name=fixed_fee_period]").selectOption("year");
    await expect(page.locator("#" + (await page.locator("[name=fixed_fee]").getAttribute("id")) + "-hint")).toContainText(
      /8,25.*al mese/,
    );
    await page.locator("[name=locked_months]").fill("12");
    const expectedCost = monthlyCost(
      { energy_price: 0.45, other_variable_costs: 0.25, fixed_fee_monthly: 8.25, other_fixed_costs_monthly: 0 },
      1400,
    );
    await expect(page.getByTestId("cost-preview-value")).toHaveText(formatEuro(expectedCost));
    await expect(page.getByTestId("cost-preview")).toContainText("1.400 Smc/anno");

    await page.getByRole("button", { name: "Aggiungi vantaggio" }).click();
    await page.locator("input[name=advantages]").first().fill("Prezzo **bloccato** 12 mesi");
    await expect(page.getByTestId("advantage-preview").first().locator("strong")).toHaveText("bloccato");

    await page.screenshot({ path: `${SHOTS}/admin-offers-${info.project.name}-form.png`, fullPage: true });
    await noOverflow(page);
    await page.getByRole("button", { name: "Crea offerta" }).click();
    await page.waitForURL(/\/admin\/offerte\/[^/]+\?esito=creata$/);
    const id = new URL(page.url()).pathname.split("/").pop()!;

    // Stored monthly: 99 / 12 = 8,25 shown "al mese" after reload.
    await expect(page.getByTestId("saved-notice")).toContainText("Offerta creata");
    await expect(page.locator("[name=fixed_fee]")).toHaveValue("8,25");
    await expect(page.locator("[name=fixed_fee_period]")).toHaveValue("month");
    await expect(page.locator("[name=energy_price]")).toHaveValue("0,4500");
    await expect(page.locator("[name=customer_type]")).toHaveValue("business");
    await expect(page.locator("input[name=advantages]")).toHaveValue("Prezzo **bloccato** 12 mesi");
    await expect(page.getByTestId("cost-preview-value")).toHaveText(formatEuro(expectedCost));

    // List: new offer visible to customers, with its monthly quota fissa.
    await page.goto("/admin/offerte");
    await expect(row(page, id)).toBeVisible();
    await expect(row(page, id).getByTestId("offer-fee")).toHaveText("8,25 €");
    await expect(row(page, id).getByTestId("badge-active")).toHaveText("Attiva");
    await expect(row(page, id).getByTestId("badge-verified")).toHaveText("Da verificare");

    // TODO(public): the results page reads offers with getRepository() IN THE BROWSER, and in mock
    // mode the browser has its own in-memory copy, so admin edits are not visible there. Until public
    // data goes through the server (Supabase), "what customers see" is asserted through the admin
    // "Visibili ai clienti" view, which applies the same rule (active offer of an active supplier).

    // Mark featured: badge in the list.
    await row(page, id).getByTestId("toggle-featured").click();
    await expect(row(page, id)).toHaveAttribute("data-featured", "true");
    await expect(row(page, id).getByTestId("badge-featured")).toHaveText("In evidenza");
    await page.reload();
    await expect(row(page, id)).toHaveAttribute("data-featured", "true");

    // Un-feature (restore), then deactivate: it leaves the "Visibili ai clienti" view and the public page.
    await row(page, id).getByTestId("toggle-featured").click();
    await expect(row(page, id)).toHaveAttribute("data-featured", "false");
    await row(page, id).getByTestId("toggle-active").click();
    await expect(row(page, id)).toHaveCount(0);
    await page.getByTestId("filter-all").click();
    await expect(row(page, id)).toHaveAttribute("data-active", "false");
    await expect(row(page, id).getByTestId("badge-active")).toHaveText("Disattivata");
    await page.getByTestId("filter-visible").click();
    await expect(page.getByTestId("offer-row").first()).toBeVisible();
    await expect(row(page, id)).toHaveCount(0);
    await page.getByTestId("filter-all").click();

    // Reactivate and deactivate again from "Tutte" (toggle works both ways).
    await row(page, id).getByTestId("toggle-active").click();
    await expect(row(page, id)).toHaveAttribute("data-active", "true");
    await row(page, id).getByTestId("toggle-active").click();
    await expect(row(page, id)).toHaveAttribute("data-active", "false");
  });

  test("edit the advantages list: add, reorder, remove, bold preview", async ({ page }, info) => {
    await login(page);
    const name = uniqueName("Vantaggi", info);
    const id = await createOffer(page, {
      name,
      active: false,
      advantages: ["Primo **vantaggio**", "Secondo", "Terzo **grassetto**"],
    });
    const inputs = page.locator("input[name=advantages]");
    await expect(inputs).toHaveCount(3);
    const values = async () => inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(await values()).toEqual(["Primo **vantaggio**", "Secondo", "Terzo **grassetto**"]);
    await expect(page.getByTestId("advantage-preview").first().locator("strong")).toHaveText("vantaggio");

    // Reorder with the up/down buttons, remove one, edit one, add one.
    await page.getByRole("button", { name: "Sposta su il vantaggio 3" }).click();
    expect(await values()).toEqual(["Primo **vantaggio**", "Terzo **grassetto**", "Secondo"]);
    await expect(page.getByRole("button", { name: "Sposta su il vantaggio 1" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Sposta giù il vantaggio 3" })).toBeDisabled();
    await page.getByRole("button", { name: "Sposta giù il vantaggio 1" }).click();
    expect(await values()).toEqual(["Terzo **grassetto**", "Primo **vantaggio**", "Secondo"]);
    await page.getByRole("button", { name: "Rimuovi il vantaggio 3" }).click();
    await inputs.nth(1).fill("Primo **vantaggio** modificato");
    await page.getByRole("button", { name: "Aggiungi vantaggio" }).click();
    await inputs.last().fill("Ultimo");
    await page.getByRole("button", { name: "Salva modifiche" }).click();
    await page.waitForURL(/\?esito=salvata$/);
    await expect(page.getByTestId("saved-notice")).toContainText("Modifiche salvate");
    expect(await values()).toEqual(["Terzo **grassetto**", "Primo **vantaggio** modificato", "Ultimo"]);

    // Persisted: still the same order after a fresh load.
    await page.goto(`/admin/offerte/${id}`);
    expect(await values()).toEqual(["Terzo **grassetto**", "Primo **vantaggio** modificato", "Ultimo"]);

    // Remove everything: empty list is allowed.
    for (let i = 3; i >= 1; i--) await page.getByRole("button", { name: `Rimuovi il vantaggio ${i}` }).click();
    await expect(page.getByTestId("advantages-empty")).toBeVisible();
    await page.getByRole("button", { name: "Salva modifiche" }).click();
    await page.waitForURL(/\?esito=salvata$/);
    await expect(inputs).toHaveCount(0);
  });

  test("edit every field of an offer and quick toggles (featured, verified) on the list", async ({ page }, info) => {
    await login(page);
    const name = uniqueName("Tutti i campi", info);
    const id = await createOffer(page, { name, commodity: "luce", customer: "casa", price: "0,129", otherVariable: "0,06", fee: "9", feePeriod: "month", active: false });

    await page.goto(`/admin/offerte/${id}`);
    await expect(page.locator("[name=energy_price]")).toHaveValue("0,1290");
    await expect(page.locator("label", { hasText: "Prezzo energia (€/kWh)" })).toBeVisible();
    await page.locator("[name=name]").fill(`${name} bis`);
    await page.locator("[name=customer_type]").selectOption("both");
    await page.locator("[name=other_fixed_costs]").fill("24");
    await page.locator("[name=other_fixed_costs_period]").selectOption("year");
    await page.locator("[name=activation_cost]").fill("12,50");
    await page.locator("[name=promo_text]").fill("Sconto **speciale**");
    await page.locator("[name=details]").fill("Condizioni di prova.");
    await page.locator("[name=price_verified]").check();
    await page.getByRole("button", { name: "Salva modifiche" }).click();
    await page.waitForURL(/\?esito=salvata$/);
    await expect(page.locator("[name=name]")).toHaveValue(`${name} bis`);
    await expect(page.locator("[name=other_fixed_costs]")).toHaveValue("2,00");
    await expect(page.locator("[name=other_fixed_costs_period]")).toHaveValue("month");
    await expect(page.locator("[name=activation_cost]")).toHaveValue("12,50");
    await expect(page.locator("[name=promo_text]")).toHaveValue("Sconto **speciale**");
    await expect(page.locator("[name=details]")).toHaveValue("Condizioni di prova.");
    await expect(page.locator("[name=price_verified]")).toBeChecked();
    await expect(page.locator("[name=active]")).not.toBeChecked();
    await expect(page.locator("[name=customer_type]")).toHaveValue("both");

    // Inactive offers are only in "Tutte".
    await page.goto("/admin/offerte");
    await expect(row(page, id)).toHaveCount(0);
    await page.goto("/admin/offerte?vista=tutte");
    const r = row(page, id);
    await expect(r).toBeVisible();
    await expect(r.getByTestId("badge-verified")).toHaveText("Prezzo verificato");
    await expect(r).toContainText("Casa e Partita IVA");

    // Quick toggles: featured and verified, both ways.
    await r.getByTestId("toggle-featured").click();
    await expect(r).toHaveAttribute("data-featured", "true");
    await r.getByTestId("toggle-price_verified").click();
    await expect(r).toHaveAttribute("data-verified", "false");
    await expect(r.getByTestId("badge-verified")).toHaveText("Da verificare");
    // Restore.
    await r.getByTestId("toggle-featured").click();
    await expect(r).toHaveAttribute("data-featured", "false");
    await expect(r.getByTestId("badge-featured")).toHaveCount(0);
    await noOverflow(page);
  });

  test("validation errors are shown inline and nothing is saved", async ({ page }, info) => {
    await login(page);
    await page.goto("/admin/offerte/nuova");
    await expect(page.getByTestId("cost-preview-value")).toHaveText("—");
    await page.getByRole("button", { name: "Crea offerta" }).click();
    const form = page.getByTestId("offer-form");
    await expect(form).toHaveAttribute("data-attempt", "1");
    await expect(page).toHaveURL(/\/admin\/offerte\/nuova$/);
    await expect(page.getByTestId("form-error")).toHaveText("Controlla i campi evidenziati.");
    await expect(page.getByText("Seleziona un fornitore.")).toBeVisible();
    await expect(page.getByText("Inserisci il nome dell'offerta.")).toBeVisible();
    await expect(page.getByText("Prezzo energia: campo obbligatorio.")).toBeVisible();
    await expect(page.getByText("Quota fissa: campo obbligatorio.")).toBeVisible();

    await page.locator("[name=supplier_id]").selectOption("iren");
    await page.locator("[name=name]").fill("x");
    await page.locator("[name=energy_price]").fill("abc");
    await page.locator("[name=other_variable_costs]").fill("0,1234567");
    await page.locator("[name=fixed_fee]").fill("-3");
    await page.locator("[name=locked_months]").fill("0");
    await page.locator("[name=activation_cost]").fill("1,234");
    await page.getByRole("button", { name: "Crea offerta" }).click();
    await expect(form).toHaveAttribute("data-attempt", "2");
    await expect(page.getByText("Prezzo energia: inserisci un numero (es. 0,1290).")).toBeVisible();
    await expect(page.getByText("Altri costi variabili: al massimo 6 decimali.")).toBeVisible();
    await expect(page.getByText("Quota fissa: inserisci un numero (es. 0,1290).")).toBeVisible();
    await expect(page.getByText("I mesi di blocco devono essere tra 1 e 120.")).toBeVisible();
    await expect(page.getByText("Costo di attivazione: al massimo 2 decimali.")).toBeVisible();
    await expect(page.getByTestId("cost-preview-value")).toHaveText("—");
    await expect(page).toHaveURL(/\/admin\/offerte\/nuova$/);
    await noOverflow(page);
    await page.screenshot({ path: `${SHOTS}/admin-offers-${info.project.name}-errors.png`, fullPage: true });
  });

  test("supplier select hides placeholder suppliers and the server rejects forged ones", async ({ page }, info) => {
    await login(page);
    const placeholders = ["tutela", "altro-fornitore", "non-lo-so"];
    const select = page.locator("[name=supplier_id]");
    const optionValues = () => select.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));

    // Create form: real suppliers only.
    await page.goto("/admin/offerte/nuova");
    const createValues = await optionValues();
    expect(createValues).toContain("iren");
    for (const p of placeholders) expect(createValues).not.toContain(p);
    await expect(select.locator("option", { hasText: "segnaposto" })).toHaveCount(0);

    // A forged POST choosing a placeholder is refused with an Italian field error.
    await select.evaluate((el) => {
      const o = document.createElement("option");
      o.value = "tutela";
      o.textContent = "forzato";
      (el as HTMLSelectElement).appendChild(o);
    });
    await select.selectOption("tutela");
    await page.locator("[name=name]").fill(uniqueName("placeholder", info));
    await page.locator("[name=energy_price]").fill("0,1290");
    await page.locator("[name=fixed_fee]").fill("9");
    await page.getByRole("button", { name: "Crea offerta" }).click();
    await expect(page.getByTestId("offer-form")).toHaveAttribute("data-attempt", "1");
    await expect(page.getByText("Questo fornitore è un segnaposto e non può avere offerte.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/offerte\/nuova$/);

    // Edit form of an offer with a real supplier: still no placeholder options.
    const id = await createOffer(page, { name: uniqueName("no-placeholder", info), active: false });
    await page.goto(`/admin/offerte/${id}`);
    const editValues = await optionValues();
    for (const p of placeholders) expect(editValues).not.toContain(p);
    await expect(select).toHaveValue("iren");
  });

  test("unknown offer id shows a not-found page", async ({ page }) => {
    await login(page);
    const res = await page.goto("/admin/offerte/non-esiste");
    expect(res?.status()).toBe(404);
  });
});
