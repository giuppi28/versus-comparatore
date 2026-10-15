import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("links label and input", async () => {
    render(<Input label="Nome" />);
    const input = screen.getByLabelText("Nome");
    await userEvent.type(input, "Mario");
    expect(input).toHaveValue("Mario");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("shows the hint wired through aria-describedby", () => {
    render(<Input label="POD" hint="Lo trovi in bolletta" />);
    const input = screen.getByLabelText("POD");
    const hint = screen.getByText("Lo trovi in bolletta");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("shows an inline error: aria-invalid, alert role, hint replaced", () => {
    render(<Input label="Telefono" hint="Cellulare" error="Numero non valido" />);
    const input = screen.getByLabelText("Telefono");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const err = screen.getByRole("alert");
    expect(err).toHaveTextContent("Numero non valido");
    expect(input.getAttribute("aria-describedby")).toContain(err.id);
    expect(screen.queryByText("Cellulare")).not.toBeInTheDocument();
  });

  it("marks required fields", () => {
    render(<Input label="Cognome" required />);
    expect(screen.getByLabelText(/Cognome/)).toBeRequired();
  });

  it("supports disabled and a custom id", () => {
    render(<Input label="CAP" id="cap" disabled />);
    expect(screen.getByLabelText("CAP")).toBeDisabled();
    expect(screen.getByLabelText("CAP")).toHaveAttribute("id", "cap");
  });
});
