// @vitest-environment node
/**
 * LEAD_API_SECRET is server-only: no client-reachable source may reference it.
 * Client-reachable = any file under src/components, any file marked "use client", and
 * every local module those files import (transitively, via "@/..." or relative paths).
 * "use server" modules are not followed: the client bundle only gets action references.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (EXT.includes(path.extname(e.name)) && !/\.test\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [base, ...EXT.map((x) => base + x), ...EXT.map((x) => path.join(base, "index" + x))]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

const IMPORT_RE = /(?:import|export)\s+(type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function clientReachable(): Set<string> {
  const all = walk(SRC);
  const seeds = all.filter(
    (f) => f.startsWith(path.join(SRC, "components") + path.sep) || /^\s*["']use client["']/m.test(fs.readFileSync(f, "utf8")),
  );
  const seen = new Set<string>();
  const stack = [...seeds];
  while (stack.length > 0) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const text = fs.readFileSync(f, "utf8");
    if (/^\s*["']use server["']/.test(text)) continue;
    for (const m of text.matchAll(IMPORT_RE)) {
      if (m[1]) continue; // type-only imports are erased
      const target = resolveImport(f, m[2] ?? m[3]);
      if (target) stack.push(target);
    }
  }
  return seen;
}

describe("LEAD_API_SECRET is never client-reachable", () => {
  it("is read only by the server-only secret module", () => {
    const readers = walk(SRC)
      .filter((f) => fs.readFileSync(f, "utf8").includes("process.env.LEAD_API_SECRET"))
      .map((f) => path.relative(SRC, f));
    expect(readers).toEqual([path.join("lib", "lead", "secret.ts")]);
  });

  const files = clientReachable();

  it("finds the client graph", () => {
    expect(files.size).toBeGreaterThan(10);
    expect([...files].some((f) => f.endsWith(path.join("lib", "lead", "client.ts")))).toBe(true);
  });

  it("no client-reachable file mentions LEAD_API_SECRET", () => {
    const offenders = [...files]
      .filter((f) => fs.readFileSync(f, "utf8").includes("LEAD_API_SECRET"))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it("server modules holding the secret path are guarded by server-only", () => {
    for (const rel of ["lib/lead/secret.ts", "lib/lead/handlers.ts", "lib/lead/notify.ts"]) {
      expect(fs.readFileSync(path.join(SRC, rel), "utf8")).toMatch(/^import "server-only";$/m);
      expect(files.has(path.join(SRC, rel))).toBe(false);
    }
  });
});
