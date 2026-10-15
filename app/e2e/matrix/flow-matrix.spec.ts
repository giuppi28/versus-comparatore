/**
 * T7.1 — the full customer-flow matrix. One test per generated combination (see cases.ts for the
 * dimensions and the pruning rules). Desktop (1440px) runs every case; mobile (390px) runs the
 * representative subset flagged `mobile` (at least one per commodity x customer x service, the
 * hasGas=no variants, the unknown-zone / zone A / all-uses gas profiles and a manual-consumption case).
 */
import { MATRIX } from "./cases";
import { runCase } from "./flow";
import { test } from "./fixtures";

test.describe("customer flow matrix", () => {
  for (const c of MATRIX) {
    test(c.id, { tag: c.mobile ? "@mobile" : undefined }, async ({ page, admin }) => {
      await runCase(page, admin, c);
    });
  }
});
