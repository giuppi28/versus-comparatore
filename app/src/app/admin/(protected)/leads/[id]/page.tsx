import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import type { Lead } from "@/lib/data/types";
import { LeadEditForm } from "../LeadEditForm";
import { StatusBadge, StepBadge } from "../LeadBadges";
import {
  COMMODITY_LABELS,
  CUSTOMER_TYPE_LABELS,
  HOUSING_TITLE_LABELS,
  SERVICE_TYPE_LABELS,
  applianceLabel,
  formatDateTime,
  formatEuro,
  gasUseLabel,
  sqmLabel,
} from "../labels";
import { leadDisplayName } from "../list-params";

export const metadata: Metadata = { title: "Dettaglio lead — Area riservata VERSUS" };

const num = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const yesNo = (v: boolean | null) => (v === null ? null : v ? "Sì" : "No");

function Group({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <Card data-testid={testId} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">{title}</h2>
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

  const supplierName = async (sid: string | null) => (sid ? ((await repo.getSupplier(sid))?.name ?? sid) : null);
  const offerName = async (oid: string | null) => {
    if (!oid) return null;
    const o = await repo.getOffer(oid);
    return o ? `${o.supplier.name} — ${o.name}` : "Offerta non più disponibile";
  };
  const [comune, supLuce, supGas, offLuce, offGas] = await Promise.all([
    lead.comune_istat ? repo.getComune(lead.comune_istat) : null,
    supplierName(lead.current_supplier_luce),
    supplierName(lead.current_supplier_gas),
    offerName(lead.chosen_offer_luce),
    offerName(lead.chosen_offer_gas),
  ]);

  const isBusiness = lead.customer_type === "business";
  const list = (items: string[], label: (s: string) => string) =>
    items.length ? items.map(label).join(", ") : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/leads" className="text-sm font-semibold text-brand-700 underline underline-offset-2">
          ← Tutti i lead
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{leadDisplayName(lead)}</h1>
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
                <Field label="Titolo abitazione" value={lead.housing_title ? HOUSING_TITLE_LABELS[lead.housing_title] : null} />
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
            <Field label="Stima luce (kWh/anno)" value={lead.estimated_kwh_year === null ? null : num.format(lead.estimated_kwh_year)} />
            <Field label="Stima gas (Smc/anno)" value={lead.estimated_smc_year === null ? null : num.format(lead.estimated_smc_year)} />
            <Field label="Consumo inserito a mano" value={yesNo(lead.manual_consumption)} />
            <Field label="Consumo finale luce (kWh/mese)" value={lead.final_kwh_month === null ? null : num.format(lead.final_kwh_month)} />
            <Field label="Consumo finale gas (Smc/mese)" value={lead.final_smc_month === null ? null : num.format(lead.final_smc_month)} />
          </Group>

          <Group title="Offerte scelte" testId="group-offerte">
            <Field label="Offerta luce" value={offLuce} />
            <Field label="Offerta gas" value={offGas} />
            <Field label="Costo mensile mostrato" value={lead.monthly_cost_shown === null ? null : formatEuro(lead.monthly_cost_shown)} />
          </Group>

          <Group title="Dati tecnici" testId="group-tecnici">
            <Field label="POD" value={lead.pod} />
            <Field label="Potenza (kW)" value={lead.power_kw === null ? null : num.format(lead.power_kw)} />
            <Field label="Tensione" value={lead.voltage === null ? null : `${lead.voltage} V`} />
            <Field label="PDR" value={lead.pdr} />
          </Group>

          <Group title="Consensi" testId="group-consensi">
            <Field label="Privacy" value={consent(lead, "privacy_consent")} />
            <Field label="Marketing" value={consent(lead, "marketing_consent")} />
          </Group>
        </div>

        <Card className="flex flex-col gap-4 lg:sticky lg:top-6" data-testid="lead-edit-card">
          <h2 className="text-lg font-bold">Gestione</h2>
          <LeadEditForm id={lead.id} status={lead.status} notes={lead.notes} />
        </Card>
      </div>
    </div>
  );
}

function consent(lead: Lead, key: "privacy_consent" | "marketing_consent"): string {
  const v = lead[key];
  return v === null ? "Non indicato" : v ? "Sì" : "No";
}
