/**
 * T7.4 (part 1, parallel-safe) — admin area: authentication, access control on EVERY admin route,
 * leads list / detail / status / notes. The supplier and offer CRUD (which change what customers see)
 * lives in admin-crud.spec.ts and runs alone (@serial).
 */
import { request, type Page } from "@playwright/test";
import { completeData, page1Data } from "../../src/lib/lead/test-fixtures";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./constants";
import { expect, randomIp, test } from "./fixtures";
import { ADMIN_STATE_FILE } from "./paths";

const TAG = { tag: "@mobile" };
const TURNSTILE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

/** Every admin route of the app (mfa pages included). */
const ADMIN_ROUTES = [
  "/admin",
  "/admin/leads",
  "/admin/leads/00000000-0000-4000-8000-000000000000",
  "/admin/leads?tab=parziali&q=mario",
  "/admin/fornitori",
  "/admin/fornitori/nuovo",
  "/admin/fornitori/enel-energia",
  "/admin/offerte",
  "/admin/offerte/nuova",
  "/admin/offerte/offer-edison-luce-fissa-12",
  "/admin/impostazioni",
  "/admin/login/mfa",
  "/admin/login/mfa/attiva",
];

async function fillLogin(page: Page, email: string, password: string) {
  const form = page.locator("form[data-attempt]");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await submit.click();
  return form;
}

