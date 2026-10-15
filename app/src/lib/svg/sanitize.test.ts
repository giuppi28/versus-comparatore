import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_SVG_BYTES, SvgSanitizeError, sanitizeSvg } from "./sanitize";

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const wrap = (inner: string, attrs = "") => `<svg ${NS} ${attrs} viewBox="0 0 10 10">${inner}</svg>`;
const SHAPE = '<rect width="5" height="5" fill="#0a8045"/>';

/** Sanitizes and returns the output (the malicious sample must not throw unless stated). */
const clean = (inner: string, attrs = "") => sanitizeSvg(wrap(SHAPE + inner, attrs)).svg;

function rejectCode(input: string): string {
  try {
    sanitizeSvg(input);
  } catch (e) {
    expect(e).toBeInstanceOf(SvgSanitizeError);
    return (e as SvgSanitizeError).code;
  }
  throw new Error("expected rejection");
}

/** Nothing executable/external may survive in any output. */
function expectInert(out: string) {
  expect(out).not.toMatch(/<script/i);
  expect(out).not.toMatch(/<foreignObject/i);
  expect(out).not.toMatch(/\son[a-z]+\s*=/i);
  expect(out).not.toMatch(/javascript:/i);
  expect(out).not.toMatch(/https?:\/\/(?!www\.w3\.org\/(2000\/svg|1999\/xlink))/i);
  expect(out).not.toMatch(/<!DOCTYPE|<!ENTITY|<\?/i);
  expect(out).not.toMatch(/<(iframe|embed|object|animate|set|a)[\s>/]/i);
}

describe("sanitizeSvg: output shape", () => {
  it("keeps a clean logo and always sets the SVG namespace", () => {
    const { svg, removed } = sanitizeSvg(
      `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z" fill="#0a8045"/></svg>`,
    );
    expect(svg).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z" fill="#0a8045"/></svg>`);
    expect(removed).toEqual([]);
  });

  it("keeps all allowed shapes, gradients, clip paths, masks, text and local use", () => {
    const input = wrap(
      `<title>Logo</title><desc>d</desc><defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
        <radialGradient id="g2" cx="5" cy="5" r="5" fx="2"><stop offset="0" stop-color="red"/></radialGradient>
        <clipPath id="c1"><circle cx="5" cy="5" r="4"/></clipPath>
        <mask id="m1"><rect width="10" height="10" fill="#fff"/></mask>
        <symbol id="s1" viewBox="0 0 2 2"><path d="M0 0h2v2z"/></symbol>
        <pattern id="p1" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="1" height="1"/></pattern>
      </defs>
      <g transform="translate(1 1)" clip-path="url(#c1)" mask="url(#m1)">
        <rect x="0" y="0" width="3" height="3" rx="1" fill="url(#g1)"/>
        <circle cx="5" cy="5" r="2" fill="url(#g2)"/><ellipse cx="1" cy="1" rx="1" ry="2"/>
        <line x1="0" y1="0" x2="1" y2="1" stroke="#000" stroke-width="2"/>
        <polyline points="0,0 1,1 2,0"/><polygon points="0,0 1,1 2,0" fill="url(#p1)"/>
        <text x="1" y="9" font-family="Arial" font-size="3"><tspan dx="1">Ciao &amp; ciao</tspan></text>
        <use href="#s1" x="1"/><use xlink:href="#s1" xmlns:xlink="http://www.w3.org/1999/xlink"/>
      </g>`,
    );
    const { svg, removed } = sanitizeSvg(input);
    for (const tag of [
      "title", "desc", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "symbol",
      "pattern", "g", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "use",
    ]) {
      expect(svg, tag).toContain(`<${tag}`);
    }
    expect(svg).toContain('href="#s1"');
    expect(svg).toContain('xlink:href="#s1"');
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg).toContain("Ciao &amp; ciao");
    expect(svg).toContain('fill="url(#g1)"');
    expect(svg).toContain('clip-path="url(#c1)"');
    expect(removed).toEqual([]);
  });

  it("reports what it removed", () => {
    const { removed } = sanitizeSvg(wrap(`${SHAPE}<script>alert(1)</script><g onclick="x()"/>`));
    expect(removed).toEqual(expect.arrayContaining(["<script>", "onclick"]));
  });

  it("strips a BOM and handles XML declaration + comments", () => {
    const { svg } = sanitizeSvg(`﻿<?xml version="1.0" encoding="UTF-8"?><!-- c -->${wrap(SHAPE)}`);
    expect(svg).toContain("<rect");
    expect(svg).not.toContain("<!--");
  });
});

