/**
 * Post-build secret guard: `npm run check:bundle` (also run automatically by `postbuild`,
 * i.e. after every `npm run build`, including the Vercel build).
 *
 * Next.js inlines every NEXT_PUBLIC_* variable referenced by client code into the browser
 * bundles, and anything written into the build output (.next/) may be served or uploaded.
 * This script fails when:
 *   1. a NEXT_PUBLIC_* variable looks like a secret (…SECRET / PASSWORD / PRIVATE /
 *      SERVICE_ROLE / API_KEY) and has a value: it would reach the browser;
 *   2. the VALUE of a server-only secret (LEAD_API_SECRET, RESEND_API_KEY, CRON_SECRET, mock
 *      admin credentials) appears anywhere in the build output (client bundles under
 *      .next/static, prerendered pages and server chunks under .next/server, ...);
 *   3. in strict mode (`--strict`, or automatically on Vercel where VERCEL=1): the data
 *      source is not "supabase" or the public Supabase config is missing.
 * Problems report the variable NAME and the file, never the value.
 *
 * It only reads local files; it never contacts Vercel or Supabase.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Server-only secrets whose VALUES must never appear in the build output.
 * LEAD_API_SECRET authorises every lead write (create_lead / update_lead / complete_lead).
 */
export const SERVER_SECRET_KEYS = [
  "LEAD_API_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "ADMIN_MOCK_PASSWORD",
  "ADMIN_MOCK_SESSION_SECRET",
];

/** A NEXT_PUBLIC_* name that looks like a secret is a mistake (it would reach the browser). */
const SECRET_LIKE_PUBLIC = /^NEXT_PUBLIC_.*(SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|API_KEY)/;

/** Shorter values are too generic to search for without false positives. */
const MIN_SECRET_SEARCH_LENGTH = 12;

/** Build-output folders that are never served nor deployed (local caches, dev server). */
const SKIP_DIRS = new Set(["cache", "dev"]);

/** .env files Next.js loads for `next build` (production mode), lowest precedence first. */
const BUILD_ENV_FILES = [".env", ".env.production", ".env.local", ".env.production.local"];

/**
 * @param {Record<string, string | undefined>} env  variables visible to `next build`
 * @param {{ requireSupabase?: boolean }} [opts]
 * @returns {string[]} human readable problems (empty when the build is safe)
 */
export function findPublicEnvProblems(env, { requireSupabase = false } = {}) {
  const problems = [];
  for (const [key, value] of Object.entries(env)) {
    if (SECRET_LIKE_PUBLIC.test(key) && String(value ?? "").trim() !== "") {
      problems.push(`${key} looks like a secret but is public (NEXT_PUBLIC_*): it would reach the browser`);
    }
  }
  if (requireSupabase) {
    if (env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") {
      problems.push(
        `NEXT_PUBLIC_DATA_SOURCE is "${env.NEXT_PUBLIC_DATA_SOURCE ?? ""}" but production needs "supabase"`,
      );
    }
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
      if (!String(env[key] ?? "").trim()) problems.push(`${key} is missing`);
    }
  }
  return problems;
}

/**
 * Minimal dotenv parser (KEY=VALUE, optional quotes, # comments). Values are only used for
 * the checks above; nothing is printed.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseDotenv(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "");
    out[m[1]] = v;
  }
  return out;
}

/**
 * Variables visible to `next build`: the .env files (Next.js precedence), then the process
 * environment, which wins (as in Next.js).
 * @param {string} dir  app directory
 * @param {Record<string, string | undefined>} env
 * @returns {Record<string, string>}
 */
export function collectBuildEnv(dir, env = process.env) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const name of BUILD_ENV_FILES) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) Object.assign(out, parseDotenv(fs.readFileSync(file, "utf8")));
  }
  for (const [key, value] of Object.entries(env)) if (value !== undefined) out[key] = value;
  return out;
}

/**
 * Secret values (name -> value) known on this machine: process env first, then the .env files.
 * @param {string} dir  app directory
 * @param {Record<string, string | undefined>} env
 * @returns {Record<string, string>}
 */
export function collectSecretValues(dir, env = process.env) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const name of BUILD_ENV_FILES) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) Object.assign(files, parseDotenv(fs.readFileSync(file, "utf8")));
  }
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of SERVER_SECRET_KEYS) {
    const value = (env[key] ?? files[key] ?? "").trim();
    if (value.length >= MIN_SECRET_SEARCH_LENGTH) out[key] = value;
  }
  return out;
}

/**
 * Searches every file under `root` (skipping the top-level `cache` / `dev` folders of .next)
 * for the secret values. Reports the variable NAME and the file, never the value.
 * @param {string} root
 * @param {Record<string, string>} secrets
 * @returns {string[]}
 */
export function findSecretValueLeaks(root, secrets) {
  const entries = Object.entries(secrets).filter(([, v]) => v.length >= MIN_SECRET_SEARCH_LENGTH);
  if (entries.length === 0 || !fs.existsSync(root)) return [];
  const problems = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = /** @type {string} */ (stack.pop());
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (current === root && SKIP_DIRS.has(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const content = fs.readFileSync(full);
      for (const [key, value] of entries) {
        if (content.includes(value)) {
          problems.push(`the value of ${key} appears in ${path.relative(root, full)}`);
        }
      }
    }
  }
  return problems;
}

/**
 * @param {{ dir?: string, env?: Record<string, string | undefined>, strict?: boolean }} [opts]
 * @returns {string[]}
 */
export function checkBuild({ dir = process.cwd(), env = process.env, strict = false } = {}) {
  const buildDir = path.join(dir, ".next");
  if (!fs.existsSync(path.join(buildDir, "BUILD_ID"))) {
    return ["no production build found in .next/ (run `next build` first)"];
  }
  return [
    ...findPublicEnvProblems(collectBuildEnv(dir, env), { requireSupabase: strict }),
    ...findSecretValueLeaks(buildDir, collectSecretValues(dir, env)),
  ];
}

function main() {
  const strict = process.argv.includes("--strict") || process.env.VERCEL === "1";
  const problems = checkBuild({ strict });
  if (problems.length === 0) {
    console.log(
      `check-bundle-env: OK (no secret-like NEXT_PUBLIC_* variable, no server secret value in .next/` +
        `${strict ? ", data source = supabase" : ""})`,
    );
    return;
  }
  console.error("\ncheck-bundle-env: FAILED. Do NOT deploy this build:");
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    "\nFix: never prefix a secret with NEXT_PUBLIC_, never hard-code a secret value, and keep server" +
      "\nsecrets only in the Vercel environment variables (Sensitive). See app/DEPLOY.md.\n",
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
