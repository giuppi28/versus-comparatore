import { defineConfig } from "vitest/config";

// Standalone integration suite that talks to the REAL Supabase project over HTTP
// (publishable key + LEAD_API_SECRET read from app/.env.local). No Next server, no jsdom.
// Run: npm run test:security
export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/security/**/*.vitest.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One file, sequential: the lead tests depend on each other (token isolation).
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
