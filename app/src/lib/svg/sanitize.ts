/**
 * Allowlist-based SVG sanitizer for supplier logos (PRD §4.7).
 *
 * Works in any JS runtime (Node, edge): it only needs `@xmldom/xmldom` (pure JS,
 * no jsdom, no eval). The input is parsed as strict XML, walked, and a brand new
 * document is serialised from the nodes/attributes that pass the allowlists, so
 * nothing the parser tolerated can leak into the output verbatim.
 *
 * What survives: basic shapes, groups, text, gradients, clip paths, masks, patterns,
 * `<use>` with local `#id` references, `<title>`/`<desc>`, a restricted `<style>`
 * and raster `<image>` with `data:image/(png|jpeg|gif|webp);base64` only.
 * Everything else is dropped together with its children: scripts, foreignObject,
 * animation (`set`/`animate*`), filters, `<a>`, iframes, other XML namespaces,
 * comments, processing instructions, CDATA wrappers and DOCTYPE/ENTITY declarations.
 *
 * Throws `SvgSanitizeError` (code + Italian message) when the input cannot be
 * turned into a safe SVG at all.
 */
import { DOMParser } from "@xmldom/xmldom";

export const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

/** Same limit as MAX_LOGO_BYTES in the data layer. */
export const MAX_SVG_BYTES = 200_000;
const MAX_NODES = 20_000;
const MAX_DEPTH = 40;

export type SvgSanitizeErrorCode = "empty" | "too_large" | "invalid_xml" | "not_svg" | "too_complex" | "nothing_left";

const MESSAGES: Record<SvgSanitizeErrorCode, string> = {
  empty: "Il file è vuoto.",
  too_large: "Il file supera il limite di 200 KB.",
  invalid_xml: "Il file non è un SVG valido.",
  not_svg: "Il file non è un SVG: carica un logo in formato SVG.",
  too_complex: "L'SVG è troppo complesso.",
  nothing_left: "L'SVG non contiene elementi grafici utilizzabili.",
};

export class SvgSanitizeError extends Error {
  readonly code: SvgSanitizeErrorCode;
  /** Italian message, safe to show to the admin. */
  readonly userMessage: string;
  constructor(code: SvgSanitizeErrorCode) {
    super(`SVG rejected: ${code}`);
    this.name = "SvgSanitizeError";
    this.code = code;
    this.userMessage = MESSAGES[code];
  }
}

export interface SanitizeResult {
  svg: string;
  /** Human-readable list of what was stripped (e.g. "<script>", "onclick"), deduplicated. */
  removed: string[];
}

// ---------------------------------------------------------------------------
// Allowlists
// ---------------------------------------------------------------------------

const ELEMENTS = new Set([
  "svg", "g", "defs", "symbol", "use", "title", "desc", "style",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "textPath",
  "linearGradient", "radialGradient", "stop", "clipPath", "mask", "pattern",
  "image",
]);

/** Elements whose own `href` may point to a local `#id`. */
const LOCAL_HREF_ELEMENTS = new Set(["use", "linearGradient", "radialGradient", "pattern", "textPath"]);

const ATTRIBUTES = new Set([
  // structure / geometry
  "id", "class", "style", "transform", "viewBox", "preserveAspectRatio", "version", "x", "y", "width", "height",
  "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2", "d", "points", "pathLength", "data-name",
  // paint / presentation
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity", "color",
  "display", "visibility", "clip-path", "clip-rule", "mask", "stop-color", "stop-opacity", "offset",
  "overflow", "vector-effect", "shape-rendering", "paint-order",
  // gradients, clip, mask, pattern
  "gradientUnits", "gradientTransform", "spreadMethod", "fx", "fy", "fr", "clipPathUnits", "maskUnits",
  "maskContentUnits", "patternUnits", "patternContentUnits", "patternTransform",
  // text
  "font-family", "font-size", "font-weight", "font-style", "font-variant", "text-anchor", "text-decoration",
  "letter-spacing", "word-spacing", "dx", "dy", "rotate", "textLength", "lengthAdjust", "dominant-baseline",
  "alignment-baseline", "baseline-shift", "startOffset", "method", "spacing", "writing-mode",
]);

/** CSS properties allowed inside `style=""` attributes and `<style>` rules. */
const CSS_PROPERTIES = new Set(
  [...ATTRIBUTES].filter(
    (a) =>
      !/^(id|class|style|transform|viewBox|preserveAspectRatio|version|d|points|pathLength|data-name|x|y|cx|cy|r|rx|ry|x1|y1|x2|y2|width|height)$/.test(a) &&
      !/(Units|Transform|spreadMethod|textLength|lengthAdjust|startOffset|method|spacing|rotate|dx|dy|offset)$/.test(a),
  ),
);
CSS_PROPERTIES.add("transform");

