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
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Variables that are always safe to embed (not secrets, set by tooling). */
const ALLOWED_NON_PUBLIC = new Set(["NODE_ENV"]);

/**
 * @param {Record<string, string>} env  variables embedded for the production mode
 * @returns {string[]} human readable problems (empty when the bundle is safe)
 */
export function findBundleEnvProblems(env) {
  const problems = [];
  for (const [key, value] of Object.entries(env)) {
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

async function main() {
  const file = path.resolve(process.cwd(), ".open-next/cloudflare/next-env.mjs");
  const { production = {} } = await import(pathToFileURL(file).href);
  const problems = findBundleEnvProblems(production);
  if (problems.length === 0) {
    console.log("check-bundle-env: OK (only NEXT_PUBLIC_* values embedded, data source = supabase)");
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
