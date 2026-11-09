"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Button,
  CheckIcon,
  cn,
  CloseIcon,
  Input,
  Select,
  SpinnerIcon,
} from "@/components/ui";
import { CheckboxField } from "@/components/page1/parts";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/data/types";
import {
  LeadApiError,
  removeLeadDocument,
  uploadLeadDocument,
} from "@/lib/lead/client";
import { DocumentPrepareError, prepareDocumentFile } from "./compress-image";
import {
  addDocumentPatch,
  assignDocumentSlots,
  formatUploadSize,
  ibanRequired,
  groupIban,
  requiredDocumentSides,
  removeDocumentPatch,
  removeErrorMessage,
  uploadErrorMessage,
} from "./logic";
import { normalizeIban, validateCodiceFiscale } from "@/lib/logic/validators";
import type { StepProps } from "./types";
import type {
  DocumentSide,
  FlowUploadedDocument,
} from "@/lib/lead/flow-state";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  carta_identita: "Carta d'identità",
  patente: "Patente",
  passaporto: "Passaporto",
};

type SectionProps = Pick<
  StepProps,
  "state" | "update" | "errorFor" | "touch" | "edited"
>;

/** "Pagamento": IBAN and, optionally, a different account holder. */
export function PaymentFields({
  state,
  update,
  errorFor,
  touch,
  edited,
}: SectionProps) {
  const a = state.activation;
  const holderId = useId();
  const hasIban = a.iban.trim().length > 0;
  const required = ibanRequired(state);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Input
          label="IBAN"
          name="iban"
          required={required}
          hint={required ? "Obbligatorio: l'offerta scelta si attiva solo con pagamento IBAN" : "Facoltativo, se vuoi pagare con addebito sul conto"}
          autoCapitalize="characters"
          // Sensitive: keep it out of the browser's saved-values history (shared devices).
          autoComplete="off"
          spellCheck={false}
          maxLength={42}
          value={a.iban}
          error={errorFor("iban")}
          onChange={(e) => {
            edited("iban");
            update({ activation: { iban: e.target.value.toUpperCase() } });
          }}
          onBlur={() => {
            touch("iban");
            const n = normalizeIban(a.iban);
            const grouped = groupIban(n);
            if (grouped !== a.iban) update({ activation: { iban: grouped } });
          }}
        />
        {/* Fixed copy, deliberately outside aria-describedby (SPEC #15). */}
        <p
          data-testid="iban-discount"
          className="rounded-control bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700"
        >
          Sconto del 20% se paghi con IBAN
        </p>
      </div>
      {hasIban && (
        <>
          <CheckboxField
            id={holderId}
            testId="iban-holder-different"
            checked={a.ibanHolderDifferent}
            onChange={(checked) =>
              update({ activation: { ibanHolderDifferent: checked } })
            }
          >
            L&apos;intestatario del conto è diverso dal titolare
          </CheckboxField>
          {a.ibanHolderDifferent && (
            <div data-testid="iban-holder-fields" className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Nome dell'intestatario"
                  name="iban_holder_first_name"
                  required
                  autoComplete="section-intestatario given-name"
                  value={a.ibanHolderFirstName}
                  error={errorFor("iban_holder_first_name")}
                  onChange={(e) => {
                    edited("iban_holder_first_name");
                    update({
                      activation: { ibanHolderFirstName: e.target.value },
                    });
                  }}
                  onBlur={() => touch("iban_holder_first_name")}
                />
                <Input
                  label="Cognome dell'intestatario"
                  name="iban_holder_last_name"
                  required
                  autoComplete="section-intestatario family-name"
                  value={a.ibanHolderLastName}
                  error={errorFor("iban_holder_last_name")}
                  onChange={(e) => {
                    edited("iban_holder_last_name");
                    update({
                      activation: { ibanHolderLastName: e.target.value },
                    });
                  }}
                  onBlur={() => touch("iban_holder_last_name")}
                />
              </div>
              <Input
                label="Codice fiscale dell'intestatario"
                name="iban_holder_tax_code"
                required
                autoCapitalize="characters"
                // Someone else's codice fiscale: never autofilled with the customer's own, never remembered.
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
                className="sm:max-w-sm"
                value={a.ibanHolderTaxCode}
                error={errorFor("iban_holder_tax_code")}
                onChange={(e) => {
                  edited("iban_holder_tax_code");
                  update({
                    activation: {
                      ibanHolderTaxCode: e.target.value.toUpperCase(),
                    },
                  });
                }}
                onBlur={() => {
                  touch("iban_holder_tax_code");
                  const r = validateCodiceFiscale(a.ibanHolderTaxCode);
                  if (r.ok && r.value !== a.ibanHolderTaxCode) {
                    update({ activation: { ibanHolderTaxCode: r.value } });
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Italian label of one upload slot (the passport has a single page with the photo). */
function sideLabel(type: DocumentType | null, side: DocumentSide): string {
  if (type === "passaporto") return "Pagina con la foto";
  return side === "front" ? "Fronte del documento" : "Retro del documento";
}

/** Short description of what was uploaded, for the collapsed state. */
function uploadedSummary(type: DocumentType): string {
  return type === "passaporto"
    ? "Passaporto, pagina con la foto"
    : `${DOCUMENT_TYPE_LABELS[type]}, fronte e retro`;
}

/**
 * "Documento d'identità" (mandatory): the type first, then one upload per required side (front and
 * back, or the passport photo page) or, alternatively, the manual number/issuer/expiry. When every
 * required side is there the manual block hides and the section collapses into one big "Documento
 * caricato" state (photo path only); "Modifica" reopens it with the per-side checks.
 */
export function DocumentFields({
  state,
  update,
  errorFor,
  touch,
  edited,
}: SectionProps) {
  const a = state.activation;
  const type = a.documentType;
  const hintId = useId();
  const [uploadingSide, setUploadingSide] = useState<DocumentSide | null>(null);
  const [uploadError, setUploadError] = useState<SideMessage | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<SideMessage | null>(null);
  // Id of the file uploaded in this session: only that one plays the badge pop-in (not after a reload).
  const [freshDocId, setFreshDocId] = useState<string | null>(null);
  // The bill (kind "bill") lives in its own section: this one only handles identity documents.
  const slots = assignDocumentSlots(a.documents);
  const busy = uploadingSide !== null || removingId !== null;
  const sides = requiredDocumentSides(type);
  const complete = type !== null && sides.every((side) => slots[side] !== null);

  // Collapse model, all derived (no state set from effects). `completeKey` identifies the current
  // complete set of files; the section collapses once it is "armed" (after a short delay that lets
  // the last badge show) and stays open while the customer is reviewing it.
  const completeKey = complete ? `${type}:${sides.map((side) => slots[side]?.id).join("+")}` : null;
  const [armedKey, setArmedKey] = useState<string | null>(completeKey);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);
  // True once the collapse happened in this session: only then animate and announce it.
  const [animateDone, setAnimateDone] = useState(false);
  const documentError = errorFor("id_document");
  // A server "files missing" error opens the section so the customer sees the checks and the message.
  const collapsed =
    completeKey !== null && armedKey === completeKey && reviewingKey !== completeKey && !documentError;
  const sectionRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (completeKey === null || armedKey === completeKey) return;
    const timer = setTimeout(() => {
      setArmedKey(completeKey);
      setAnimateDone(true);
    }, COLLAPSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completeKey, armedKey]);

  useEffect(() => {
    if (collapsed && animateDone) editRef.current?.focus({ preventScroll: true });
  }, [collapsed, animateDone]);

  useEffect(() => {
    if (reviewingKey !== null) sectionRef.current?.focus({ preventScroll: true });
  }, [reviewingKey]);

  async function onFiles(side: DocumentSide, file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setRemoveError(null);
    setUploadingSide(side);
    try {
      const prepared = await prepareDocumentFile(file);
      const doc = await uploadLeadDocument(prepared);
      edited("id_document");
      for (const f of MANUAL_FIELDS) edited(f);
      update((s) => addDocumentPatch(s, { ...doc, name: prepared.name }, side));
      setFreshDocId(doc.id);
    } catch (err) {
      const code =
        err instanceof LeadApiError || err instanceof DocumentPrepareError
          ? err.code
          : "upload_failed";
      setUploadError({ side, message: uploadErrorMessage(code) });
    } finally {
      setUploadingSide(null);
    }
  }

  async function onRemove(side: DocumentSide, id: string) {
    setRemoveError(null);
    setUploadError(null);
    setRemovingId(id);
    try {
      await removeLeadDocument(id);
    } catch (err) {
      // 404: already gone on the server, so drop it from the list too.
      if (!(err instanceof LeadApiError && err.code === "document_not_found")) {
        setRemoveError({
          side,
          message: removeErrorMessage(
            err instanceof LeadApiError ? err.code : "server_error",
          ),
        });
        setRemovingId(null);
        return;
      }
    }
    update((s) => removeDocumentPatch(s, id));
    setRemovingId(null);
  }

  /** New type: files that still fit are kept; a retro no longer needed (passport) is removed. */
  function onTypeChange(next: DocumentType | null) {
    edited("document_type");
    edited("id_document");
    setUploadError(null);
    setRemoveError(null);
    update({ activation: { documentType: next } });
    const unused = next !== null && !requiredDocumentSides(next).includes("back") ? slots.back : null;
    if (unused) void onRemove("back", unused.id);
  }

  const missingId = `${hintId}-missing`;

  return (
    <div
      ref={sectionRef}
      tabIndex={-1}
      data-testid="document-section"
      aria-invalid={documentError ? true : undefined}
      aria-describedby={documentError ? missingId : undefined}
      className="space-y-5 outline-none"
    >
      {/* Always mounted so the announcement is read when the section collapses. */}
      <span role="status" data-testid="document-done-status" className="sr-only">
        {collapsed && animateDone ? "Documento caricato" : ""}
      </span>
      {collapsed && type !== null ? (
        <div
          data-testid="document-collapsed"
          className={cn(
            "flex flex-col items-center gap-3 rounded-card border border-brand-600 bg-brand-50 px-4 py-8 text-center",
            animateDone && "animate-doc-done motion-reduce:animate-none",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-16 items-center justify-center rounded-full bg-brand-600 text-white",
              animateDone && "animate-badge-pop motion-reduce:animate-none",
            )}
          >
            <CheckIcon className="size-9" strokeWidth={3} />
          </span>
          <div>
            <p className="text-lg font-bold text-brand-700">Documento caricato</p>
            <p className="text-sm text-ink-muted">{uploadedSummary(type)}</p>
          </div>
          <Button
            ref={editRef}
            type="button"
            variant="secondary"
            data-testid="document-edit"
            className="min-h-11"
            onClick={() => {
              setAnimateDone(false);
              setReviewingKey(completeKey);
            }}
          >
            Modifica
          </Button>
        </div>
      ) : (
        <>
          <div className="max-w-sm">
            <Select
              label="Tipo di documento"
              name="document_type"
              required
              options={[
                { value: "", label: "Seleziona il tipo" },
                ...DOCUMENT_TYPES.map((t) => ({
                  value: t,
                  label: DOCUMENT_TYPE_LABELS[t],
                })),
              ]}
              value={type ?? ""}
              error={errorFor("document_type")}
              onChange={(e) => onTypeChange((e.target.value || null) as DocumentType | null)}
              onBlur={() => touch("document_type")}
            />
          </div>

          {type !== null && (
            <fieldset data-testid="document-upload" className="min-w-0 space-y-3">
              <legend className="mb-2 text-sm font-semibold text-ink">
                {type === "passaporto" ? "Carica il passaporto" : "Carica il documento"}
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                {sides.map((side) => (
                  <DocumentSlot
                    key={side}
                    side={side}
                    label={sideLabel(type, side)}
                    doc={slots[side]}
                    fresh={slots[side] !== null && slots[side]?.id === freshDocId}
                    hintId={hintId}
                    busy={busy}
                    uploading={uploadingSide === side}
                    removing={slots[side] !== null && removingId === slots[side]?.id}
                    error={
                      (uploadError?.side === side && uploadError.message) ||
                      (removeError?.side === side && removeError.message) ||
                      null
                    }
                    errorKind={uploadError?.side === side ? "upload" : "remove"}
                    onFile={(file) => void onFiles(side, file)}
                    onRemove={(id) => void onRemove(side, id)}
                  />
                ))}
              </div>
              {slots.extra.length > 0 && (
                <ul data-testid="document-list" className="space-y-2">
                  {slots.extra.map((d) => (
                    <li key={d.id}>
                      <DocumentRow
                        doc={d}
                        ariaLabel={`Rimuovi ${d.name}`}
                        removing={removingId === d.id}
                        disabled={busy}
                        onRemove={() => void onRemove("back", d.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <ManualDocumentBlock
                type={type}
                // Hidden (kept mounted, so what was typed survives) once every required side is uploaded.
                visible={!complete}
                state={state}
                update={update}
                errorFor={errorFor}
                touch={touch}
                edited={edited}
              />
              <p id={hintId} className="text-sm text-ink-muted">
                Foto (JPG, PNG, HEIC) o PDF, max 4 MB; le foto vengono ridotte in automatico.
              </p>
              {documentError && (
                <p
                  id={missingId}
                  data-testid="document-missing-error"
                  role="alert"
                  className="text-sm font-medium text-danger"
                >
                  {documentError}
                </p>
              )}
              {complete && (
                <Button
                  type="button"
                  data-testid="document-done"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    setArmedKey(completeKey);
                    setReviewingKey(null);
                    setAnimateDone(true);
                  }}
                >
                  Fatto
                </Button>
              )}
            </fieldset>
          )}
        </>
      )}
    </div>
  );
}

const COLLAPSE_DELAY_MS = 800;

const MANUAL_FIELDS = ["document_number", "document_issuer", "document_expiry"] as const;

/** Type-specific hint for "Rilasciato da" (the issuing body differs per document). */
const ISSUER_HINTS: Record<DocumentType, string> = {
  carta_identita: "Comune che l'ha rilasciata",
  patente: "Motorizzazione, UCO o Prefettura",
  passaporto: "Questura",
};

/**
 * Manual alternative to the photos (SPEC #39): number, issuer, expiry. It collapses (grid rows
 * 1fr to 0fr, instant under reduced motion) once the photos are complete and comes back when a
 * side is removed. `invisible` flips at the end of the hide, so hidden fields are neither
 * focusable nor read by screen readers.
 */
function ManualDocumentBlock({
  type,
  visible,
  state,
  update,
  errorFor,
  touch,
  edited,
}: SectionProps & { type: DocumentType; visible: boolean }) {
  const a = state.activation;
  return (
    <div
      data-testid="doc-manual-block"
      data-state={visible ? "open" : "closed"}
      aria-hidden={visible ? undefined : true}
      className={cn(
        "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none",
        visible ? "grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {/* Padding inside the clipped box so focus rings are not cut. */}
        <div className="space-y-4 p-1">
          <p className="text-sm text-ink-muted">
            Non hai le foto? Inserisci i dati del documento. Se carichi le foto, i dati non servono.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Numero documento"
              name="document_number"
              data-testid="doc-number"
              required
              autoCapitalize="characters"
              // Identity data: never remembered by the browser.
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              value={a.documentNumber}
              error={errorFor("document_number")}
              onChange={(e) => {
                edited("document_number");
                update({ activation: { documentNumber: e.target.value.toUpperCase() } });
              }}
              onBlur={() => touch("document_number")}
            />
            <Input
              label="Rilasciato da"
              name="document_issuer"
              data-testid="doc-issuer"
              required
              hint={ISSUER_HINTS[type]}
              autoComplete="off"
              maxLength={80}
              value={a.documentIssuer}
              error={errorFor("document_issuer")}
              onChange={(e) => {
                edited("document_issuer");
                update({ activation: { documentIssuer: e.target.value } });
              }}
              onBlur={() => touch("document_issuer")}
            />
          </div>
          <Input
            label="Data di scadenza"
            name="document_expiry"
            data-testid="doc-expiry"
            type="date"
            required
            max="2100-12-31"
            autoComplete="off"
            className="sm:max-w-xs"
            value={a.documentExpiry}
            error={errorFor("document_expiry")}
            onChange={(e) => {
              edited("document_expiry");
              update({ activation: { documentExpiry: e.target.value } });
            }}
            onBlur={() => touch("document_expiry")}
          />
        </div>
      </div>
    </div>
  );
}

type SideMessage = { side: DocumentSide; message: string };

/** One filled file: check, name (truncated), size and the remove button. */
function DocumentRow({
  doc,
  ariaLabel,
  removing,
  disabled,
  showCheck = true,
  onRemove,
}: {
  doc: FlowUploadedDocument;
  ariaLabel: string;
  removing: boolean;
  disabled: boolean;
  /** False in a slot: the slot title row carries the green badge instead. */
  showCheck?: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      data-testid="document-item"
      className="flex items-center gap-2 text-sm text-ink"
    >
      {showCheck && (
        <span aria-hidden="true" className="text-brand-600">
          <CheckIcon className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{doc.name}</span>
      <span className="shrink-0 text-ink-muted">
        {formatUploadSize(doc.size_bytes)}
      </span>
      <Button
        type="button"
        variant="ghost"
        data-testid="document-remove"
        aria-label={ariaLabel}
        loading={removing}
        disabled={disabled}
        className="-my-2 -mr-2 shrink-0 gap-1.5 px-3"
        onClick={onRemove}
      >
        <CloseIcon className="size-4" />
        Rimuovi
      </Button>
    </div>
  );
}

/** Front or back of the identity document: empty (choose a file) or filled (file + remove). */
function DocumentSlot({
  side,
  label,
  doc,
  fresh,
  hintId,
  busy,
  uploading,
  removing,
  error,
  errorKind,
  onFile,
  onRemove,
}: {
  side: DocumentSide;
  label: string;
  doc: FlowUploadedDocument | null;
  /** The file was uploaded in this session (animate the badge, announce it). */
  fresh: boolean;
  hintId: string;
  busy: boolean;
  uploading: boolean;
  removing: boolean;
  error: string | null;
  errorKind: "upload" | "remove";
  onFile: (file: File | undefined) => void;
  onRemove: (id: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      data-testid={`document-slot-${side}`}
      className="min-w-0 space-y-2 rounded-control border border-line px-3 py-3"
    >
      {/* Fixed-height title row: the badge appears inside it without moving anything. */}
      <div className="flex min-h-7 items-center justify-between gap-2">
        <p id={`${id}-label`} className="text-sm font-semibold text-ink">
          {label}
        </p>
        {doc && (
          <span
            aria-hidden="true"
            data-testid={`document-slot-${side}-badge`}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white",
              fresh && "animate-badge-pop motion-reduce:animate-none",
            )}
          >
            <CheckIcon className="size-4" strokeWidth={3} />
          </span>
        )}
      </div>
      {/* Always mounted so the announcement is read when it fills; silent on reload/restore. */}
      <span role="status" className="sr-only">
        {doc && fresh ? `${label} caricato` : ""}
      </span>
      {doc ? (
        <DocumentRow
          showCheck={false}
          doc={doc}
          ariaLabel={`Rimuovi ${label.toLowerCase()}: ${doc.name}`}
          removing={removing}
          disabled={busy}
          onRemove={() => onRemove(doc.id)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-control focus-within:ring-[3px] focus-within:ring-brand-100">
          {/* No "capture": the customer may pick an existing photo, a file or the camera. */}
          <input
            ref={inputRef}
            id={`${id}-file`}
            data-testid={`document-file-${side}`}
            name={`document_file_${side}`}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            disabled={busy}
            aria-labelledby={`${id}-label`}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onFile(file);
            }}
            className="peer sr-only"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            aria-label={`Scegli file: ${label.toLowerCase()}`}
            className="min-h-11 peer-focus-visible:border-brand-600"
            onClick={() => inputRef.current?.click()}
          >
            Scegli file
          </Button>
          {uploading ? (
            <span
              data-testid="document-uploading"
              role="status"
              className="flex items-center gap-2 text-sm text-ink-muted"
            >
              <SpinnerIcon className="size-4 animate-spin" />
              Caricamento in corso&hellip;
            </span>
          ) : (
            <span
              data-testid="document-status"
              className="text-sm text-ink-muted"
            >
              Nessun file selezionato
            </span>
          )}
        </div>
      )}
      {error && (
        <p
          id={errorId}
          data-testid={
            errorKind === "upload"
              ? "document-upload-error"
              : "document-remove-error"
          }
          role="alert"
          className="text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
