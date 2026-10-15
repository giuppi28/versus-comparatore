import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectCard, SelectCardGroup } from "./SelectCard";

function RadioDemo({ initial = null }: { initial?: string | null }) {
  const [v, setV] = useState<string | null>(initial);
  return (
    <SelectCardGroup type="radio" value={v} onValueChange={setV} aria-label="Cosa confronti">
      <SelectCard value="luce" title="Luce" icon={<i />} />
      <SelectCard value="gas" title="Gas" />
      <SelectCard value="dual" title="Luce + Gas" />
    </SelectCardGroup>
  );
}

function CheckboxDemo() {
  const [v, setV] = useState<string[]>([]);
  return (
    <SelectCardGroup type="checkbox" value={v} onValueChange={setV} aria-label="Usi">
      <SelectCard value="cucina" title="Cucina" />
      <SelectCard value="acqua" title="Acqua calda" disabled />
      <SelectCard value="risc" title="Riscaldamento" />
    </SelectCardGroup>
  );
}

describe("SelectCard radio group", () => {
  it("exposes radiogroup / radio semantics", () => {
    render(<RadioDemo />);
    expect(screen.getByRole("radiogroup", { name: "Cosa confronti" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    radios.forEach((r) => expect(r).toHaveAttribute("aria-checked", "false"));
  });

  it("selects on click and keeps a single selection", async () => {
    render(<RadioDemo />);
    await userEvent.click(screen.getByRole("radio", { name: "Gas" }));
    expect(screen.getByRole("radio", { name: "Gas" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Luce" }));
    expect(screen.getByRole("radio", { name: "Luce" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Gas" })).not.toBeChecked();
    // clicking the selected one does not unselect it
    await userEvent.click(screen.getByRole("radio", { name: "Luce" }));
    expect(screen.getByRole("radio", { name: "Luce" })).toBeChecked();
  });

  it("selects with keyboard (Tab + Space) and moves with arrows (wrapping)", async () => {
    render(<RadioDemo />);
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Luce" })).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Luce" })).toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Gas" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Gas" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Luce + Gas" })).toBeChecked();
  });

  it("uses roving tabindex once something is selected", () => {
    render(<RadioDemo initial="gas" />);
    expect(screen.getByRole("radio", { name: "Gas" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Luce" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("SelectCard checkbox group", () => {
  it("toggles multiple values and skips disabled", async () => {
    render(<CheckboxDemo />);
    expect(screen.getByRole("group", { name: "Usi" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Cucina" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Riscaldamento" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Acqua calda" }));
    expect(screen.getByRole("checkbox", { name: "Cucina" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Riscaldamento" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Acqua calda" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Acqua calda" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Cucina" }));
    expect(screen.getByRole("checkbox", { name: "Cucina" })).not.toBeChecked();
  });

  it("toggles with the keyboard", async () => {
    render(<CheckboxDemo />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("checkbox", { name: "Cucina" })).toBeChecked();
  });
});

describe("standalone SelectCard", () => {
  it("reports changes through onSelectedChange", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SelectCard type="checkbox" title="Sì" selected={false} onSelectedChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<SelectCard type="checkbox" title="Sì" selected onSelectedChange={onChange} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
