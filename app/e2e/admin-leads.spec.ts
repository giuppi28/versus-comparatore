import { expect, test, type APIRequestContext, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import { completeData, page1Data } from "../src/lib/lead/test-fixtures";

// Must match the webServer env in playwright.config.ts (mock auth, test-only).
const ADMIN_EMAIL = "admin@versus.test";
const ADMIN_PASSWORD = "Versus-Test-Password-2026!";
const SHOTS = "e2e/screenshots";

const rand = () => Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8).padEnd(8, "q");

interface Seed {
  /**
   * Unique key of the completed lead for the search box (its POD: the surname must stay
   * "Rossi" because it has to match the tax code).
   */
  completedKey: string;
  completedPod: string;
  partialSurname: string;
  /** Secret token of the completed lead (must never appear in the admin HTML). */
  completedToken: string;
}

/** Creates leads through the public API, exactly like the customer flow does. */
async function seedLeads(baseURL: string, playwright: PlaywrightWorkerArgs["playwright"]): Promise<Seed> {
  // A unique client IP per run keeps the per-IP rate limit of the public API out of the way.
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const newClient = (): Promise<APIRequestContext> =>
    playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL, "x-forwarded-for": ip } });

  const completedPod = `IT001E${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  const completedKey = completedPod;
  const partialSurname = `Parz${rand()}`;

  const done = await newClient();
  let res = await done.post("/api/lead", {
    data: { data: page1Data() },
  });
  expect(res.status(), await res.text()).toBeLessThan(300);
  const token = (await done.storageState()).cookies.find((c) => c.name === "versus_lead")?.value ?? "";
  expect(token).not.toBe("");
  res = await done.post("/api/lead/complete", {
    data: { data: completeData({ pod: completedPod }) },
  });
  expect(res.status(), await res.text()).toBeLessThan(300);
  await done.dispose();

  const partial = await newClient();
  res = await partial.post("/api/lead", {
    data: { data: page1Data({ first_name: "Giulia", last_name: partialSurname, commodity: "dual" }) },
  });
  expect(res.status(), await res.text()).toBeLessThan(300);
  res = await partial.patch("/api/lead", { data: { data: { step_reached: "results" } } });
  expect(res.status(), await res.text()).toBeLessThan(300);
  await partial.dispose();

  return { completedKey, completedPod, partialSurname, completedToken: token };
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  // First hit of /admin compiles on the dev server: allow for it under parallel load.
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
}

const items = (page: Page) => page.locator('[data-testid="lead-item"]:visible');

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("unauthenticated /admin/leads redirects to the login page", async ({ page }) => {
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/leads/some-id");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test.describe("admin leads", () => {
  // One worker per project: the leads are seeded once and shared by the tests below.
  test.describe.configure({ mode: "serial" });
  let seed: Seed;

  test.beforeAll(async ({ playwright }, testInfo) => {
    seed = await seedLeads(String(testInfo.project.use.baseURL), playwright);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("list distinguishes completed from partial leads (tabs)", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.goto(`/admin/leads?q=${seed.completedKey}`);
    // Default tab "Completati".
    await expect(page.getByRole("navigation", { name: "Tipo di lead" }).getByRole("link", { name: "Completati" })).toHaveAttribute("aria-current", "page");
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toHaveAttribute("data-step", "completed");
    await expect(items(page).first().getByTestId("step-badge")).toHaveText("Completato");
    await expect(items(page).first()).toContainText("Mario");
    await expect(items(page).first()).toContainText("Milano");
    await expect(items(page).first()).toContainText("3331234567");
    await expect(items(page).first()).toContainText("Nuovo");
    await expect(items(page).first()).toContainText("50,12");

    // The partial lead is not in "Completati".
    await page.goto(`/admin/leads?q=${seed.partialSurname}`);
    await expect(page.getByTestId("lead-empty")).toBeVisible();

    // ... but it is in "Parziali", with a grey "Parziale – <step>" badge.
    await page.getByRole("navigation", { name: "Tipo di lead" }).getByRole("link", { name: "Parziali" }).click();
    await expect(page).toHaveURL(/tab=parziali/);
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first().getByTestId("step-badge")).toHaveText("Parziale – Risultati");
    await expect(items(page).first()).toContainText("Giulia");
    await expect(items(page).first()).toContainText("Luce + Gas");

    // "Tutti" shows both kinds.
    await page.goto(`/admin/leads?tab=tutti&q=${encodeURIComponent("")}`);
    await page.getByRole("searchbox", { name: "Cerca" }).fill("");
    await expect(page.getByTestId("lead-total")).not.toHaveText("0 lead");
    await expect(page.locator('[data-testid="lead-item"][data-step="completed"]:visible').first()).toBeVisible();
    await expect(page.locator('[data-testid="lead-item"]:not([data-step="completed"]):visible').first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
    const width = page.viewportSize()?.width ?? 0;
    await page.screenshot({ path: `${SHOTS}/admin-leads-list-${width}.png`, fullPage: true });
    expect(project).toBeTruthy();
  });

  test("filters and search are driven by the URL", async ({ page }) => {
    // Search (accent/case insensitive, by name) in "Tutti".
    await page.goto("/admin/leads?tab=tutti");
    await page.getByRole("searchbox", { name: "Cerca" }).fill(seed.partialSurname.toUpperCase());
    await page.getByRole("button", { name: "Filtra" }).click();
    await expect(page).toHaveURL(new RegExp(`q=${seed.partialSurname.toUpperCase()}`));
    await expect(items(page)).toHaveCount(1);

    // Search by POD finds the completed lead.
    await page.goto(`/admin/leads?tab=tutti&q=${seed.completedKey}`);
    await expect(items(page)).toHaveCount(1);

    // Step filter (Parziali): matching step -> 1, other step -> 0.
    await page.goto(`/admin/leads?tab=parziali&step=results&q=${seed.partialSurname}`);
    await expect(items(page)).toHaveCount(1);
    await expect(page.getByLabel("Passo raggiunto")).toHaveValue("results");
    await page.getByLabel("Passo raggiunto").selectOption("offer_chosen");
    await page.getByRole("button", { name: "Filtra" }).click();
    await expect(page).toHaveURL(/step=offer_chosen/);
    await expect(page.getByTestId("lead-empty")).toBeVisible();

    // Status filter: new -> 1, closed -> 0.
    await page.goto(`/admin/leads?tab=tutti&status=new&q=${seed.completedKey}`);
    await expect(items(page)).toHaveCount(1);
    await page.getByLabel("Stato").selectOption("closed");
    await page.getByRole("button", { name: "Filtra" }).click();
    await expect(page).toHaveURL(/status=closed/);
    await expect(page.getByTestId("lead-empty")).toBeVisible();

    // Reset link clears the filters.
    await page.getByRole("link", { name: "Azzera" }).click();
    await expect(page).toHaveURL(/\/admin\/leads\?tab=tutti$/);

    // Unknown search term.
    await page.goto("/admin/leads?tab=tutti&q=zzznessunrisultato");
    await expect(page.getByTestId("lead-empty")).toContainText("Nessun lead");
    await expect(page.getByTestId("lead-total")).toHaveText("0 lead");
  });

  test("detail shows all grouped fields and never the lead token", async ({ page }, testInfo) => {
    await page.goto(`/admin/leads?q=${seed.completedKey}`);
    await items(page).first().getByRole("link", { name: "Mario Rossi" }).click();
    await expect(page).toHaveURL(/\/admin\/leads\/[^/]+$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mario Rossi");
    await expect(page.getByTestId("step-badge").first()).toHaveText("Completato");

    const contatto = page.getByTestId("group-contatto");
    await expect(contatto).toContainText("Mario");
    await expect(contatto).toContainText("3331234567");
    await expect(contatto).toContainText("RSSMRA85T10A562S");
    await expect(contatto).toContainText("Proprietario");
    const fornitura = page.getByTestId("group-fornitura");
    await expect(fornitura).toContainText("Cambio fornitore");
    await expect(fornitura).toContainText("Milano");
    await expect(fornitura).toContainText("Via Roma, 1");
    await expect(fornitura).toContainText("Enel Energia");
    const consumi = page.getByTestId("group-consumi");
    await expect(consumi).toContainText("Frigorifero");
    await expect(consumi).toContainText("1600");
    const offerte = page.getByTestId("group-offerte");
    await expect(offerte).toContainText("Edison");
    await expect(offerte).toContainText("50,12");
    const tecnici = page.getByTestId("group-tecnici");
    await expect(tecnici).toContainText(seed.completedPod);
    await expect(tecnici).toContainText("220 V");
    await expect(page.getByTestId("group-consensi")).toContainText("Sì");

    // The secret token is never rendered.
    expect(await page.content()).not.toContain(seed.completedToken);

    await expectNoHorizontalOverflow(page);
    const width = page.viewportSize()?.width ?? 0;
    await page.screenshot({ path: `${SHOTS}/admin-leads-detail-${width}.png`, fullPage: true });
    expect(testInfo.project.name).toBeTruthy();
  });

  test("status and notes persist after reload; invalid notes are rejected", async ({ page }) => {
    // ~12 sequential navigations/saves against the dev server: under fullyParallel load the
    // default 30 s budget is the only thing that fails (the test itself ran to the last step).
    test.slow();
    await page.goto(`/admin/leads?tab=parziali&q=${seed.partialSurname}`);
    await items(page).first().getByRole("link", { name: new RegExp(seed.partialSurname) }).click();
    await expect(page).toHaveURL(/\/admin\/leads\/[^/]+$/, { timeout: 20_000 });
    const detailUrl = page.url();

    await expect(page.getByLabel("Stato")).toHaveValue("new");
    await page.getByLabel("Stato").selectOption("in_progress");
    await page.getByLabel("Note interne").fill("Richiamare domani alle 10.\nInteressato alla luce.");
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByTestId("save-success")).toHaveText("Modifiche salvate.");
    await expect(page.getByTestId("status-badge").first()).toHaveText("In lavorazione");

    await page.reload();
    await expect(page.getByLabel("Stato")).toHaveValue("in_progress");
    await expect(page.getByLabel("Note interne")).toHaveValue("Richiamare domani alle 10.\nInteressato alla luce.");

    // Also reflected in the list.
    await page.goto(`/admin/leads?tab=parziali&status=in_progress&q=${seed.partialSurname}`);
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first().getByTestId("status-badge")).toHaveText("In lavorazione");

    // Notes that are too long are rejected with an inline error and nothing is saved.
    await page.goto(detailUrl);
    await page.getByLabel("Note interne").fill("x".repeat(5001));
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByTestId("save-error")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "al massimo 5000" })).toBeVisible();
    await page.goto(detailUrl);
    await expect(page.getByLabel("Note interne")).toHaveValue("Richiamare domani alle 10.\nInteressato alla luce.");

    // Clearing the notes and closing the lead.
    await page.getByLabel("Stato").selectOption("closed");
    await page.getByLabel("Note interne").fill("");
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByTestId("save-success")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Stato")).toHaveValue("closed");
    await expect(page.getByLabel("Note interne")).toHaveValue("");
  });

  test("unknown lead id is a 404", async ({ page }) => {
    const res = await page.goto("/admin/leads/00000000-0000-4000-8000-000000000000");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Lead non trovato" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Torna all'elenco/ })).toBeVisible();
  });
});
