import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as icons from "./index";

describe("shared icon set", () => {
  const entries = Object.entries(icons).filter(([name]) => name !== "BoltFlameIcon");

  it("exports the icons the activation form needs", () => {
    for (const name of [
      "OwnerIcon",
      "TenantIcon",
      "UsufructuaryIcon",
      "OtherIcon",
      "YesIcon",
      "NoIcon",
      "ResidentIcon",
      "SinglePhaseIcon",
      "ThreePhaseIcon",
      "GaugeIcon",
      "CityIcon",
      "AddressIcon",
      "LuceIcon",
      "GasIcon",
    ]) {
      expect(Object.keys(icons)).toContain(name);
    }
  });

  it.each(entries)("%s is a decorative currentColor SVG", (_name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
  });

  it("BoltFlameIcon renders both glyphs", () => {
    const { container } = render(<icons.BoltFlameIcon />);
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });
});
