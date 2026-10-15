import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stepper } from "./Stepper";

describe("Stepper", () => {
  it("marks done / current / todo steps", () => {
    render(<Stepper steps={["Luce", "Gas", "Dati"]} current={1} />);
    expect(screen.getByRole("list", { name: "Avanzamento" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.dataset.state)).toEqual(["done", "current", "todo"]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[0]).toHaveTextContent("Luce (completato)");
  });

  it("first step current, nothing done", () => {
    render(<Stepper steps={["Luce", "Gas"]} current={0} />);
    expect(screen.getAllByRole("listitem").map((i) => i.dataset.state)).toEqual(["current", "todo"]);
  });

  it("all done when current is past the end", () => {
    render(<Stepper steps={["Luce", "Gas"]} current={2} aria-label="Passi" />);
    expect(screen.getByRole("list", { name: "Passi" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").every((i) => i.dataset.state === "done")).toBe(true);
  });
});
