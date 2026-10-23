import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import type { Lead } from "@/lib/data/types";
import { podDistributor, pdrDistributor } from "@/lib/logic";
import { DeleteLeadButton } from "../DeleteLeadButton";
import { LeadDocuments } from "../LeadDocuments";
import { LeadEditForm } from "../LeadEditForm";
import { StatusBadge, StepBadge } from "../LeadBadges";
import {
  COMMODITY_LABELS,
  CUSTOMER_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  HOUSING_TITLE_LABELS,
  SERVICE_TYPE_LABELS,
  applianceLabel,
  formatDate,
  formatDateTime,
  formatEuro,
  formatIban,
  gasUseLabel,
  sqmLabel,
} from "../labels";
import { leadDisplayName } from "../list-params";
import { chosenOfferView, currentSupplierLabel, type ChosenOfferView } from "../snapshot";

export const metadata: Metadata = {
  title: "Dettaglio lead — Area riservata VERSUS",
};

const num = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const yesNo = (v: boolean | null) => (v === null ? null : v ? "Sì" : "No");

function Group({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <Card data-testid={testId} className="flex flex-col gap-4">
      <h2 className="heading-section">{title}</h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="break-words font-medium">{empty ? <span className="text-ink-subtle">—</span> : value}</dd>
    </div>
  );
}

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const repo = await getAdminRepository();
  const lead = await repo.getLead(id);
  if (!lead) notFound();

  // A live id that no longer resolves falls through to the stored name / snapshot (PHASE11 D1).
  const supplierName = async (sid: string | null) => (sid ? ((await repo.getSupplier(sid))?.name ?? null) : null);
  const offerName = async (oid: string | null) => {
    if (!oid) return null;
    const o = await repo.getOffer(oid);
    return o ? `${o.supplier.name} — ${o.name}` : null;
  };
  const documents = await repo.listLeadDocuments(lead.id);
  const [comune, supLuce, supGas, offLuce, offGas] = await Promise.all([
    lead.comune_istat ? repo.getComune(lead.comune_istat) : null,
    supplierName(lead.current_supplier_luce).then((n) => currentSupplierLabel(n, lead.current_supplier_luce_name)),
    supplierName(lead.current_supplier_gas).then((n) => currentSupplierLabel(n, lead.current_supplier_gas_name)),
    offerName(lead.chosen_offer_luce).then((n) =>
      chosenOfferView(n, lead.chosen_offer_luce_snapshot, !!lead.chosen_offer_luce),
    ),
    offerName(lead.chosen_offer_gas).then((n) =>
      chosenOfferView(n, lead.chosen_offer_gas_snapshot, !!lead.chosen_offer_gas),
    ),
  ]);

  const isBusiness = lead.customer_type === "business";
  const list = (items: string[], label: (s: string) => string) => (items.length ? items.map(label).join(", ") : null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/leads" className="text-sm font-semibold text-brand-700 underline underline-offset-2">
          ← Tutti i lead
        </Link>
        <h1 className="mt-2 heading-wide text-title break-words">{leadDisplayName(lead)}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StepBadge step={lead.step_reached} />
          <StatusBadge status={lead.status} />
          <span className="text-sm text-ink-muted">
            Creato {formatDateTime(lead.created_at)} · aggiornato {formatDateTime(lead.updated_at)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Group title="Contatto" testId="group-contatto">
            <Field label="Nome" value={lead.first_name} />
            <Field label="Cognome" value={lead.last_name} />
            <Field label="Telefono" value={lead.phone} />
            <Field label="Tipo cliente" value={lead.customer_type ? CUSTOMER_TYPE_LABELS[lead.customer_type] : null} />
            {isBusiness ? (
              <>
                <Field label="Ragione sociale" value={lead.company_name} />
                <Field label="Partita IVA" value={lead.vat_number} />
              </>
            ) : (
              <>
                <Field label="Codice fiscale" value={lead.tax_code} />
                <Field
                  label="Titolo abitazione"
                  value={lead.housing_title ? HOUSING_TITLE_LABELS[lead.housing_title] : null}
                />
              </>
            )}
          </Group>

          <Group title="Fornitura" testId="group-fornitura">
            <Field label="Richiesta" value={lead.commodity ? COMMODITY_LABELS[lead.commodity] : null} />
            <Field label="Tipo di pratica" value={lead.service_type ? SERVICE_TYPE_LABELS[lead.service_type] : null} />
            <Field label="Comune" value={comune ? `${comune.name} (${comune.province_code})` : null} />
            <Field label="CAP" value={lead.cap} />
            <Field label="Indirizzo" value={[lead.address, lead.street_number].filter(Boolean).join(", ")} />
            <Field label="Residente" value={yesNo(lead.is_resident)} />
            <Field label="Fornitore attuale luce" value={supLuce} />
            <Field label="Fornitore attuale gas" value={supGas} />
            <Field label="Ha anche il gas" value={yesNo(lead.has_gas)} />
          </Group>

          <Group title="Consumi" testId="group-consumi">
            <Field label="Persone" value={lead.people} />
            <Field label="Elettrodomestici" value={list(lead.appliances, applianceLabel)} />
            <Field label="Usi del gas" value={list(lead.gas_uses, gasUseLabel)} />
            <Field label="Superficie" value={lead.sqm_range ? sqmLabel(lead.sqm_range) : null} />
            <Field
              label="Stima luce (kWh/anno)"
              value={lead.estimated_kwh_year === null ? null : num.format(lead.estimated_kwh_year)}
            />
            <Field
              label="Stima gas (Smc/anno)"
              value={lead.estimated_smc_year === null ? null : num.format(lead.estimated_smc_year)}
            />
            <Field label="Consumo inserito a mano" value={yesNo(lead.manual_consumption)} />
            <Field
              label="Consumo finale luce (kWh/mese)"
              value={lead.final_kwh_month === null ? null : num.format(lead.final_kwh_month)}
            />
            <Field
              label="Consumo finale gas (Smc/mese)"
              value={lead.final_smc_month === null ? null : num.format(lead.final_smc_month)}
            />
          </Group>

          <Group title="Offerte scelte" testId="group-offerte">
            <Field label="Offerta luce" value={<OfferValue view={offLuce} testId="offer-luce" />} />
            <Field label="Offerta gas" value={<OfferValue view={offGas} testId="offer-gas" />} />
            <Field
              label="Costo mensile mostrato"
              value={lead.monthly_cost_shown === null ? null : formatEuro(lead.monthly_cost_shown)}
            />
          </Group>

          <Group title="Dati tecnici" testId="group-tecnici">
            <Field
              label="POD"
              value={
                <WithDistributor
                  value={lead.pod}
                  distributor={lead.pod ? podDistributor(lead.pod) : null}
                  testId="pod-distributor"
                />
              }
            />
            <Field label="Potenza (kW)" value={lead.power_kw === null ? null : num.format(lead.power_kw)} />
            <Field label="Tensione" value={lead.voltage === null ? null : `${lead.voltage} V`} />
            <Field
              label="PDR"
              value={
                <WithDistributor
                  value={lead.pdr}
                  distributor={lead.pdr ? pdrDistributor(lead.pdr) : null}
                  testId="pdr-distributor"
                />
              }
            />
          </Group>

          <Group title="Pagamento" testId="group-pagamento">
            <Field
              label="IBAN"
              value={
                lead.iban ? (
                  <span data-testid="lead-iban" className="font-mono tabular-nums">
                    {formatIban(lead.iban)
                      .split(" ")
                      .map((group, i) => (
                        <span key={i}>
                          {i > 0 ? " " : ""}
                          <span className="whitespace-nowrap">{group}</span>
                        </span>
                      ))}
                  </span>
                ) : (
                  <span className="text-ink-subtle">Non indicato</span>
                )
              }
            />
            {lead.iban && lead.iban_holder_different && (
              <Field
                label="Intestatario del conto"
                value={
                  <span data-testid="lead-iban-holder">
                    {[lead.iban_holder_first_name, lead.iban_holder_last_name].filter(Boolean).join(" ")}
                    {lead.iban_holder_tax_code ? ` — ${lead.iban_holder_tax_code}` : ""}
                  </span>
                }
              />
            )}
          </Group>

          <Group title="Documento d'identità" testId="group-documento">
            {lead.document_type || lead.document_number || lead.document_expiry || lead.document_issuer ? (
              <>
                <Field
                  label="Tipo"
                  value={lead.document_type ? (DOCUMENT_TYPE_LABELS[lead.document_type] ?? lead.document_type) : null}
                />
                <Field label="Numero" value={lead.document_number} />
                <Field label="Scadenza" value={lead.document_expiry ? formatDate(lead.document_expiry) : null} />
                <Field label="Ente di rilascio" value={lead.document_issuer} />
              </>
            ) : (
              <Field label="Dati del documento" value={<span className="text-ink-subtle">Non indicato</span>} />
            )}
            <div className="min-w-0 sm:col-span-2">
              <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">File caricati</dt>
              <dd>
                <LeadDocuments documents={documents} />
              </dd>
            </div>
          </Group>

          <Group title="Consensi" testId="group-consensi">
            <Field label="Privacy" value={consent(lead, "privacy_consent")} />
            <Field label="Marketing" value={consent(lead, "marketing_consent")} />
          </Group>
        </div>

        <Card className="flex flex-col gap-4 lg:sticky lg:top-6" data-testid="lead-edit-card">
          <h2 className="heading-section">Gestione</h2>
          <LeadEditForm id={lead.id} status={lead.status} notes={lead.notes} />
          <div className="border-t border-line pt-4">
            <DeleteLeadButton id={lead.id} name={leadDisplayName(lead)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function OfferValue({ view, testId }: { view: ChosenOfferView; testId: string }) {
  if (view.kind === "none") return null;
  if (view.kind === "live") return <span data-testid={testId}>{view.label}</span>;
  return (
    <span data-testid={testId} data-deleted="true" className="flex flex-col gap-1">
      <span>{view.title}</span>
      <span className="flex flex-col text-sm font-normal text-ink-muted">
        {view.lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </span>
    </span>
  );
}

function consent(lead: Lead, key: "privacy_consent" | "marketing_consent"): string {
  const v = lead[key];
  return v === null ? "Non indicato" : v ? "Sì" : "No";
}

function WithDistributor({
  value,
  distributor,
  testId,
}: {
  value: string | null;
  distributor: { name: string } | null;
  testId: string;
}) {
  if (!value) return null;
  return (
    <span className="flex flex-col">
      <span>{value}</span>
      <span className="text-sm font-normal text-ink-muted" data-testid={testId}>
        Distributore: {distributor ? distributor.name : "non riconosciuto"}
      </span>
    </span>
  );
}