describe("sanitizeSvg: rejections", () => {
  it.each([
    ["empty string", "", "empty"],
    ["whitespace only", "   \n ", "empty"],
    ["not xml", "this is not svg", "invalid_xml"],
    ["unclosed tag", `<svg ${NS}><g></svg>`, "invalid_xml"],
    ["html page", "<html><body><svg></svg></body></html>", "not_svg"],
    ["non-svg root", "<div>hi</div>", "not_svg"],
    ["svg with foreign namespace", '<svg xmlns="http://evil.example/ns"><rect/></svg>', "not_svg"],
    ["only scripts", wrap("<script>alert(1)</script>"), "nothing_left"],
    ["no drawable content", wrap("<g/>"), "nothing_left"],
    ["undefined entity", wrap("<text>&xxe;</text>"), "invalid_xml"],
  ])("%s", (_name, input, code) => {
    expect(rejectCode(input)).toBe(code);
  });

  it("accepts an svg root without xmlns and adds the namespace", () => {
    const { svg } = sanitizeSvg("<svg viewBox='0 0 1 1'><rect width='1' height='1'/></svg>");
    expect(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg"`)).toBe(true);
  });

  it("rejects non-string input", () => {
    expect(rejectCode(undefined as unknown as string)).toBe("empty");
  });

  it("rejects files over the size limit", () => {
    const big = wrap(`<path d="${"M0 0".repeat(MAX_SVG_BYTES)}"/>`);
    expect(rejectCode(big)).toBe("too_large");
  });

  it("rejects absurd nesting depth", () => {
    const deep = wrap("<g>".repeat(60) + SHAPE + "</g>".repeat(60));
    expect(rejectCode(deep)).toBe("too_complex");
  });

  it("rejects an excessive number of nodes", () => {
    const many = wrap(Array.from({ length: 21_000 }, () => "<g/>").join("") + SHAPE);
    expect(rejectCode(many)).toBe("too_complex");
  });

  it("exposes an Italian user message", () => {
    try {
      sanitizeSvg("nope");
    } catch (e) {
      expect((e as SvgSanitizeError).userMessage).toMatch(/SVG/);
    }
  });
});

describe("sanitizeSvg: scripts and active elements", () => {
  it.each([
    ["script", "<script>alert(1)</script>"],
    ["script with src", '<script href="https://evil.example/x.js"/>'],
    ["script xlink", '<script xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="data:text/javascript,alert(1)"/>'],
    ["script CDATA", "<script><![CDATA[alert(1)]]></script>"],
    ["namespaced script", '<s:script xmlns:s="http://www.w3.org/2000/svg">alert(1)</s:script>'],
    ["nested script", "<g><g><script>alert(1)</script></g></g>"],
    ["foreignObject html", '<foreignObject width="10" height="10"><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror="alert(1)"/></body></foreignObject>'],
    ["foreignObject iframe", '<foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" src="https://evil.example"/></foreignObject>'],
    ["iframe", '<iframe src="https://evil.example"/>'],
    ["svg-ns iframe", '<iframe xmlns="http://www.w3.org/1999/xhtml" src="javascript:alert(1)"/>'],
    ["embed", '<embed src="https://evil.example/x.swf"/>'],
    ["object", '<object data="https://evil.example"/>'],
    ["animate href", '<a><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a>'],
    ["set href", '<set attributeName="onmouseover" to="alert(1)"/>'],
    ["animate on parent", '<g><animate attributeName="xlink:href" to="javascript:alert(1)"/></g>'],
    ["animateTransform", '<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s"/>'],
    ["animateMotion", '<animateMotion path="M0 0" dur="1s"/>'],
    ["a javascript", '<a href="javascript:alert(1)"><text>x</text></a>'],
    ["a xlink javascript", '<a xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="javascript:alert(1)"><text>x</text></a>'],
    ["handler: onload", '<g onload="alert(1)"/>'],
    ["handler: onclick", '<rect width="1" height="1" onclick="alert(1)"/>'],
    ["handler: uppercase", '<rect width="1" height="1" ONCLICK="alert(1)"/>'],
    ["handler: onmouseover", '<circle r="1" onmouseover="alert(1)"/>'],
    ["handler: onbegin", '<rect width="1" height="1" onbegin="alert(1)"/>'],
    ["handler: onerror on image", '<image href="x" onerror="alert(1)"/>'],
    ["meta/html link", '<link xmlns="http://www.w3.org/1999/xhtml" rel="stylesheet" href="https://evil.example/x.css"/>'],
    ["html script via xhtml ns", '<script xmlns="http://www.w3.org/1999/xhtml">alert(1)</script>'],
    ["handler: onfocus autofocus", '<text onfocus="alert(1)" autofocus="1" tabindex="1">x</text>'],
    ["filter with feImage", '<filter id="f"><feImage href="https://evil.example/x.png"/></filter>'],
  ])("%s", (_name, inner) => {
    const out = clean(inner, 'onload="alert(1)"');
    expectInert(out);
    expect(out).toContain("<rect"); // the legit shape survives
    expect(out).not.toMatch(/<(filter|feImage|link)\b/);
    expect(out).not.toContain("alert");
  });

  it("drops the children of removed elements", () => {
    const out = clean('<foreignObject><text>kept?</text></foreignObject>');
    expect(out).not.toContain("kept?");
  });

  it("drops unknown prefixed attributes and foreign-namespace elements (Inkscape/Adobe)", () => {
    const out = sanitizeSvg(
      `<svg ${NS} xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" inkscape:version="1" viewBox="0 0 1 1">
        <sodipodi:namedview id="nv"/><metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></metadata>
        <rect inkscape:label="x" sodipodi:nodetypes="cc" width="1" height="1"/></svg>`,
    );
    expect(out.svg).not.toMatch(/inkscape|sodipodi|metadata|rdf/);
    expect(out.svg).toContain("<rect");
  });
});

describe("sanitizeSvg: references and URLs", () => {
  it.each([
    ["use external file", '<use href="https://evil.example/x.svg#a"/>'],
    ["use xlink external", '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://evil.example/x.svg#a"/>'],
    ["use protocol-relative", '<use href="//evil.example/x.svg#a"/>'],
    ["use relative file", '<use href="other.svg#a"/>'],
    ["use data svg", '<use href="data:image/svg+xml;base64,PHN2Zy8+#a"/>'],
    ["use javascript", '<use href="javascript:alert(1)"/>'],
    ["image external", '<image href="https://evil.example/x.png" width="1" height="1"/>'],
    ["image data svg", '<image href="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+" width="1" height="1"/>'],
    ["image data html", '<image href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" width="1" height="1"/>'],
    ["image javascript", '<image href="javascript:alert(1)" width="1" height="1"/>'],
    ["image with spaces/tabs in scheme", '<image href="java&#9;script:alert(1)" width="1" height="1"/>'],
    ["image newline scheme", '<image href="jav&#10;ascript:alert(1)" width="1" height="1"/>'],
    ["image entity scheme", '<image href="&#106;avascript:alert(1)" width="1" height="1"/>'],
    ["fill external url", '<rect width="1" height="1" fill="url(https://evil.example/x.svg#a)"/>'],
    ["fill quoted external url", `<rect width="1" height="1" fill="url('https://evil.example/x.svg#a')"/>`],
    ["fill protocol-relative url", '<rect width="1" height="1" fill="url(//evil.example/x#a)"/>'],
    ["fill file url", '<rect width="1" height="1" fill="url(x.svg#a)"/>'],
    ["fill data url", '<rect width="1" height="1" fill="url(data:image/svg+xml;base64,AAAA)"/>'],
    ["fill javascript url", '<rect width="1" height="1" fill="url(javascript:alert(1))"/>'],
    ["clip-path external", '<rect width="1" height="1" clip-path="url(https://evil.example/c.svg#c)"/>'],
    ["mask external", '<rect width="1" height="1" mask="url(https://evil.example/c.svg#c)"/>'],
    ["style attr url", '<rect width="1" height="1" style="fill:url(https://evil.example/x#a)"/>'],
    ["style attr background", '<rect width="1" height="1" style="background:url(https://evil.example/x.png)"/>'],
    ["style attr import", '<rect width="1" height="1" style="@import url(https://evil.example/x.css)"/>'],
    ["style attr expression", '<rect width="1" height="1" style="width:expression(alert(1))"/>'],
    ["style attr -moz-binding", '<rect width="1" height="1" style="-moz-binding:url(https://evil.example/x.xml#a)"/>'],
    ["style attr escape", '<rect width="1" height="1" style="fill:u\\72l(https://evil.example/x)"/>'],
    ["style attr escape javascript", '<rect width="1" height="1" style="fill:\\6a avascript:alert(1)"/>'],
    ["style attr behavior", '<rect width="1" height="1" style="behavior:url(x.htc)"/>'],
    ["style attr image-set", '<rect width="1" height="1" style="fill:image-set(\'https://evil.example/x.png\' 1x)"/>'],
    ["style attr comment trick", '<rect width="1" height="1" style="fill:ur/**/l(https://evil.example/x)"/>'],
    ["style attr unterminated comment", '<rect width="1" height="1" style="fill:red/*;background:url(https://evil.example/x)"/>'],
    ["gradient href external", '<linearGradient id="g" href="https://evil.example/g.svg#a"/>'],
    ["pattern href external", '<pattern id="p" width="1" height="1" href="https://evil.example/p.svg#a"/>'],
    ["textPath external", '<text><textPath href="https://evil.example/x.svg#p">x</textPath></text>'],
  ])("%s", (_name, inner) => {
    const out = clean(inner);
    expectInert(out);
    expect(out).not.toMatch(/evil\.example|alert|javascript|data:|expression|import|binding/i);
    expect(out).toContain("<rect");
  });

  it("keeps safe raster data images", () => {
    const px = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const out = clean(`<image href="data:image/png;base64,${px}" width="1" height="1"/>`);
    expect(out).toContain(`href="data:image/png;base64,${px}"`);
  });

  it("keeps local url() references in attributes and styles", () => {
    const out = clean('<rect width="1" height="1" fill="url(#g)" style="fill:url(#g);stroke:url(\'#h\')"/>');
    expect(out).toContain('fill="url(#g)"');
    expect(out).toContain("fill:url(#g);stroke:url('#h')");
  });

  it("rejects ids that could break out of selectors", () => {
    const out = clean('<g id="a b"/><g id="ok-1"/>');
    expect(out).not.toContain('id="a b"');
    expect(out).toContain('id="ok-1"');
  });

  it("does not let attribute values break out of the attribute", () => {
    const out = clean('<g class="x&quot; onmouseover=&quot;alert(1)"/>', "");
    // The quote stays escaped, so the value remains a single attribute (no new onmouseover attribute).
    expect(out).toMatch(/<g class="x&quot; onmouseover=&quot;alert\(1\)"\/>/);
  });
});

describe("sanitizeSvg: <style>", () => {
  it("keeps simple, safe rules", () => {
    const out = clean(`<style>.a{fill:#fff;stroke:#000}\n#b,.c>rect{opacity:.5}</style>`);
    expect(out).toContain("<style>");
    expect(out).toContain(".a{fill:#fff;stroke:#000}");
    expect(out).toContain("opacity:.5");
  });

  it("keeps CDATA-wrapped CSS (Illustrator) as escaped text", () => {
    const out = clean(`<style type="text/css"><![CDATA[.st0{fill:#E30613;}]]></style>`);
    expect(out).toContain(".st0{fill:#e30613;}".replace(";}", "}").replace("#e30613", "#E30613"));
  });

  it.each([
    ["@import", "@import url(https://evil.example/x.css); .a{fill:red}"],
    ["@import string", '@import "https://evil.example/x.css"; .a{fill:red}'],
    ["@font-face", "@font-face{font-family:x;src:url(https://evil.example/f.woff)} .a{fill:red}"],
    ["@media nesting", "@media screen{.a{fill:url(https://evil.example/x)}}"],
    ["url external", ".a{fill:url(https://evil.example/x.svg#a)}"],
    ["url data", ".a{fill:url(data:image/svg+xml;base64,AAAA)}"],
    ["background", ".a{background-image:url(https://evil.example/x.png)}"],
    ["expression", ".a{width:expression(alert(1))}"],
    ["behavior", ".a{behavior:url(x.htc)}"],
    ["-moz-binding", ".a{-moz-binding:url(https://evil.example/x.xml#a)}"],
    ["css escape", ".a{fill:\\75rl(https://evil.example/x)}"],
    ["selector with attribute", 'a[href^="javascript:"]{fill:red}'],
    ["selector html injection", "</style><script>alert(1)</script><style>"],
    ["javascript url", ".a{fill:url(javascript:alert(1))}"],
    ["position fixed overlay", ".a{position:fixed;top:0;left:0;width:100vw;height:100vh}"],
    ["content", ".a::before{content:'x'}"],
  ])("%s", (_name, css) => {
    let out: string;
    try {
      out = clean(`<style>${css.replace(/</g, "&lt;")}</style>`);
    } catch {
      // The raw "</style><script>" sample is invalid XML once unescaped; escaped version must still be inert.
      return;
    }
    expectInert(out);
    expect(out).not.toMatch(/evil\.example|alert|import|expression|binding|behavior|position|content|@/i);
    expect(out).toContain("<rect");
  });

  it("drops the style element entirely when nothing safe remains", () => {
    const out = clean("<style>@import url(https://evil.example/x.css);</style>");
    expect(out).not.toContain("<style");
  });

  it("injects no markup through the style text", () => {
    const out = clean("<style>.a{fill:red}</style><style>&lt;script&gt;alert(1)&lt;/script&gt;</style>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert");
  });
});

describe("sanitizeSvg: DOCTYPE, entities and XML tricks", () => {
  it("strips DOCTYPE with an internal ENTITY subset and rejects the entity use", () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg ${NS}><rect width="1" height="1"/><text>&xxe;</text></svg>`;
    expect(rejectCode(xxe)).toBe("invalid_xml");
  });

  it("strips DOCTYPE with unused entities and keeps the drawing", () => {
    const { svg, removed } = sanitizeSvg(
      `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]><svg ${NS}><rect width="1" height="1"/></svg>`,
    );
    expect(svg).toContain("<rect");
    expectInert(svg);
    expect(removed).toContain("DOCTYPE");
  });

  it("billion-laughs entity expansion is neutralised", () => {
    const lol = `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;"><!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">]><svg ${NS}><rect width="1" height="1"/><text>&lol3;</text></svg>`;
    expect(rejectCode(lol)).toBe("invalid_xml");
  });

  it("external DTD reference is dropped", () => {
    const { svg } = sanitizeSvg(
      `<!DOCTYPE svg SYSTEM "https://evil.example/evil.dtd"><svg ${NS}><rect width="1" height="1"/></svg>`,
    );
    expect(svg).not.toContain("evil");
  });

  it("processing instructions (xml-stylesheet) are dropped", () => {
    const out = sanitizeSvg(
      `<?xml-stylesheet href="https://evil.example/x.css" type="text/css"?><svg ${NS}><?php echo 1 ?><rect width="1" height="1"/></svg>`,
    );
    expect(out.svg).not.toMatch(/evil|php|stylesheet|<\?/);
  });

  it("comments (incl. conditional/IE tricks) are dropped", () => {
    const out = clean("<!--[if IE]><script>alert(1)</script><![endif]-->");
    expect(out).not.toMatch(/<!--|alert/);
  });

  it("stray text outside text elements is dropped", () => {
    const out = clean("hello &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out).not.toContain("hello");
    expect(out).not.toContain("alert");
  });

  it("text content inside <text> is escaped, not interpreted", () => {
    const out = clean("<text>&lt;script&gt;alert(1)&lt;/script&gt;</text>");
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script&gt;");
  });

  it("null bytes and control characters in values are refused", () => {
    const out = clean('<rect width="1" height="1" fill="java&#1;script:alert(1)"/>');
    expect(out).not.toMatch(/javascript|alert/i);
  });

  it("CDATA inside text is serialised as escaped text", () => {
    const out = clean("<text><![CDATA[a<b&c]]></text>");
    expect(out).toContain("<text>a&lt;b&amp;c</text>");
  });

  it("duplicate attributes cannot be smuggled (parser rejects)", () => {
    expect(rejectCode(wrap('<rect width="1" width="2" height="1"/>'))).toBe("invalid_xml");
  });

  it("is idempotent: sanitizing the output again changes nothing", () => {
    const once = sanitizeSvg(wrap(`${SHAPE}<g onclick="x()"><text>t</text></g><script>1</script>`)).svg;
    const twice = sanitizeSvg(once);
    expect(twice.svg).toBe(once);
    expect(twice.removed).toEqual([]);
  });
});

describe("sanitizeSvg: real supplier logos keep their shapes", () => {
  const dir = path.join(__dirname, "__fixtures__");
  const files = readdirSync(dir).filter((f) => f.endsWith(".svg"));
  const count = (s: string, tag: string) => (s.match(new RegExp(`<${tag}[\\s/>]`, "g")) ?? []).length;

  it("has fixtures", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it.each(files)("%s", (file) => {
    const original = readFileSync(path.join(dir, file), "utf8");
    const { svg } = sanitizeSvg(original);
    expectInert(svg);
    expect(svg).toMatch(/viewBox="/);
    // Every drawing primitive in the original is still there.
    for (const tag of ["path", "rect", "polygon", "circle", "linearGradient", "stop", "clipPath", "mask"]) {
      const inOriginal = count(original.replace(/<metadata[\s\S]*?<\/metadata>/g, ""), tag);
      expect(count(svg, tag), `${file} <${tag}>`).toBe(inOriginal);
    }
    // Path data is copied verbatim.
    const d = original.match(/\sd="([^"]{20,})"/)?.[1];
    expect(d && svg.includes(d.replace(/&/g, "&amp;"))).toBeTruthy();
    expect(new TextEncoder().encode(svg).length).toBeLessThanOrEqual(MAX_SVG_BYTES);
  });

  it("Hera: DOCTYPE + Inkscape comment removed, inline style preserved", () => {
    const original = readFileSync(path.join(dir, "versus__hera__wikimedia__Hera_logo.svg"), "utf8");
    const { svg, removed } = sanitizeSvg(original);
    expect(removed).toContain("DOCTYPE");
    expect(svg).toContain("fill:#e0058c");
    expect(svg).not.toContain("Inkscape");
  });

  it("Illustrator/Sketch logo with <style> keeps its classes", () => {
    const original = readFileSync(path.join(dir, "versus__iberdrola__wikimedia__Logo_Iberdrola_2023.svg"), "utf8");
    const { svg } = sanitizeSvg(original);
    expect(svg).toContain("<style>");
  });
});
