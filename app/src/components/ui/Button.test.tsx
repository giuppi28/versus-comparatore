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
    expect(screen.getByRole("button").className).toContain("border-control");
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

  it("lg size uses the wide uppercase label for primary and secondary; md stays normal case", () => {
    const { rerender } = render(<Button size="lg">Vai</Button>);
    expect(screen.getByRole("button").className).toContain("heading-wide");
    rerender(
      <Button size="lg" variant="secondary">
        Vai
      </Button>,
    );
    expect(screen.getByRole("button").className).toContain("heading-wide");
    rerender(<Button variant="secondary">Vai</Button>);
    expect(screen.getByRole("button").className).not.toContain("heading-wide");
  });

  it("disabled primary uses the neutral grey fill, not pale green", () => {
    render(<Button disabled>Vai</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("disabled:bg-disabled");
    expect(cls).not.toContain("disabled:bg-brand");
    expect(cls).toContain("disabled:cursor-not-allowed");
  });
});
