import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="Eliminare 3 lead?"
      {...props}
    >
      L&apos;operazione non può essere annullata.
    </ConfirmDialog>,
  );
  return { onCancel, onConfirm };
}

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title, description and default Italian labels", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Eliminare 3 lead?" })).toBeInTheDocument();
    expect(screen.getByTestId("confirm-dialog")).toHaveTextContent(
      "L'operazione non può essere annullata.",
    );
    expect(screen.getByTestId("confirm-dialog-confirm")).toHaveTextContent("Elimina");
    expect(screen.getByTestId("confirm-dialog-cancel")).toHaveTextContent("Annulla");
  });

  it("supports custom labels", () => {
    setup({ confirmLabel: "Elimina 3 lead", cancelLabel: "Indietro" });
    expect(screen.getByTestId("confirm-dialog-confirm")).toHaveTextContent("Elimina 3 lead");
    expect(screen.getByTestId("confirm-dialog-cancel")).toHaveTextContent("Indietro");
  });

  it("uses the danger style on the confirm button", () => {
    setup();
    expect(screen.getByTestId("confirm-dialog-confirm").className).toContain("bg-danger");
  });

  it("puts initial focus on Annulla", () => {
    setup();
    expect(screen.getByTestId("confirm-dialog-cancel")).toHaveFocus();
  });

  it("calls onConfirm / onCancel from the buttons", async () => {
    const { onCancel, onConfirm } = setup();
    await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("confirm-dialog-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Esc, X and overlay cancel when not pending", async () => {
    const { onCancel, onConfirm } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("pending disables both buttons, shows busy state and ignores Esc/X/overlay", async () => {
    const { onCancel, onConfirm } = setup({ pending: true });
    const confirm = screen.getByTestId("confirm-dialog-confirm");
    const cancel = screen.getByTestId("confirm-dialog-cancel");
    expect(confirm).toBeDisabled();
    expect(cancel).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
    await userEvent.click(confirm);
    await userEvent.click(cancel);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("keeps focus inside the dialog when confirm turns pending", async () => {
    function Demo() {
      const [pending, setPending] = useState(false);
      return (
        <ConfirmDialog
          open
          pending={pending}
          onCancel={() => {}}
          onConfirm={() => setPending(true)}
          title="T"
        />
      );
    }
    render(<Demo />);
    await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(screen.getByTestId("confirm-dialog-confirm")).toBeDisabled();
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("shows an error message inside the dialog", () => {
    setup({ error: "Eliminazione non riuscita. Riprova." });
    expect(screen.getByRole("alert")).toHaveTextContent("Eliminazione non riuscita. Riprova.");
    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
  });

  it("has no error slot when no error is given", () => {
    setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not use window.confirm / alert", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const alertSpy = vi.spyOn(window, "alert");
    setup();
    await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    const src = readFileSync(join(__dirname, "ConfirmDialog.tsx"), "utf8");
    expect(src).not.toMatch(/window\.(confirm|alert)|\bconfirm\(|\balert\(/);
  });
});
