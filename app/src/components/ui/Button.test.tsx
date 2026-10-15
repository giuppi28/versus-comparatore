import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders variants and defaults to type=button", () => {
    const { rerender } = render(<Button>Vai</Button>);
    const btn = screen.getByRole("button", { name: "Vai" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn.className).toContain("bg-brand-600");
    rerender(<Button variant="secondary">Vai</Button>);
    expect(screen.getByRole("button").className).toContain("border-line-strong");
    rerender(<Button variant="ghost">Vai</Button>);
    expect(screen.getByRole("button").className).toContain("bg-transparent");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Vai</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("loading disables, sets aria-busy and blocks clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Invio
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Invio" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled blocks clicks; fullWidth applies w-full", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled fullWidth onClick={onClick}>
        Vai
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("w-full");
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("can submit forms with type=submit", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Invia</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSubmit).toHaveBeenCalled();
  });
});
