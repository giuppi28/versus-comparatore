import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { LOGO_TITLE, VersusLogo } from "./VersusLogo";
import { VersusMark } from "./VersusMark";

const BRAND_DIR = join(process.cwd(), "public", "brand");

/** Geometry attributes (path data, points, transforms, rect boxes) in document order. */
function geometry(markup: string): string[] {
  // Drop the root <svg> tag (size/viewBox differ on purpose) and the full-bleed background rect.
  const body = markup
    .replace(/<svg[^>]*>/, "")
    .replace(/<rect[^>]*width=["']100%["'][^>]*\/>/, "");
  return Array.from(
    body.matchAll(/\s(d|points|transform|x|y|width|height|rx|fill|stroke|stroke-width)=["']([^"']*)["']/g),
  )
    .map((m) => `${m[1]}=${m[2]}`);
}

describe("VersusLogo", () => {
  it("defaults to the lockup, with an accessible name and the test id", () => {
    render(<VersusLogo />);
    const logo = screen.getByRole("img", { name: LOGO_TITLE });
    expect(logo.getAttribute("data-testid")).toBe("versus-logo");
    expect(logo.getAttribute("data-variant")).toBe("lockup");
    expect(LOGO_TITLE).toBe("VERSUS — comparatore luce e gas");
  });

  it("lockup: typeset wordmark (real text, not SVG text), COMPARATORE present, no black box", () => {
    const { container } = render(<VersusLogo />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/versus/i);
    expect(text).toMatch(/comparatore/i);
    expect(text).toMatch(/luce e gas/i);
    expect(container.querySelector("svg text")).toBeNull();
    expect(container.querySelector("rect[rx]")).toBeNull();
    expect(container.querySelector('rect[width="100%"]')).toBeNull();
    // the only SVG is the decorative mark
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("full variant is inline SVG with an accessible name and no full-bleed rect", () => {
    const { container } = render(<VersusLogo variant="full" />);
    const logo = screen.getByRole("img", { name: LOGO_TITLE });
    expect(logo.tagName.toLowerCase()).toBe("svg");
    expect(container.querySelector('rect[width="100%"]')).toBeNull();
  });

  it("full variant keeps every shape of versus_logo_nero.svg verbatim", () => {
    const { container } = render(<VersusLogo variant="full" />);
    const original = readFileSync(join(BRAND_DIR, "versus_logo_nero.svg"), "utf8");
    const ours = geometry(container.innerHTML);
    expect(ours.length).toBeGreaterThan(40);
    expect(ours).toEqual(geometry(original));
  });

  it("mark (lockup icon) keeps the house/flame/drop/swoosh group of versus_logo_nero.svg verbatim", () => {
    const { container } = render(<VersusMark />);
    const original = readFileSync(join(BRAND_DIR, "versus_logo_nero.svg"), "utf8");
    // first group of the original: the mark, before the wordmark paths
    const markPart = original.slice(
      original.indexOf("<g transform='scale(0.72)'>"),
      original.indexOf("<path d='M217.875"),
    );
    const ours = geometry(container.innerHTML);
    expect(ours.length).toBeGreaterThan(30);
    expect(ours).toEqual(geometry(markPart));
    // no rounded square, no background
    expect(container.querySelector("rect[rx]")).toBeNull();
    expect(container.querySelector('rect[width="100%"]')).toBeNull();
  });

  it("icon variant keeps every shape of versus_icona.svg verbatim", () => {
    const { container } = render(<VersusLogo variant="icon" />);
    const original = readFileSync(join(BRAND_DIR, "versus_icona.svg"), "utf8");
    const ours = geometry(container.innerHTML);
    expect(ours).toEqual(geometry(original));
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 240 240");
  });

  it("can be decorative and gives unique title ids per instance", () => {
    const { container } = render(
      <>
        <VersusLogo variant="full" title="" />
        <VersusLogo variant="full" />
        <VersusLogo variant="full" />
      </>,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs[0].getAttribute("aria-hidden")).toBe("true");
    expect(svgs[0].querySelector("title")).toBeNull();
    const ids = [svgs[1], svgs[2]].map((s) => s.querySelector("title")!.id);
    expect(ids[0]).not.toBe(ids[1]);
  });
});

describe("SiteHeader", () => {
  it("links the logo to the home page by default", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: /VERSUS/ }).getAttribute("href")).toBe("/");
    // WCAG 2.5.3: the accessible name starts with the visible text (VERSUS, COMPARATORE, luce e gas).
    expect(screen.getByRole("link", { name: "VERSUS comparatore luce e gas, torna alla home" })).toBeTruthy();
    expect(screen.getByRole("img", { name: LOGO_TITLE })).toBeTruthy();
  });

  it("renders the logo without a link when homeLink is false", () => {
    render(<SiteHeader homeLink={false} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("img", { name: LOGO_TITLE })).toBeTruthy();
  });

  it("shows the trust line without any call wording", () => {
    const { container } = render(<SiteHeader />);
    expect(container.textContent).toContain("Confronto gratuito · 100% online");
    expect(container.textContent).not.toMatch(/chiam|telefon|richiam|call/i);
  });
});

describe("SiteFooter", () => {
  it("has the lockup, a privacy link and the copyright with the current year", () => {
    const { container } = render(<SiteFooter />);
    expect(screen.getByRole("img", { name: LOGO_TITLE })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");
    expect(container.textContent).toContain(`© VERSUS ${new Date().getFullYear()}`);
  });
});
