/**
 * Post-build guard for `npm run build:cf`.
 *
 * OpenNext embeds every variable that Next.js loaded from the .env files at build time
 * (.env.production.local, .env.local, .env.production, .env) into the worker bundle
 * (`.open-next/cloudflare/next-env.mjs`). Only public NEXT_PUBLIC_* values may end up there;
 * secrets must live in Cloudflare secrets (see DEPLOY.md). This script fails the build when
 * anything else was embedded, so a developer `.env.local` full of secrets / mock credentials
 * can never be uploaded by accident, and when the data source is not "supabase".
 *
 * It only reads local files; it never contacts Cloudflare.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Variables that are always safe to embed (not secrets, set by tooling). */
const ALLOWED_NON_PUBLIC = new Set(["NODE_ENV"]);

/**
 * Server-only secrets. Besides the generic non-public check, their VALUES are searched in the
 * whole build output (a secret can also be inlined by code, not only via next-env.mjs).
 * LEAD_API_SECRET authorises every lead write (create_lead / update_lead / complete_lead).
 */
export const SERVER_SECRET_KEYS = [
  "LEAD_API_SECRET",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "ADMIN_MOCK_PASSWORD",
  "ADMIN_MOCK_SESSION_SECRET",
];

/** A NEXT_PUBLIC_* name that looks like a secret is a mistake (it would reach the browser). */
const SECRET_LIKE_PUBLIC = /^NEXT_PUBLIC_.*(SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|API_KEY)/;

/** Shorter values are too generic to search for without false positives. */
const MIN_SECRET_SEARCH_LENGTH = 12;

/**
 * @param {Record<string, string>} env  variables embedded for the production mode
 * @returns {string[]} human readable problems (empty when the bundle is safe)
 */
export function findBundleEnvProblems(env) {
  const problems = [];
  for (const [key, value] of Object.entries(env)) {
    if (SECRET_LIKE_PUBLIC.test(key) && String(value).trim() !== "") {
      problems.push(`${key} looks like a secret but is public (NEXT_PUBLIC_*): it would reach the browser`);
      continue;
    }
    if (key.startsWith("NEXT_PUBLIC_") || ALLOWED_NON_PUBLIC.has(key)) continue;
    if (String(value).trim() === "") continue; // empty placeholders leak nothing
    problems.push(`${key} would be embedded in the worker bundle (non-public variable)`);
  }
  if (env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") {
    problems.push(
      `NEXT_PUBLIC_DATA_SOURCE is "${env.NEXT_PUBLIC_DATA_SOURCE ?? ""}" but production needs "supabase"`,
    );
  }
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
    if (!env[key]) problems.push(`${key} is missing`);
  }
  return problems;
}

/**
 * Minimal dotenv parser (KEY=VALUE, optional quotes, # comments). Only used to learn the
 * secret values to search for; nothing is printed.
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
 * Secret values (name -> value) known on this machine: process env first, then the .env files.
 * @param {string} dir  app directory
 * @param {Record<string, string | undefined>} env
 * @returns {Record<string, string>}
 */
export function collectSecretValues(dir, env = process.env) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const name of [".env", ".env.production", ".env.local", ".env.production.local"]) {
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
 * Searches every file under `root` for the secret values. Reports the variable NAME and the
 * file, never the value.
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

async function main() {
  const file = path.resolve(process.cwd(), ".open-next/cloudflare/next-env.mjs");
  const { production = {} } = await import(pathToFileURL(file).href);
  const problems = [
    ...findBundleEnvProblems(production),
    ...findSecretValueLeaks(
      path.resolve(process.cwd(), ".open-next"),
      collectSecretValues(process.cwd()),
    ),
  ];
  if (problems.length === 0) {
    console.log(
      "check-bundle-env: OK (only NEXT_PUBLIC_* values embedded, no server secret value in the build, data source = supabase)",
    );
    return;
  }
  console.error("\ncheck-bundle-env: FAILED. Do NOT deploy this build:");
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    "\nFix: build with a clean environment. Put ONLY the NEXT_PUBLIC_* values in app/.env.production.local," +
      "\nmove app/.env.local aside while building (or build from a fresh clone), and keep secrets in Cloudflare." +
      "\nSee app/DEPLOY.md, section 'Build'.\n",
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("check-bundle-env: could not read the build output. Run opennextjs-cloudflare build first.", error);
    process.exit(1);
  });
}
