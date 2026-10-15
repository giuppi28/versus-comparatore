import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";
import { LOGO_TITLE, VersusLogo } from "./VersusLogo";

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
  it("renders inline SVG with an accessible name", () => {
    render(<VersusLogo />);
    const logo = screen.getByRole("img", { name: LOGO_TITLE });
    expect(logo.tagName.toLowerCase()).toBe("svg");
    expect(LOGO_TITLE).toBe("VERSUS — comparatore luce e gas");
  });

  it("has no full-bleed background rect", () => {
    const { container } = render(<VersusLogo />);
    expect(container.querySelector('rect[width="100%"]')).toBeNull();
  });

  it("full variant keeps every shape of versus_logo_nero.svg verbatim", () => {
    const { container } = render(<VersusLogo variant="full" />);
    const original = readFileSync(join(BRAND_DIR, "versus_logo_nero.svg"), "utf8");
    const ours = geometry(container.innerHTML);
    expect(ours.length).toBeGreaterThan(40);
    expect(ours).toEqual(geometry(original));
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
        <VersusLogo title="" />
        <VersusLogo />
        <VersusLogo />
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
    expect(screen.getByRole("img", { name: LOGO_TITLE })).toBeTruthy();
  });

  it("renders the logo without a link when homeLink is false", () => {
    render(<SiteHeader homeLink={false} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("img", { name: LOGO_TITLE })).toBeTruthy();
  });
});
