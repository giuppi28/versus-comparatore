import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

function Demo({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Apri</button>
      <Modal
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="I vantaggi dell'offerta"
        footer={<button>Attiva online in 1 minuto</button>}
      >
        <a href="#x">Link interno</a>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(<Modal open={false} onClose={() => {}} title="T">x</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has dialog semantics: aria-modal and labelled by the title", async () => {
    render(<Demo />);
    await userEvent.click(screen.getByText("Apri"));
    const dialog = screen.getByRole("dialog", { name: "I vantaggi dell'offerta" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes with Esc and restores focus to the trigger", async () => {
    const onClose = vi.fn();
    render(<Demo onClose={onClose} />);
    const trigger = screen.getByText("Apri");
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes with the X button", async () => {
    render(<Demo />);
    await userEvent.click(screen.getByText("Apri"));
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on overlay click but not on dialog click", async () => {
    render(<Demo />);
    await userEvent.click(screen.getByText("Apri"));
    await userEvent.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close on overlay when closeOnOverlay=false", async () => {
    render(<Modal open onClose={() => {}} title="T" closeOnOverlay={false}>x</Modal>);
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("traps focus: Tab and Shift+Tab cycle inside the dialog", async () => {
    render(<Demo />);
    await userEvent.click(screen.getByText("Apri"));
    // focusables in order: X, link, footer CTA
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Chiudi" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Link interno" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Attiva online in 1 minuto" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Chiudi" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Attiva online in 1 minuto" })).toHaveFocus();
  });
});