const LOCAL_REF = /^#[A-Za-z_][\w.:-]*$/;
const SAFE_ID = /^[A-Za-z_][\w.:-]*$/;
const SAFE_RASTER = /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i;
const SAFE_SELECTOR = /^[\w\s.#,>*+~:()-]+$/;

// ---------------------------------------------------------------------------
// Value checks
// ---------------------------------------------------------------------------

/** Every `url(...)` must be a bare local reference `url(#id)`. */
function onlyLocalUrls(value: string): boolean {
  const re = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
  let rest = value;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const target = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (!LOCAL_REF.test(target)) return false;
    rest = rest.replace(m[0], "");
  }
  // A "url(" the regexp could not parse (unterminated, odd spacing) is rejected.
  return !/url\s*\(/i.test(rest);
}

/** Generic value screening for any attribute/CSS value we keep. */
function isSafeValue(value: string): boolean {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return false;
  if (/[<\\]/.test(value)) return false; // CSS escapes could hide "url", "javascript", ...
  if (/javascript\s*:|vbscript\s*:|data\s*:|expression\s*\(|@import|behaviou?r\s*:|-moz-binding|image-set\s*\(|\bsrc\s*\(/i.test(value)) {
    return false;
  }
  return onlyLocalUrls(value);
}

/** Strips CSS comments; returns null when a comment is left open. */
function stripCssComments(css: string): string | null {
  const out = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return out.includes("/*") || out.includes("*/") ? null : out;
}

/** Keeps only allowlisted `prop: value` declarations. */
function sanitizeDeclarations(css: string, removed: Set<string>): string {
  const clean = stripCssComments(css);
  if (clean === null) {
    removed.add("style");
    return "";
  }
  const kept: string[] = [];
  for (const decl of clean.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) {
      if (decl.trim()) removed.add("style");
      continue;
    }
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim().replace(/\s*!important\s*$/i, "");
    if (CSS_PROPERTIES.has(prop) && value && isSafeValue(value) && !/[{}]/.test(value)) {
      kept.push(`${prop}:${value}`);
    } else if (prop || value) {
      removed.add(`style:${prop || "?"}`);
    }
  }
  return kept.join(";");
}

/** Sanitizes the contents of a `<style>` element: plain `selector { decls }` rules only. */
function sanitizeStylesheet(css: string, removed: Set<string>): string {
  const clean = stripCssComments(css);
  if (clean === null) {
    removed.add("<style>");
    return "";
  }
  const rules: string[] = [];
  // No at-rules, no nesting: anything containing "@" or nested braces is dropped.
  const re = /([^{}]*)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const selector = m[1].trim();
    if (!selector || selector.includes("@") || !SAFE_SELECTOR.test(selector)) {
      removed.add("<style> rule");
      continue;
    }
    const decls = sanitizeDeclarations(m[2], removed);
    if (decls) rules.push(`${selector.replace(/\s+/g, " ")}{${decls}}`);
  }
  // Anything outside "selector { ... }" (at-rules like @import, stray text) is dropped.
  if (clean.replace(re, "").trim()) removed.add("<style> rule");
  return rules.join("\n");
}

// ---------------------------------------------------------------------------
// Serialisation helpers
// ---------------------------------------------------------------------------

const escText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => escText(s).replace(/"/g, "&quot;");

interface Ctx {
  removed: Set<string>;
  nodes: number;
  usesXlink: boolean;
}

// Minimal structural types so we do not depend on DOM lib typings for xmldom nodes.
interface XNode {
  nodeType: number;
  nodeName: string;
  localName?: string | null;
  namespaceURI?: string | null;
  nodeValue?: string | null;
  textContent?: string | null;
  childNodes: ArrayLike<XNode>;
  attributes?: ArrayLike<XAttr>;
}
interface XAttr {
  name: string;
  localName: string;
  namespaceURI: string | null;
  prefix: string | null;
  value: string;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_NODE = 4;

function serializeAttributes(el: XNode, name: string, ctx: Ctx): string {
  let out = "";
  const seen = new Set<string>();
  const attrs = el.attributes ?? [];
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    const ns = a.namespaceURI;
    const local = a.localName || a.name;
    const value = a.value;
    // Namespace declarations are re-created by us, never copied.
    if (a.name === "xmlns" || a.prefix === "xmlns") continue;

    let outName: string | null = null;
    if (!ns || ns === "") {
      if (/^on/i.test(local)) {
        ctx.removed.add(local.toLowerCase());
        continue;
      }
      if (local === "href") {
        // SVG 2 plain href.
        outName = "href";
      } else if (ATTRIBUTES.has(local)) {
        outName = local;
      } else {
        ctx.removed.add(local);
        continue;
      }
    } else if (ns === XLINK_NS && local === "href") {
      outName = "xlink:href";
    } else if (ns === XML_NS && local === "space" && (value === "preserve" || value === "default")) {
      outName = "xml:space";
    } else {
      ctx.removed.add(a.name);
      continue;
    }

    let outValue = value;
    if (outName === "href" || outName === "xlink:href") {
      const v = value.trim();
      const ok =
        (LOCAL_HREF_ELEMENTS.has(name) && LOCAL_REF.test(v)) || (name === "image" && SAFE_RASTER.test(v));
      if (!ok) {
        ctx.removed.add(`${outName}`);
        continue;
      }
      outValue = v;
      if (outName === "xlink:href") ctx.usesXlink = true;
    } else if (outName === "style") {
      outValue = sanitizeDeclarations(value, ctx.removed);
      if (!outValue) continue;
    } else if (outName === "id") {
      if (!SAFE_ID.test(value)) {
        ctx.removed.add("id");
        continue;
      }
    } else if (outName !== "xml:space" && !isSafeValue(value)) {
      ctx.removed.add(outName);
      continue;
    }

    if (seen.has(outName)) continue;
    seen.add(outName);
    out += ` ${outName}="${escAttr(outValue)}"`;
  }
  return out;
}

function textOf(node: XNode): string {
  let s = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes[i];
    if (c.nodeType === TEXT_NODE || c.nodeType === CDATA_NODE) s += c.nodeValue ?? "";
  }
  return s;
}

function serializeElement(el: XNode, depth: number, ctx: Ctx): string {
  if (++ctx.nodes > MAX_NODES || depth > MAX_DEPTH) throw new SvgSanitizeError("too_complex");
  const name = el.localName ?? el.nodeName;

  if (el.namespaceURI !== SVG_NS || !ELEMENTS.has(name)) {
    ctx.removed.add(`<${el.nodeName}>`);
    return "";
  }

  const attrs = serializeAttributes(el, name, ctx);
  if (name === "style") {
    const css = sanitizeStylesheet(textOf(el), ctx.removed);
    return css ? `<style>${escText(css)}</style>` : "";
  }
  if (name === "title" || name === "desc") {
    const t = textOf(el).trim();
    return t ? `<${name}>${escText(t)}</${name}>` : "";
  }

  let inner = "";
  for (let i = 0; i < el.childNodes.length; i++) {
    const c = el.childNodes[i];
    if (c.nodeType === ELEMENT_NODE) {
      inner += serializeElement(c, depth + 1, ctx);
    } else if (c.nodeType === TEXT_NODE || c.nodeType === CDATA_NODE) {
      // Text is only meaningful inside text-bearing elements; elsewhere it is whitespace.
      if (name === "text" || name === "tspan" || name === "textPath") inner += escText(c.nodeValue ?? "");
    } else {
      // Comments, processing instructions, doctype fragments.
      ctx.removed.add(c.nodeType === 8 ? "comment" : c.nodeType === 7 ? "processing instruction" : "node");
    }
  }
  return inner ? `<${name}${attrs}>${inner}</${name}>` : `<${name}${attrs}/>`;
}

/** Removes the DOCTYPE (including an internal subset with ENTITY declarations). */
function stripDoctype(input: string, removed: Set<string>): string {
  const start = input.search(/<!DOCTYPE/i);
  if (start < 0) {
    if (/<!ENTITY/i.test(input)) removed.add("ENTITY");
    return input.replace(/<!ENTITY[^>]*>/gi, "");
  }
  let i = start + 9;
  let bracket = 0;
  let quote: string | null = null;
  for (; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket = Math.max(0, bracket - 1);
    else if (ch === ">" && bracket === 0) break;
  }
  removed.add("DOCTYPE");
  return input.slice(0, start) + input.slice(i + 1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function sanitizeSvg(input: string): SanitizeResult {
  if (typeof input !== "string" || input.trim() === "") throw new SvgSanitizeError("empty");
  if (new TextEncoder().encode(input).length > MAX_SVG_BYTES) throw new SvgSanitizeError("too_large");

  const removed = new Set<string>();
  let source = input.replace(/^﻿/, "");
  source = stripDoctype(source, removed);

  let doc;
  try {
    doc = new DOMParser({
      // xmldom reports errors through this hook; any error or fatal error aborts.
      onError: (level, msg) => {
        if (level !== "warning") throw new Error(msg);
      },
    }).parseFromString(source, "image/svg+xml");
  } catch {
    throw new SvgSanitizeError("invalid_xml");
  }

  const root = doc?.documentElement as unknown as XNode | null;
  if (!root) throw new SvgSanitizeError("invalid_xml");
  if (root.localName !== "svg" || root.namespaceURI !== SVG_NS) throw new SvgSanitizeError("not_svg");

  const ctx: Ctx = { removed, nodes: 0, usesXlink: false };
  const body = serializeElement(root, 0, ctx);
  if (!body) throw new SvgSanitizeError("not_svg");

  // Root: add the namespace declarations we control.
  const head = `<svg xmlns="${SVG_NS}"${ctx.usesXlink ? ` xmlns:xlink="${XLINK_NS}"` : ""}`;
  const svg = head + body.slice("<svg".length);

  // Must keep at least one drawable element.
  if (!/<(path|rect|circle|ellipse|line|polyline|polygon|text|image|use)[\s/>]/.test(svg)) {
    throw new SvgSanitizeError("nothing_left");
  }
  if (new TextEncoder().encode(svg).length > MAX_SVG_BYTES) throw new SvgSanitizeError("too_large");
  return { svg, removed: [...removed].sort() };
}
