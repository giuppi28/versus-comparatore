import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPayload,
  filterUrls,
  HOST,
  INDEXNOW_KEY,
  KEY_LOCATION,
  parseSitemapLocs,
} from "./indexnow.mjs";

const H = `https://${HOST}`;

describe("indexnow", () => {
  it("parses sitemap locs", () => {
    const xml = `<urlset><url><loc>${H}/</loc></url><url><loc> ${H}/a?x=1&amp;y=2 </loc></url></urlset>`;
    expect(parseSitemapLocs(xml)).toEqual([`${H}/`, `${H}/a?x=1&y=2`]);
  });

  it("drops foreign hosts and forbidden paths, keeps the rest once", () => {
    const out = filterUrls([
      `${H}/`,
      `${H}/`,
      `${H}/guide/x`,
      "https://example.com/",
      "https://versus-comparatore.vercel.app/",
      "http://localhost:3000/",
      `http://${HOST}/`,
      "not a url",
      ...["/offerte", "/offerte-luce", "/offerte-gas", "/grazie", "/privacy", "/attivazione/abc", "/admin", "/api/x"].map(
        (p) => `${H}${p}`,
      ),
    ]);
    expect(out).toEqual([`${H}/`, `${H}/guide/x`]);
  });

  it("builds the IndexNow payload", () => {
    const urls = [`${H}/`];
    expect(buildPayload(urls)).toEqual({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${H}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    });
    expect(KEY_LOCATION).toBe(`${H}/${INDEXNOW_KEY}.txt`);
    expect(INDEXNOW_KEY).toMatch(/^[0-9a-f]{32}$/);
  });

  it("key in code matches the single key file in public/", () => {
    const pub = path.resolve(__dirname, "../public");
    const keyFiles = fs.readdirSync(pub).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
    expect(keyFiles).toEqual([`${INDEXNOW_KEY}.txt`]);
    expect(fs.readFileSync(path.join(pub, keyFiles[0]), "utf8")).toBe(INDEXNOW_KEY);
  });
});
