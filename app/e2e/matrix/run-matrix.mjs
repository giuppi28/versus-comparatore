#!/usr/bin/env node
/**
 * `npm run e2e:matrix` — runs the Phase 7 suites in two phases against the same dev server:
 *   1. everything not tagged @serial, in parallel (flow matrix, validation, copy, admin read-only, ...);
 *   2. the @serial tests (admin CRUD that changes the public offers/suppliers), one worker, so they can
 *      never disturb the price/order assertions of phase 1.
 * Extra CLI arguments are forwarded to both runs (e.g. `--project=desktop`, `--grep flow`).
 * Exit code is non-zero when either phase fails.
 */
import { spawnSync } from "node:child_process";

const extra = process.argv.slice(2);
const base = ["playwright", "test", "--config", "playwright.matrix.config.ts"];
const run = (name, args) =>
  spawnSync("npx", [...base, ...args, ...extra], {
    stdio: "inherit",
    env: { ...process.env, MATRIX_JSON: process.env.MATRIX_JSON ?? `test-results/matrix-report-${name}.json` },
  }).status ?? 1;

const first = run("parallel", ["--grep-invert", "@serial"]);
const second = run("serial", ["--grep", "@serial", "--workers=1"]);
process.exit(first === 0 && second === 0 ? 0 : 1);
