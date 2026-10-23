"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { leadDocumentFileName } from "@/lib/data/repository";
import type { LeadDocument } from "@/lib/data/types";
import { createLeadDocumentUrlAction } from "./actions";
import { DOCUMENT_MIME_LABELS, formatDateTime, formatFileSize } from "./labels";
import { useHydrated } from "./use-hydrated";

/**
 * Uploaded identity documents. Signed URLs are requested on demand (server action, <= 300 s)
 * and never rendered in the page; "Anteprima" opens in a new tab, "Scarica" navigates to the
 * attachment URL. Images also get a small inline preview on request.
 */
export function LeadDocuments({ documents }: { documents: LeadDocument[] }) {
  const [error, setError] = useState<string | null>(null);
  const [inline, setInline] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  if (documents.length === 0) return <p className="text-ink-subtle">Nessun file caricato</p>;

  const run = (doc: LeadDocument, mode: "preview" | "download") => {
    setError(null);
    // Open the tab synchronously (popup blockers) and point it at the URL once known.
    const tab = mode === "preview" ? window.open("", "_blank") : null;
    if (tab) tab.opener = null;
    startTransition(async () => {
      const result = await createLeadDocumentUrlAction(doc.id, mode);
      if (!result.ok) {
        tab?.close();
        setError(result.message);
        return;
      }
      if (mode === "preview") {
        if (tab) tab.location.href = result.url;
        if (doc.mime_type === "image/jpeg") setInline((prev) => ({ ...prev, [doc.id]: result.url }));
      } else {
        const a = window.document.createElement("a");
        a.href = result.url;
        a.download = leadDocumentFileName(doc);
        a.rel = "noopener";
        a.click();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="lead-documents">
      <ul className="flex flex-col gap-3">
        {documents.map((doc) => (
          <li
            key={doc.id}
            data-testid="lead-document"
            className="flex flex-col gap-2 rounded-control border border-line p-3"
          >
            <div className="font-medium">
              {DOCUMENT_MIME_LABELS[doc.mime_type] ?? doc.mime_type}
              <span className="font-normal text-ink-muted">
                {" "}
                · {formatFileSize(doc.size_bytes)} · {formatDateTime(doc.created_at)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!hydrated || pending}
                onClick={() => run(doc, "preview")}
                data-testid="lead-document-preview"
              >
                Anteprima
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!hydrated || pending}
                onClick={() => run(doc, "download")}
                data-testid="lead-document-download"
              >
                Scarica
              </Button>
            </div>
            {inline[doc.id] && (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed / data URL
              <img
                src={inline[doc.id]}
                alt="Anteprima del documento"
                className="max-h-48 w-auto self-start rounded-control border border-line"
                data-testid="lead-document-inline"
              />
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger" data-testid="lead-document-error">
          {error}
        </p>
      )}
    </div>
  );
}
