"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { cn } from "./cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Visible title; also labels the dialog. */
  title: string;
  /** Optional element rendered before the title (e.g. a supplier logo). */
  header?: ReactNode;
  children: ReactNode;
  /** Sticky footer area (e.g. the CTA). */
  footer?: ReactNode;
  /** Close when clicking the dark overlay. Default true. */
  closeOnOverlay?: boolean;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: role=dialog + aria-modal, focus trap, Esc / X / overlay close,
 * focus restored to the trigger, body scroll locked. Bottom sheet on mobile.
 */
export function Modal({
  open,
  onClose,
  title,
  header,
  children,
  footer,
  closeOnOverlay = true,
  className,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the dialog container so Esc/Tab work immediately without jumping to a control.
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Sorted by document position (selector lists are not guaranteed to be in DOM order).
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    if (items.length === 0) {
      e.preventDefault();
      dialog.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && (activeEl === first || activeEl === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card-lg bg-surface shadow-pop focus:outline-none sm:max-w-lg sm:rounded-card-lg",
          className,
        )}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          {header}
          <h2 id={titleId} className="flex-1 text-title font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Chiudi"
            className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
