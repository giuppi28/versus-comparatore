/**
 * Generates logopack/preview.html (static, file://) and renders preview-light.png / preview-dark.png.
 *   node logopack/tools/preview.mjs
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pack = path.resolve(here, "..");
const require = createRequire(path.join(pack, "..", "app", "package.json"));
const { chromium } = require("playwright");

const SUPPLIERS = [
  ["enel-energia", "Enel Energia"], ["eni-plenitude", "Eni Plenitude"], ["edison-energia", "Edison Energia"],
  ["a2a-energia", "A2A Energia"], ["hera-comm", "Hera Comm"], ["iren", "Iren"], ["acea-energia", "Acea Energia"],
  ["sorgenia", "Sorgenia"], ["engie", "Engie"], ["eon-energia", "E.ON Energia"], ["iberdrola", "Iberdrola"],
];
const VARIANTS = ["color", "black", "white"];

const section = (theme, title) => `
<section class="${theme}" id="${theme}">
  <h2>${title}</h2>
  <div class="grid head"><span></span>${VARIANTS.map((v) => `<span>${v}</span>`).join("")}</div>
  ${SUPPLIERS.map(
    ([slug, name]) => `<div class="grid row"><span class="name">${name}<br><code>${slug}</code></span>${VARIANTS.map(
      (v) => `<span class="cell"><img src="${v}/${slug}.svg" alt="${name} (${v})"></span>`,
    ).join("")}</div>`,
  ).join("\n  ")}
</section>`;

const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>VERSUS logopack</title>
<style>
  body { margin: 0; font: 14px/1.4 system-ui, sans-serif; }
  section { padding: 24px 32px; }
  section.light { background: #ffffff; color: #111; }
  section.dark { background: #0f1a14; color: #f3f3f3; }
  h2 { margin: 0 0 12px; font-size: 18px; }
  .grid { display: grid; grid-template-columns: 200px repeat(3, 260px); gap: 12px; align-items: center; margin-bottom: 10px; }
  .head span { font-weight: 600; text-transform: uppercase; letter-spacing: .06em; font-size: 12px; opacity: .7; }
  code { font-size: 11px; opacity: .6; }
  .cell { display: flex; align-items: center; justify-content: center; height: 64px; border: 1px dashed rgba(128,128,128,.45); border-radius: 8px; }
  /* the dashed outline of the image itself shows the viewBox (padding / clipping) */
  img { height: 48px; width: auto; outline: 1px dotted rgba(255,0,128,.45); }
  .note { font-size: 12px; opacity: .65; margin-top: 8px; }
</style></head><body>
${section("light", "Sfondo chiaro")}
${section("dark", "Sfondo scuro")}
<p class="note" style="padding:0 32px 24px;background:#0f1a14;color:#f3f3f3;margin:0">
  Convention: intrinsic height 48, viewBox = artwork bounds + 5% of artwork height padding on every side. The dotted pink outline is the image box. White variants are invisible on the light background by design; the color variants of Iren (black wordmark) and Hera/Edison (dark ink) are meant for light backgrounds.
</p>
</body></html>`;
writeFileSync(path.join(pack, "preview.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(pack, "preview.html")).href);
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
await page.locator("#light").screenshot({ path: path.join(pack, "preview-light.png") });
await page.locator("#dark").screenshot({ path: path.join(pack, "preview-dark.png") });
await browser.close();
console.log("ok");
