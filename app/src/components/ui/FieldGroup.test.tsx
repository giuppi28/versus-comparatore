import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldGroup } from "./FieldGroup";

describe("FieldGroup", () => {
  it("shows the legend visibly by default and names the group with it", () => {
    render(
      <FieldGroup legend="Tipo di cliente" legendId="lg">
        <input aria-label="x" />
      </FieldGroup>,
    );
    const legend = screen.getByText("Tipo di cliente");
    expect(legend.tagName).toBe("LEGEND");
    expect(legend.className).not.toContain("sr-only");
    expect(screen.getByRole("group", { name: "Tipo di cliente" })).toBeInTheDocument();
  });

  it("hideLegend keeps the accessible name but makes the legend sr-only", () => {
    render(
      <FieldGroup legend="Tipo di fornitura" hideLegend>
        <input aria-label="x" />
      </FieldGroup>,
    );
    expect(screen.getByText("Tipo di fornitura").className).toContain("sr-only");
    expect(screen.getByRole("group", { name: "Tipo di fornitura" })).toBeInTheDocument();
  });

  it("renders the error as an alert and links it via aria-describedby", () => {
    render(
      <FieldGroup legend="Tipo" error="Seleziona un'opzione" errorId="e1">
        <input aria-label="x" />
      </FieldGroup>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Seleziona un'opzione");
    expect(screen.getByRole("group")).toHaveAttribute("aria-describedby", "e1");
  });
});
