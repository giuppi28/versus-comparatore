import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BoltDropIllustration,
  BulbIllustration,
  FlameIllustration,
  HouseOutline,
  Swoosh,
} from "./index";

const ALL = [
  ["BulbIllustration", BulbIllustration],
  ["FlameIllustration", FlameIllustration],
  ["BoltDropIllustration", BoltDropIllustration],
  ["HouseOutline", HouseOutline],
  ["Swoosh", Swoosh],
] as const;

describe.each(ALL)("%s", (_name, Component) => {
  it("renders a decorative, non-interactive SVG", () => {
    const { container } = render(<Component />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
    expect(svg?.style.pointerEvents).toBe("none");
    expect(svg?.getAttribute("role")).toBeNull();
    expect(svg?.querySelector("title")).toBeNull();
    expect(svg?.getAttribute("viewBox")).toBeTruthy();
  });

  it("takes className and colour", () => {
    const { container } = render(<Component className="h-40 w-auto" color="#0a8045" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("h-40");
    expect(svg?.style.color).not.toBe("");
  });
});

describe("BulbIllustration options", () => {
  it("can drop the rays and the bolt", () => {
    const full = render(<BulbIllustration />).container.querySelectorAll("path").length;
    const bare = render(<BulbIllustration rays={false} bolt={false} />).container.querySelectorAll("path").length;
    expect(bare).toBeLessThan(full);
  });
});
