"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Visible title; also labels the dialog. */
  title: string;
  /** Description / consequences shown in the body. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual tone of the confirm button. Only "danger" exists today. */
  tone?: "danger";
  /** Action in flight: both buttons disabled, confirm shows a spinner, Esc/overlay/X ignored. */
  pending?: boolean;
  /** Optional error message (e.g. a failed server action) shown inside the dialog. */
  error?: ReactNode;
}

/**
 * In-page confirmation dialog built on Modal (native browser dialogs are never used).
 * Initial focus is on the cancel button (safe default); Esc cancels unless pending.
 * Bottom sheet on mobile (inherited from Modal).
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  children,
  confirmLabel = "Elimina",
  cancelLabel = "Annulla",
  tone = "danger",
  pending = false,
  error,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Runs after Modal's own effect (child effects first), so it wins the initial focus.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // A button that becomes disabled drops focus to <body>: put it back on the dialog
  // so the keyboard trap keeps working while the action is in flight.
  useEffect(() => {
    if (open && pending) {
      cancelRef.current?.closest<HTMLElement>('[role="dialog"]')?.focus();
    }
  }, [open, pending]);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onCancel();
      }}
      closeOnOverlay={!pending}
      title={title}
      className="sm:max-w-md"
      footer={
        <div
          data-testid="confirm-dialog-actions"
          className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <Button
            ref={cancelRef}
            variant="secondary"
            disabled={pending}
            onClick={onCancel}
            data-testid="confirm-dialog-cancel"
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            loading={pending}
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div data-testid="confirm-dialog" className="space-y-3 text-base text-ink-muted">
        {children}
        {error && (
          <p
            role="alert"
            data-testid="confirm-dialog-error"
            className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
