import { describe, expect, it } from "vitest";
import { parseSupplierForm } from "./validation";

function form(entries: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}
const svgFile = (size = 100, name = "logo.svg", type = "image/svg+xml") =>
  new File([new Uint8Array(size).fill(32)], name, { type });

describe("parseSupplierForm", () => {
  it("accepts a valid form and maps checkboxes", () => {
    const r = parseSupplierForm(
      form({ name: " Acme Energia ", slug: "acme-energia", sort_order: "12", sells_luce: "on", active: "on" }),
    );
    expect(r).toMatchObject({
      ok: true,
      values: { name: "Acme Energia", slug: "acme-energia", sort_order: 12, sells_luce: true, sells_gas: false, show_in_dropdown: false, active: true },
      logo: null,
      removeLogo: false,
    });
  });

  it("derives the slug from the name when empty and normalises typed slugs", () => {
    expect(parseSupplierForm(form({ name: "Più Luce", slug: "", sort_order: "1" }))).toMatchObject({
      ok: true,
      values: { slug: "piu-luce" },
    });
    expect(parseSupplierForm(form({ name: "X", slug: "  Mio Slug ", sort_order: "1" }))).toMatchObject({
      ok: true,
      values: { slug: "mio-slug" },
    });
  });

  it("rejects a missing name and a name without slug characters", () => {
    expect(parseSupplierForm(form({ name: "  ", slug: "x", sort_order: "1" }))).toMatchObject({
      ok: false,
      errors: { name: "Inserisci il nome del fornitore." },
    });
    expect(parseSupplierForm(form({ name: "!!!", slug: "", sort_order: "1" }))).toMatchObject({
      ok: false,
      errors: { slug: "Inserisci lo slug." },
    });
  });

  it("rejects a name over 80 characters", () => {
    const r = parseSupplierForm(form({ name: "a".repeat(81), slug: "a", sort_order: "1" }));
    expect(r).toMatchObject({ ok: false, errors: { name: expect.stringContaining("80") } });
  });

  it.each(["", "abc", "1.5", "-1", "10000"])("rejects sort_order %j", (v) => {
    const r = parseSupplierForm(form({ name: "A", slug: "a", sort_order: v }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.sort_order).toBeTruthy();
  });

  it("accepts the sort_order bounds", () => {
    for (const v of ["0", "9999"]) expect(parseSupplierForm(form({ name: "A", slug: "a", sort_order: v })).ok).toBe(true);
  });

  it("handles the logo file", () => {
    const base = { name: "A", slug: "a", sort_order: "1" };
    expect(parseSupplierForm(form({ ...base, logo: svgFile() }))).toMatchObject({ ok: true, logo: expect.any(File) });
    expect(parseSupplierForm(form({ ...base, logo: new File([], "", { type: "application/octet-stream" }) }))).toMatchObject({
      ok: true,
      logo: null,
    });
    expect(parseSupplierForm(form({ ...base, logo: svgFile(10, "logo.png", "image/png") }))).toMatchObject({
      ok: false,
      errors: { logo: "Carica un file in formato SVG." },
    });
    expect(parseSupplierForm(form({ ...base, logo: svgFile(200_001) }))).toMatchObject({
      ok: false,
      errors: { logo: "Il file supera il limite di 200 KB." },
    });
    expect(parseSupplierForm(form({ ...base, logo: svgFile(200_000) })).ok).toBe(true);
  });

  it("remove_logo only applies when no new logo is uploaded", () => {
    const base = { name: "A", slug: "a", sort_order: "1", remove_logo: "on" };
    expect(parseSupplierForm(form(base))).toMatchObject({ ok: true, removeLogo: true });
    expect(parseSupplierForm(form({ ...base, logo: svgFile() }))).toMatchObject({ ok: true, removeLogo: false });
  });
});
