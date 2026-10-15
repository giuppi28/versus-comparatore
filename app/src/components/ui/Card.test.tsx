import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children with rounded card styling", () => {
    render(<Card data-testid="c">Contenuto</Card>);
    const card = screen.getByTestId("c");
    expect(card).toHaveTextContent("Contenuto");
    expect(card.className).toContain("rounded-card");
    expect(card.className).toContain("p-5");
  });

  it("supports padding and highlighted variants", () => {
    render(
      <Card data-testid="c" padding="none" highlighted className="extra">
        x
      </Card>,
    );
    const card = screen.getByTestId("c");
    expect(card.className).not.toContain("p-5");
    expect(card.className).toContain("border-brand-600");
    expect(card.className).toContain("extra");
  });
});
