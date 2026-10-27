import { formatEuro, formatPrice } from "@/lib/logic";
import type { Lead, LeadOfferSnapshot } from "@/lib/data/types";

/** "Offerta eliminata: <supplier> — <offer>" (the live offer no longer exists). */
export function deletedOfferTitle(s: LeadOfferSnapshot): string {
  return `Offerta eliminata: ${s.supplier_name ?? "fornitore sconosciuto"} — ${s.offer_name}`;
}

/** Italian-formatted prices stored in the snapshot, one entry per line. */
export function snapshotPriceLines(s: LeadOfferSnapshot): string[] {
  const unit = s.commodity === "luce" ? "kWh" : "Smc";
  const lines = [
    `Prezzo energia: ${formatPrice(s.energy_price, unit)}`,
    `Altri costi variabili: ${formatPrice(s.other_variable_costs, unit)}`,
    `Quota fissa: ${formatEuro(s.fixed_fee_monthly)}/mese`,
  ];
  if (s.other_fixed_costs_monthly) lines.push(`Altri costi fissi: ${formatEuro(s.other_fixed_costs_monthly)}/mese`);
  if (s.locked_months !== null) lines.push(`Vincolo: ${s.locked_months} ${s.locked_months === 1 ? "mese" : "mesi"}`);
  return lines;
}

/** Current supplier label; falls back to the stored name when the supplier row is gone. */
export function currentSupplierLabel(liveName: string | null, storedName: string | null): string | null {
  if (liveName) return liveName;
  return storedName ? `${storedName} (fornitore eliminato)` : null;
}

export type ChosenOfferView =
  { kind: "none" } | { kind: "live"; label: string } | { kind: "deleted"; title: string; lines: string[] };

/** What to show for a chosen offer: live name, the deleted snapshot, or nothing. */
export function chosenOfferView(
  liveLabel: string | null,
  snapshot: Lead["chosen_offer_luce_snapshot"],
  /** The lead still holds an offer id (which then failed to resolve and has no snapshot). */
  hasOfferId = false,
): ChosenOfferView {
  if (liveLabel) return { kind: "live", label: liveLabel };
  if (snapshot)
    return {
      kind: "deleted",
      title: deletedOfferTitle(snapshot),
      lines: snapshotPriceLines(snapshot),
    };
  if (hasOfferId) return { kind: "live", label: "Offerta non più disponibile" };
  return { kind: "none" };
}
