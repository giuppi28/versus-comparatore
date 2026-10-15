import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./Select";

const options = [
  { value: "3", label: "3 kW" },
  { value: "4.5", label: "4,5 kW" },
];

describe("Select", () => {
  it("renders label, placeholder and options", () => {
    render(<Select label="Potenza" options={options} placeholder="Seleziona…" defaultValue="" />);
    const select = screen.getByLabelText("Potenza");
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "Seleziona…" })).toBeDisabled();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("calls onChange", async () => {
    const onChange = vi.fn();
    render(<Select label="Potenza" options={options} defaultValue="3" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Potenza"), "4.5");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText("Potenza")).toHaveValue("4.5");
  });

  it("shows hint and error with aria wiring", () => {
    const { rerender } = render(<Select label="Potenza" options={options} hint="Aiuto" />);
    expect(screen.getByLabelText("Potenza").getAttribute("aria-describedby")).toBe(
      screen.getByText("Aiuto").id,
    );
    rerender(<Select label="Potenza" options={options} hint="Aiuto" error="Campo obbligatorio" />);
    expect(screen.getByLabelText("Potenza")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Campo obbligatorio");
  });

  it("supports disabled and required", () => {
    render(<Select label="Potenza" options={options} disabled required />);
    expect(screen.getByLabelText(/Potenza/)).toBeDisabled();
    expect(screen.getByLabelText(/Potenza/)).toBeRequired();
  });
});
