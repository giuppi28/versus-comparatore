import { formatEuro, formatPrice, formatVariablePrice, isVariableOffer } from "@/lib/logic";
import type { Lead, LeadOfferSnapshot } from "@/lib/data/types";

/** "Offerta eliminata: <supplier> — <offer>" (the live offer no longer exists). */
export function deletedOfferTitle(s: LeadOfferSnapshot): string {
  return `Offerta eliminata: ${s.supplier_name ?? "fornitore sconosciuto"} — ${s.offer_name}`;
}

export const IBAN_REQUIRED_LABEL = "Pagamento con IBAN obbligatorio";

/** The parts of a live offer the lead detail shows besides its name. */
export interface LiveOfferInfo {
  label: string;
  price_type?: "fixed" | "variable";
  energy_price: number;
  iban_required?: boolean;
}

/** Extra lines under a live offer: the PUN spread (variable only, no lock line) and the IBAN notice. */
export function liveOfferLines(o: Omit<LiveOfferInfo, "label">): string[] {
  const lines: string[] = [];
  if (isVariableOffer(o)) lines.push(`Prezzo energia: ${formatVariablePrice(o.energy_price)}`);
  if (o.iban_required) lines.push(IBAN_REQUIRED_LABEL);
  return lines;
}

/** Italian-formatted prices stored in the snapshot, one entry per line. */
export function snapshotPriceLines(s: LeadOfferSnapshot): string[] {
  const unit = s.commodity === "luce" ? "kWh" : "Smc";
  const variable = isVariableOffer(s);
  const lines = [
    // Variable offers store the spread over PUN in energy_price.
    `Prezzo energia: ${variable ? formatVariablePrice(s.energy_price) : formatPrice(s.energy_price, unit)}`,
    `Altri costi variabili: ${formatPrice(s.other_variable_costs, unit)}`,
    `Quota fissa: ${formatEuro(s.fixed_fee_monthly)}/mese`,
  ];
  if (s.other_fixed_costs_monthly) lines.push(`Altri costi fissi: ${formatEuro(s.other_fixed_costs_monthly)}/mese`);
  if (!variable && s.locked_months !== null) {
    lines.push(`Vincolo: ${s.locked_months} ${s.locked_months === 1 ? "mese" : "mesi"}`);
  }
  if (s.iban_required) lines.push(IBAN_REQUIRED_LABEL);
  return lines;
}

/** Current supplier label; falls back to the stored name when the supplier row is gone. */
export function currentSupplierLabel(liveName: string | null, storedName: string | null): string | null {
  if (liveName) return liveName;
  return storedName ? `${storedName} (fornitore eliminato)` : null;
}

export type ChosenOfferView =
  { kind: "none" } | { kind: "live"; label: string; lines: string[] } | { kind: "deleted"; title: string; lines: string[] };

/** What to show for a chosen offer: live name, the deleted snapshot, or nothing. */
export function chosenOfferView(
  live: LiveOfferInfo | null,
  snapshot: Lead["chosen_offer_luce_snapshot"],
  /** The lead still holds an offer id (which then failed to resolve and has no snapshot). */
  hasOfferId = false,
): ChosenOfferView {
  if (live) return { kind: "live", label: live.label, lines: liveOfferLines(live) };
  if (snapshot)
    return {
      kind: "deleted",
      title: deletedOfferTitle(snapshot),
      lines: snapshotPriceLines(snapshot),
    };
  if (hasOfferId) return { kind: "live", label: "Offerta non più disponibile", lines: [] };
  return { kind: "none" };
}
