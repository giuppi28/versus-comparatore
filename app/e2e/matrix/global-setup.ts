import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ADMIN_STATE_FILE } from "./paths";
import { ADMIN_EMAIL, ADMIN_PASSWORD, FAKE_TURNSTILE } from "./constants";

/** Logs in once with the mock admin and stores the session for the API clients of every worker. */
export default async function globalSetup(config: FullConfig) {
  const baseURL = String(config.projects[0].use.baseURL);
  mkdirSync(path.dirname(ADMIN_STATE_FILE), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  await context.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_TURNSTILE }),
  );
  const page = await context.newPage();
  await page.goto("/admin/login", { timeout: 120_000 });
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  const submit = page.getByRole("button", { name: "Accedi" });
  await submit.waitFor({ state: "visible" });
  await page.waitForFunction(() => !(document.querySelector("button[type=submit]") as HTMLButtonElement | null)?.disabled, null, {
    timeout: 30_000,
  });
  await submit.click();
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 60_000 });
  await context.storageState({ path: ADMIN_STATE_FILE });
  await browser.close();
}
