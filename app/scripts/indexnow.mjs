// IndexNow submission for the indexable URLs listed in the live sitemap.
// Dry run by default; `--submit` actually POSTs to api.indexnow.org. Run from app/ (see DEPLOY.md, "IndexNow").
import { pathToFileURL } from "node:url";

export const HOST = "versuscomparatorelucegas.it";
// Public by design (IndexNow protocol): the same value is the name and the content of public/<key>.txt.
export const INDEXNOW_KEY = "13c9ca36d41ae0f71e7b908d4a06848e";
export const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
export const SITEMAP_URL = `https://${HOST}/sitemap.xml`;
export const ENDPOINT = "https://api.indexnow.org/indexnow";
export const FORBIDDEN_PREFIXES = ["/offerte", "/grazie", "/privacy", "/attivazione", "/admin", "/api"];

export function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].replaceAll("&amp;", "&"));
}

export function isSubmittable(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.hostname !== HOST) return false;
  return !FORBIDDEN_PREFIXES.some((p) => u.pathname === p || u.pathname.startsWith(`${p}/`) || u.pathname.startsWith(p));
}

export function filterUrls(urls) {
  return [...new Set(urls.filter(isSubmittable))];
}

export function buildPayload(urlList) {
  return { host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList };
}

export function describeStatus(status) {
  const map = {
    200: "accepted",
    202: "accepted (key validation pending)",
    400: "bad request",
    403: "key not valid",
    422: "URLs do not match the host",
    429: "too many requests",
  };
  return map[status] ?? "unexpected response";
}

async function main() {
  const submit = process.argv.includes("--submit");
  const keyRes = await fetch(KEY_LOCATION, { redirect: "manual" });
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : "";
  if (keyBody !== INDEXNOW_KEY) {
    console.error(`Key file not live yet at ${KEY_LOCATION} (HTTP ${keyRes.status}, body is not the key).`);
    console.error("Merge to main and wait for the production deploy, then run again. Nothing was sent.");
    process.exit(1);
  }
  const smRes = await fetch(SITEMAP_URL);
  if (!smRes.ok) {
    console.error(`Cannot read ${SITEMAP_URL} (HTTP ${smRes.status}). Nothing was sent.`);
    process.exit(1);
  }
  const urlList = filterUrls(parseSitemapLocs(await smRes.text()));
  if (urlList.length === 0) {
    console.error("No submittable URLs in the sitemap. Nothing was sent.");
    process.exit(1);
  }
  console.log(`Host: ${HOST}\nKey location: ${KEY_LOCATION}\nURLs (${urlList.length}):`);
  for (const u of urlList) console.log(`  ${u}`);
  if (!submit) {
    console.log("Dry run: nothing sent. Use `npm run indexnow -- --submit` to submit.");
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(buildPayload(urlList)),
  });
  console.log(`HTTP ${res.status}: ${describeStatus(res.status)}`);
  if (res.status < 200 || res.status >= 300) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`IndexNow failed: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