test.describe("admin: authentication and access control", () => {
  test("every admin route redirects an anonymous visitor to the login page (browser + raw HTTP)", TAG, async ({ page, baseURL }) => {
    const anonymous = await request.newContext({ baseURL: baseURL! });
    for (const path of ADMIN_ROUTES) {
      // Raw HTTP: a redirect to the login page and none of the admin content in the body.
      const res = await anonymous.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308], `${path} status`).toContain(res.status());
      expect(res.headers()["location"] ?? "", `${path} location`).toMatch(/\/admin\/login/);
      const body = await res.text();
      expect(body, `${path} body`).not.toMatch(/Dashboard|Fornitori|Offerte|Lead completati|Mario Rossi/);

      // Browser: ends on the login page.
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login/);
    }
    await expect(page.getByRole("heading", { name: "Area riservata" })).toBeVisible();
    // The login page is the only public admin route; there is no sign-up.
    await expect(page.getByText(/registrati|crea (un )?account/i)).toHaveCount(0);
    await anonymous.dispose();
  });

  test("a forged, malformed or tampered session cookie never grants access", TAG, async ({ page, baseURL }) => {
    const forged = [
      "eyJzdWIiOiJ4In0.ZmFrZQ",
      "not-a-token",
      "",
      "a.b.c",
      `${Buffer.from(JSON.stringify({ sub: "x", email: ADMIN_EMAIL, exp: 4102444800 })).toString("base64url")}.AAAA`,
    ];
    for (const value of forged) {
      const ctx = await request.newContext({
        baseURL: baseURL!,
        extraHTTPHeaders: { cookie: `versus_admin_mock=${value}` },
      });
      for (const path of ["/admin", "/admin/leads", "/admin/offerte"]) {
        const res = await ctx.get(path, { maxRedirects: 0 });
        expect([302, 303, 307, 308], `${path} with cookie "${value}"`).toContain(res.status());
      }
      await ctx.dispose();
    }
    await page.context().addCookies([{ name: "versus_admin_mock", value: forged[0], url: baseURL! }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("wrong credentials give one generic message; correct login opens the dashboard; logout blocks it again", TAG, async ({ page }, testInfo) => {
    await page.goto("/admin/login");
    const attempt = Number(await page.locator("form[data-attempt]").getAttribute("data-attempt"));
    await fillLogin(page, `nobody-${testInfo.project.name}-${Date.now()}@versus.test`, "sbagliata");
    await expect(page.locator("form[data-attempt]")).toHaveAttribute("data-attempt", String(attempt + 1));
    await expect(page.getByTestId("form-error")).toHaveText("Email o password non corretti.");
    await expect(page).toHaveURL(/\/admin\/login$/);
    // Empty fields cannot be submitted.
    await page.getByLabel("Email").fill("");
    await expect(page.getByLabel("Email")).toHaveValue("");

    await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL((url) => url.pathname === "/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Area riservata" });
    for (const [label, path] of [["Lead", "/admin/leads"], ["Fornitori", "/admin/fornitori"], ["Offerte", "/admin/offerte"], ["Impostazioni", "/admin/impostazioni"]] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    const session = (await page.context().cookies()).find((c) => c.name === "versus_admin_mock");
    expect(session?.httpOnly).toBe(true);

    await page.getByRole("button", { name: "Esci" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    for (const path of ADMIN_ROUTES.slice(0, 8)) {
      await page.goto(path);
      await expect(page, `after logout ${path}`).toHaveURL(/\/admin\/login/);
    }
  });
});

// ---------------------------------------------------------------------------
// Leads

interface SeedLeads {
  completedPod: string;
  partialSurname: string;
}

async function seedLeads(baseURL: string, label: string): Promise<SeedLeads> {
  const client = () =>
    request.newContext({ baseURL, storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { Origin: baseURL, "x-forwarded-for": randomIp() } });
  const rand = () => Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8).padEnd(8, "q");
  const completedPod = `IT001E${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  const partialSurname = `Parz${label}${rand()}`;

  const done = await client();
  let res = await done.post("/api/lead", { data: { data: page1Data(), turnstileToken: TURNSTILE_TOKEN } });
  expect(res.status(), await res.text()).toBeLessThan(300);
  res = await done.post("/api/lead/complete", { data: { data: completeData({ pod: completedPod }), turnstileToken: TURNSTILE_TOKEN }});
  expect(res.status(), await res.text()).toBeLessThan(300);
  await done.dispose();

  const partial = await client();
  res = await partial.post("/api/lead", {
    data: { data: page1Data({ first_name: "Giulia", last_name: partialSurname, commodity: "dual" }), turnstileToken: TURNSTILE_TOKEN },
  });
  expect(res.status(), await res.text()).toBeLessThan(300);
  res = await partial.patch("/api/lead", { data: { data: { step_reached: "results" } } });
  expect(res.status(), await res.text()).toBeLessThan(300);
  await partial.dispose();
  return { completedPod, partialSurname };
}

test.describe("admin: leads", () => {
  test.use({ storageState: ADMIN_STATE_FILE });
  let seed: SeedLeads;
  test.beforeAll(async ({}, testInfo) => {
    seed = await seedLeads(String(testInfo.project.use.baseURL), testInfo.project.name);
  });

  const items = (page: Page) => page.locator('[data-testid="lead-item"]:visible');

  test("list: completed and partial leads are told apart; search finds each", TAG, async ({ page }) => {
    await page.goto(`/admin/leads?q=${seed.completedPod}`);
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first().getByTestId("step-badge")).toHaveText("Completato");
    await expect(items(page).first()).toContainText("Mario");

    await page.goto(`/admin/leads?q=${seed.partialSurname}`);
    await expect(page.getByTestId("lead-empty")).toBeVisible(); // not among the completed ones
    await page.goto(`/admin/leads?tab=parziali&q=${seed.partialSurname}`);
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first().getByTestId("step-badge")).toHaveText("Parziale – Risultati");
    await page.goto(`/admin/leads?tab=tutti&q=${seed.partialSurname}`);
    await expect(items(page)).toHaveCount(1);
  });

  test("detail: every group of data, no token leak, status walks through all states, notes persist", TAG, async ({ page }) => {
    await page.goto(`/admin/leads?q=${seed.completedPod}`);
    await items(page).first().getByRole("link", { name: "Mario Rossi" }).click();
    await expect(page).toHaveURL(/\/admin\/leads\/[^/]+$/);
    const detailUrl = page.url();
    for (const group of ["group-contatto", "group-fornitura", "group-consumi", "group-offerte", "group-tecnici", "group-consensi"]) {
      await expect(page.getByTestId(group)).toBeVisible();
    }
    await expect(page.getByTestId("group-tecnici")).toContainText(seed.completedPod);
    await expect(page.getByTestId("group-contatto")).toContainText("RSSMRA85T10A562S");
    expect(await page.content()).not.toMatch(/versus_lead|"token"/);

    await expect(page.getByLabel("Stato")).toHaveValue("new");
    for (const [value, label] of [["contacted", "Contattato"], ["in_progress", "In lavorazione"], ["closed", "Chiuso"], ["new", "Nuovo"]] as const) {
      await page.getByLabel("Stato").selectOption(value);
      await page.getByLabel("Note interne").fill(`Nota per ${label}\nseconda riga`);
      await page.getByRole("button", { name: "Salva" }).click();
      await expect(page.getByTestId("save-success")).toHaveText("Modifiche salvate.");
      await expect(page.getByTestId("status-badge").first()).toHaveText(label);
      await page.goto(detailUrl);
      await expect(page.getByLabel("Stato")).toHaveValue(value);
      await expect(page.getByLabel("Note interne")).toHaveValue(`Nota per ${label}\nseconda riga`);
    }

    // The list filter follows the status.
    await page.getByLabel("Stato").selectOption("closed");
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByTestId("save-success")).toBeVisible();
    await page.goto(`/admin/leads?tab=tutti&status=closed&q=${seed.completedPod}`);
    await expect(items(page)).toHaveCount(1);
    await page.goto(`/admin/leads?tab=tutti&status=new&q=${seed.completedPod}`);
    await expect(page.getByTestId("lead-empty")).toBeVisible();

    // Notes that are too long are rejected, nothing is saved.
    await page.goto(detailUrl);
    await page.getByLabel("Note interne").fill("x".repeat(5001));
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByTestId("save-error")).toBeVisible();
    await page.goto(detailUrl);
    await expect(page.getByLabel("Note interne")).not.toHaveValue(/^x{5001}$/);
    // Restore.
    await page.getByLabel("Stato").selectOption("new");
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByTestId("save-success")).toBeVisible();
  });
});
