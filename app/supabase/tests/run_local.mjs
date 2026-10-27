#!/usr/bin/env node
/**
 * LOCAL validation of app/supabase SQL with PGlite (real Postgres compiled to WASM).
 * No Docker / Supabase CLI needed. Steps:
 *   1. tests/supabase_stub.sql   (roles, auth schema, default privileges like Supabase)
 *   2. migrations/*.sql          (in filename order; the additive ones from 20261015170000 twice)
 *   3. seed.sql                  (run twice: must be idempotent)
 *   4. tests/data_checks.sql     (row counts, seed values, search, climate zones)
 *   5. tests/rls_test.sql        (RLS + lead functions; rolled back)
 *   6. data migration 20261027120000 (twice) + tests/offers_aldo_checks.sql (the 42 offers)
 *
 * PGlite is not an app dependency. Install it anywhere and point PGLITE_DIR at the folder
 * containing node_modules/@electric-sql/pglite, e.g.:
 *   mkdir -p /tmp/pgl && (cd /tmp/pgl && npm i @electric-sql/pglite@0.5)
 *   PGLITE_DIR=/tmp/pgl node app/supabase/tests/run_local.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const base = process.env.PGLITE_DIR ? path.resolve(process.env.PGLITE_DIR) + "/" : import.meta.url;
const require = createRequire(base);
const load = async (spec) => import(pathToFileURL(require.resolve(spec)).href);

const { PGlite } = await load("@electric-sql/pglite");
const { pgcrypto } = await load("@electric-sql/pglite/contrib/pgcrypto");
const { pg_trgm } = await load("@electric-sql/pglite/contrib/pg_trgm");
const { unaccent } = await load("@electric-sql/pglite/contrib/unaccent");

const db = new PGlite({ extensions: { pgcrypto, pg_trgm, unaccent } });
const notices = [];
const run = async (label, sql) => {
  const t = Date.now();
  try {
    await db.exec(sql, { onNotice: (n) => notices.push(n.message) });
  } catch (e) {
    console.error(`FAILED in ${label}: ${e.message}`);
    if (e.position) console.error(`  at position ${e.position}: ...${sql.slice(Math.max(0, e.position - 200), Number(e.position) + 100)}...`);
    process.exit(1);
  }
  console.log(`ok  ${label} (${Date.now() - t} ms)`);
};

await run("tests/supabase_stub.sql", readFileSync(path.join(here, "supabase_stub.sql"), "utf8"));
const migDir = path.join(root, "migrations");
// The offers DATA migration (T14.4: deletes all offers) is applied AFTER seed + tests, below,
// so the schema tests keep their 8 seed offers; it is checked by tests/offers_aldo_checks.sql.
const DATA_MIGRATIONS = ["20261027120000_offers_aldo_2026_10_27.sql"];
for (const f of readdirSync(migDir).filter((f) => f.endsWith(".sql") && !DATA_MIGRATIONS.includes(f)).sort()) {
  await run(`migrations/${f}`, readFileSync(path.join(migDir, f), "utf8"));
}
// Additive migrations written to be re-runnable (Phase 11+): apply them a second time.
for (const f of readdirSync(migDir).filter((f) => f.endsWith(".sql") && f >= "20261015170000" && !DATA_MIGRATIONS.includes(f)).sort()) {
  await run(`migrations/${f} (second run, idempotency)`, readFileSync(path.join(migDir, f), "utf8"));
}
const seed = readFileSync(path.join(root, "seed.sql"), "utf8");
await run("seed.sql", seed);
await run("seed.sql (second run, idempotency)", seed);
await run("tests/data_checks.sql", readFileSync(path.join(here, "data_checks.sql"), "utf8"));
await run("tests/rls_test.sql", readFileSync(path.join(here, "rls_test.sql"), "utf8"));
for (const f of DATA_MIGRATIONS) {
  const sql = readFileSync(path.join(migDir, f), "utf8");
  await run(`migrations/${f} (data migration)`, sql);
  await run(`migrations/${f} (second run, idempotency)`, sql);
}
await run("tests/offers_aldo_checks.sql", readFileSync(path.join(here, "offers_aldo_checks.sql"), "utf8"));

for (const n of notices) console.log(`  notice: ${n}`);
const counts = await db.query(
  "select (select count(*) from public.comuni)::int as comuni, (select count(*) from public.comuni where climate_zone is null)::int as comuni_without_zone, (select count(*) from public.suppliers)::int as suppliers, (select count(*) from public.offers)::int as offers, (select count(*) from public.leads)::int as leads, (select count(*) from public.settings)::int as settings",
);
console.log("final row counts:", counts.rows[0]);
if (!notices.includes("ALL RLS TESTS PASSED") || !notices.includes("ALL DATA CHECKS PASSED") || !notices.includes("ALL OFFERS ALDO CHECKS PASSED")) {
  console.error("missing success notice");
  process.exit(1);
}
await db.close();
