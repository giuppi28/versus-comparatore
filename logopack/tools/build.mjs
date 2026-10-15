/**
 * VERSUS logo pack builder.
 *
 *   node logopack/tools/build.mjs
 *
 * Reads the originals (read-only) from the source folder, cleans them, tightens the
 * viewBox to the rendered artwork bounds, writes color / black / white variants to
 * logopack/<variant>/<slug>.svg and copies the color ones to app/public/logos/.
 * Every output goes through the app's own sanitizer (app/src/lib/svg/sanitize.ts) and
 * must be a fixed point of it (sanitize(out) === out). Black/white variants are checked
 * against the color render: the alpha silhouette must match (shapes are never altered).
 *
 * Needs Node >= 22 (native TypeScript type stripping, to import the sanitizer) and the
 * app's node_modules (xmldom, playwright, sharp).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const appDir = path.join(root, "app");
const require = createRequire(path.join(appDir, "package.json"));
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { chromium } = require("playwright");
const sharp = require("sharp");
const { sanitizeSvg } = await import(pathToFileURL(path.join(appDir, "src/lib/svg/sanitize.ts")).href);

const SRC = "/Users/pippo/Desktop/versus elementi/logopack/originali";
const SVG_NS = "http://www.w3.org/2000/svg";

// slug (suppliers.slug) -> source file (the "logo" variant of MANIFEST.md) + short id prefix
export const LOGOS = [
  { slug: "enel-energia", src: "enel/enel-logo.svg", prefix: "enel" },
  { slug: "eni-plenitude", src: "eni-plenitude/eni-plenitude-logo.svg", prefix: "plen" },
  { slug: "edison-energia", src: "edison/edison-logo.svg", prefix: "edis" },
  { slug: "a2a-energia", src: "a2a/a2a-logo.svg", prefix: "a2a" },
  { slug: "hera-comm", src: "hera/hera-logo.svg", prefix: "hera" },
  { slug: "iren", src: "iren/iren-logo.svg", prefix: "iren" },
  { slug: "acea-energia", src: "acea/acea-logo.svg", prefix: "acea" },
  { slug: "sorgenia", src: "sorgenia/sorgenia-logo.svg", prefix: "sorg" },
  { slug: "engie", src: "engie/engie-logo.svg", prefix: "engi" },
  { slug: "eon-energia", src: "eon/eon-logo.svg", prefix: "eon" },
  { slug: "iberdrola", src: "iberdrola/iberdrola-logo.svg", prefix: "iber" },
];

/** Visual convention: every file has intrinsic height 48 and a uniform 5% (of artwork height) padding. */
const HEIGHT = 48;
const PAD_RATIO = 0.05;
const RENDER_W = 2400;
const ALPHA_MIN = 16;

const VARIANTS = { black: "#000000", white: "#ffffff" };

// ------------------------------------------------------------------ DOM helpers
const parse = (s) => new DOMParser({ onError: () => {} }).parseFromString(s, "image/svg+xml");
const ser = (doc) => new XMLSerializer().serializeToString(doc.documentElement);
const walk = (n, fn) => {
  fn(n);
  for (const c of Array.from(n.childNodes ?? [])) walk(c, fn);
};
const elements = (doc) => {
  const out = [];
  walk(doc.documentElement, (n) => n.nodeType === 1 && out.push(n));
  return out;
};

function stripDoctype(s) {
  return s.replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/i, "");
}

