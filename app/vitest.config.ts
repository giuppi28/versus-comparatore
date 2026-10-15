import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside the React server graph; neutralise it in unit tests.
      "server-only": path.resolve(__dirname, "vitest.server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/logic/**/*.ts"],
      exclude: ["src/lib/logic/**/*.test.ts", "src/lib/logic/**/index.ts"],
      // 100% on the validators module (TASKS.md T2.3); the rest of logic is reported only.
      thresholds: {
        "src/lib/logic/validators/**": { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
});
