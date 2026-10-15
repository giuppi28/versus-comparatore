/**
 * Shared Playwright fixtures for the T7 suites.
 *
 *  - `page` gets a unique client IP (the lead API rate-limits per IP: 10 creations / 10 min), so runs
 *    never couple through the per-IP limits.
 *  - `admin` is a worker-scoped API client carrying the mock-admin session created once by
 *    global-setup.ts. It is used to read the server-side state (leads) through the real admin pages.
 */
import { test as base, expect, request, type APIRequestContext } from "@playwright/test";
import { existsSync } from "node:fs";
import { ADMIN_STATE_FILE } from "./paths";

export function randomIp(): string {
  const n = Math.floor(Math.random() * 16_000_000);
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

interface WorkerFixtures {
  admin: APIRequestContext;
}

export const test = base.extend<object, WorkerFixtures>({
  page: async ({ page }, provide) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await provide(page);
  },
  admin: [
    async ({}, provide, workerInfo) => {
      if (!existsSync(ADMIN_STATE_FILE)) throw new Error(`Missing ${ADMIN_STATE_FILE}: global-setup did not run`);
      const ctx = await request.newContext({
        baseURL: String(workerInfo.project.use.baseURL),
        storageState: ADMIN_STATE_FILE,
      });
      await provide(ctx);
      await ctx.dispose();
    },
    { scope: "worker" },
  ],
});

export { expect };