/** Removes editor cruft: foreign namespaces, metadata, comments, unused ids/defs, stray attributes. */
function clean(raw, prefix) {
  const doc = parse(stripDoctype(raw));
  const rootEl = doc.documentElement;
  // 1. foreign elements, metadata, comments, PIs
  const kill = [];
  walk(rootEl, (n) => {
    if (n.nodeType === 8 || n.nodeType === 7) kill.push(n);
    else if (n.nodeType === 1 && (n.namespaceURI !== SVG_NS || n.localName === "metadata" || n.localName === "title" || n.localName === "desc")) kill.push(n);
  });
  for (const n of kill) n.parentNode?.removeChild(n);
  // 2. attributes: keep only plain SVG ones (+ xlink:href)
  for (const el of elements(doc)) {
    for (const a of Array.from(el.attributes)) {
      const n = a.name;
      const drop =
        n === "xmlns" || n.startsWith("xmlns:") || n === "version" || n === "data-name" || n === "baseProfile" ||
        n === "x" && el === rootEl || n === "y" && el === rootEl ||
        (n.includes(":") && n !== "xlink:href") ||
        (n === "style" && /^\s*mask-type\s*:\s*luminance\s*;?\s*$/.test(a.value));
      if (drop) el.removeAttribute(n);
      else if (n === "style" && /mask-type\s*:\s*luminance/.test(a.value)) {
        el.setAttribute("style", a.value.replace(/mask-type\s*:\s*luminance\s*;?/g, ""));
      }
    }
  }
  // size attributes are recomputed later; keep the coordinate system when no viewBox was declared
  if (!rootEl.getAttribute("viewBox")) {
    const w = parseFloat(rootEl.getAttribute("width")), h = parseFloat(rootEl.getAttribute("height"));
    if (!(w > 0 && h > 0)) throw new Error("no viewBox and no width/height");
    rootEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  rootEl.removeAttribute("width");
  rootEl.removeAttribute("height");
  // 3. unused ids / defs, iteratively
  for (;;) {
    const text = ser(doc);
    const refs = new Set();
    for (const m of text.matchAll(/url\(\s*['"]?#([^)'"\s]+)/g)) refs.add(m[1]);
    for (const m of text.matchAll(/(?:xlink:)?href="#([^"]+)"/g)) refs.add(m[1]);
    let changed = false;
    for (const el of elements(doc)) {
      const id = el.getAttribute("id");
      if (!id || refs.has(id)) continue;
      const inDefs = el.parentNode && el.parentNode.localName === "defs";
      if (inDefs) {
        el.parentNode.removeChild(el);
        changed = true;
      } else {
        el.removeAttribute("id");
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const el of elements(doc)) {
    if (el.localName === "defs" && !el.hasChildNodes()) el.parentNode.removeChild(el);
  }
  // 4. unique ids: prefix every remaining id so several logos can live in one document
  const ids = new Map();
  for (const el of elements(doc)) {
    const id = el.getAttribute("id");
    if (id) ids.set(id, `${prefix}-${id}`.replace(/[^\w.:-]/g, "_"));
  }
  const rename = (v) =>
    v
      .replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (m, q, id) => (ids.has(id) ? `url(#${ids.get(id)})` : m))
      .replace(/^#(.+)$/, (m, id) => (ids.has(id) ? `#${ids.get(id)}` : m));
  for (const el of elements(doc)) {
    for (const a of Array.from(el.attributes)) {
      if (a.name === "id") el.setAttribute("id", ids.get(a.value));
      else {
        const nv = rename(a.value);
        if (nv !== a.value) el.setAttribute(a.name, nv);
      }
    }
    if (el.localName === "style") {
      el.textContent = rename(el.textContent);
    }
  }
  return doc;
}

const COLOR_PROPS = ["fill", "stroke", "stop-color"];
const isNone = (v) => /^\s*(none|transparent)\s*$/i.test(v);

/** Recolors every paint to `target`; masks/clips untouched; gradients keep stop-opacity. */
function recolor(doc, target) {
  const rootEl = doc.documentElement;
  const inMask = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentNode) if (n.localName === "mask" || n.localName === "clipPath") return true;
    return false;
  };
  const mapValue = (v) => {
    if (isNone(v)) return v;
    if (/^\s*url\(/i.test(v)) return v; // gradient/pattern: recolor its stops instead
    if (/^\s*inherit\s*$/i.test(v)) return v;
    return target;
  };
  const mapDecls = (css) =>
    css.replace(/(^|[;{\s])(fill|stroke|stop-color)\s*:\s*([^;}]+)/gi, (m, pre, prop, val) => `${pre}${prop}:${mapValue(val.trim())}`);
  for (const el of elements(doc)) {
    if (el.localName === "style") {
      el.textContent = mapDecls(el.textContent);
      continue;
    }
    if (inMask(el)) continue;
    for (const p of COLOR_PROPS) {
      if (el.hasAttribute(p)) el.setAttribute(p, mapValue(el.getAttribute(p)));
    }
    if (el.hasAttribute("style")) el.setAttribute("style", mapDecls(el.getAttribute("style")));
  }
  // root fill: elements without any explicit paint must not fall back to default black
  if (!rootEl.hasAttribute("fill")) rootEl.setAttribute("fill", target);
  return doc;
}

function setViewBox(svgText, vb, w, h) {
  const doc = parse(svgText);
  const r = doc.documentElement;
  r.setAttribute("viewBox", vb.map((n) => +n.toFixed(2)).join(" "));
  r.setAttribute("width", String(+w.toFixed(2)));
  r.setAttribute("height", String(+h.toFixed(2)));
  return ser(doc);
}

function getViewBox(svgText) {
  const doc = parse(svgText);
  const vb = doc.documentElement.getAttribute("viewBox");
  if (!vb) throw new Error("missing viewBox");
  return vb.trim().split(/[\s,]+/).map(Number);
}

// ------------------------------------------------------------------ rendering
let browser;
async function render(svgText, bg = null) {
  // bg: null = transparent PNG; otherwise a CSS color
  const [, , vw, vh] = getViewBox(svgText);
  const W = RENDER_W;
  const H = Math.round((W * vh) / vw);
  const doc = parse(svgText);
  doc.documentElement.setAttribute("width", String(W));
  doc.documentElement.setAttribute("height", String(H));
  const html = `<!doctype html><html><body style="margin:0;background:${bg ?? "transparent"}">${ser(doc)}</body></html>`;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(html);
  const buf = await page.screenshot({ omitBackground: bg === null, clip: { x: 0, y: 0, width: W, height: H } });
  await page.close();
  return { buf, W, H };
}

async function alphaOf(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = new Uint8Array(info.width * info.height);
  for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
  return { a, w: info.width, h: info.height };
}

function bounds({ a, w, h }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (a[y * w + x] >= ALPHA_MIN) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

// ------------------------------------------------------------------ main
export async function build() {
  browser = await chromium.launch();
  const report = [];
  for (const dir of ["color", "black", "white"]) mkdirSync(path.join(root, "logopack", dir), { recursive: true });
  mkdirSync(path.join(appDir, "public", "logos"), { recursive: true });

  for (const L of LOGOS) {
    const raw = readFileSync(path.join(SRC, L.src), "utf8");
    const cleaned = clean(raw, L.prefix);
    const s0 = sanitizeSvg(ser(cleaned)).svg;
    // 1. artwork bounds from the render
    const vb0 = getViewBox(s0);
    const r0 = await render(s0);
    const { W, H } = r0;
    const alpha0 = await alphaOf(r0.buf);
    const b = bounds(alpha0);
    const sx = vb0[2] / W;
    const sy = vb0[3] / H;
    const art = { x: vb0[0] + b.x0 * sx, y: vb0[1] + b.y0 * sy, w: (b.x1 - b.x0) * sx, h: (b.y1 - b.y0) * sy };
    const pad = art.h * PAD_RATIO;
    const vb = [art.x - pad, art.y - pad, art.w + 2 * pad, art.h + 2 * pad];
    const outH = HEIGHT;
    const outW = (outH * vb[2]) / vb[3];

    const colorRaw = setViewBox(s0, vb, outW, outH);
    const color = sanitizeSvg(colorRaw).svg;
    const results = { color };
    for (const [name, hex] of Object.entries(VARIANTS)) {
      const d = recolor(clean(raw, L.prefix), hex);
      results[name] = sanitizeSvg(setViewBox(sanitizeSvg(ser(d)).svg, vb, outW, outH)).svg;
    }
    // 2. checks: fixed point of the sanitizer + silhouette identical across variants
    const refAlpha = await alphaOf((await render(color)).buf);
    const check = {};
    for (const [name, svg] of Object.entries(results)) {
      const again = sanitizeSvg(svg);
      const fixed = again.svg === svg;
      const al = await alphaOf((await render(svg)).buf);
      let diff = 0, ink = 0;
      for (let i = 0; i < al.a.length; i++) {
        if (refAlpha.a[i] >= ALPHA_MIN) ink++;
        diff += Math.abs(al.a[i] - refAlpha.a[i]) > 40 ? 1 : 0;
      }
      const bb = bounds(al);
      const edge = bb.x0 <= 0 || bb.y0 <= 0 || bb.x1 >= al.w || bb.y1 >= al.h;
      check[name] = { fixed, silhouetteDiffPct: +((100 * diff) / ink).toFixed(3), clipped: edge, bytes: Buffer.byteLength(svg), removedOnResanitize: again.removed };
      writeFileSync(path.join(root, "logopack", name, `${L.slug}.svg`), svg);
    }
    copyFileSync(path.join(root, "logopack", "color", `${L.slug}.svg`), path.join(appDir, "public", "logos", `${L.slug}.svg`));
    report.push({ slug: L.slug, src: L.src, viewBox: vb.map((n) => +n.toFixed(2)), size: [+outW.toFixed(2), outH], removedBySanitizer: sanitizeSvg(ser(cleaned)).removed, check });
  }
  await browser.close();
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rep = await build();
  console.log(JSON.stringify(rep, null, 1));
}
