import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MOCK_OFFERS, MOCK_SUPPLIERS } from "@/lib/data";
import type { OfferWithSupplier } from "@/lib/data/types";
import { monthlyCost } from "@/lib/logic";
import { ConsumptionPanel } from "./ConsumptionPanel";
import { DualStepIndicator } from "./DualStepIndicator";
import { EmptyState } from "./EmptyState";
import { OfferCard } from "./OfferCard";

function withSupplier(offerId: string): OfferWithSupplier {
  const offer = MOCK_OFFERS.find((o) => o.id === offerId)!;
  return { ...offer, supplier: MOCK_SUPPLIERS.find((s) => s.id === offer.supplier_id)! };
}

describe("OfferCard", () => {
  const edison = withSupplier("offer-aldo-14");
  const cost = monthlyCost(edison, 2700)!;

  it("shows the PRD §8 elements and exposes the data attributes", () => {
    const onActivate = vi.fn();
    render(<OfferCard offer={edison} commodity="luce" monthlyCost={cost} featured onActivate={onActivate} />);
    const card = screen.getByTestId("offer-card");
    expect(card).toHaveAttribute("data-offer-id", edison.id);
    expect(card).toHaveAttribute("data-supplier-id", "sentra-energia");
    expect(card).toHaveAttribute("data-featured", "true");
    expect(card).toHaveAttribute("data-monthly-cost", String(Math.round(cost * 100)));
    expect(screen.getByText("In evidenza")).toBeInTheDocument();
    expect(screen.getByText("Offerta Sentra Energia")).toBeInTheDocument();
    expect(screen.getByTestId("offer-locked")).toHaveTextContent("Bloccato 12 mesi");
    expect(screen.getByTestId("offer-price")).toHaveTextContent("€/kWh");
    expect(screen.getByTestId("offer-fixed-fee")).toHaveTextContent("0,00");
    expect(screen.queryByTestId("offer-promo")).toBeNull();
    expect(screen.getByText("stima")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("offer-cta"));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("offer-cta")).toHaveTextContent("Attiva online in 1 minuto");
  });

  it("hides band and promo when the offer has none, expands the details", () => {
    const sorgenia = withSupplier("offer-aldo-01");
    render(<OfferCard offer={sorgenia} commodity="luce" monthlyCost={50} onActivate={() => {}} />);
    expect(screen.queryByTestId("offer-featured-band")).toBeNull();
    expect(screen.queryByTestId("offer-promo")).toBeNull();
    expect(screen.queryByTestId("offer-details")).toBeNull();
    fireEvent.click(screen.getByTestId("offer-details-toggle"));
    expect(screen.getByTestId("offer-details")).toBeInTheDocument();
    expect(screen.getByTestId("offer-details-toggle")).toHaveAttribute("aria-expanded", "true");
  });

  it("badge follows the featured prop, not offer.featured", () => {
    const forced = { ...edison, featured: true };
    const { unmount } = render(<OfferCard offer={forced} commodity="luce" monthlyCost={cost} onActivate={() => {}} />);
    expect(screen.queryByTestId("offer-featured-band")).toBeNull();
    expect(screen.getByTestId("offer-card")).toHaveAttribute("data-featured", "false");
    unmount();
    render(<OfferCard offer={{ ...edison, featured: false }} commodity="luce" monthlyCost={cost} featured onActivate={() => {}} />);
    expect(screen.getByTestId("offer-featured-band")).toHaveTextContent("In evidenza");
    expect(screen.getByTestId("offer-card")).toHaveAttribute("data-featured", "true");
  });

  it("variable offer: PUN spread, 'Varia con il PUN', no lock line, IBAN notice", () => {
    const trend = withSupplier("offer-aldo-05");
    expect(trend.price_type).toBe("variable");
    expect(trend.iban_required).toBe(true);
    render(<OfferCard offer={trend} commodity="luce" monthlyCost={null} onActivate={() => {}} />);
    expect(screen.getByTestId("offer-price")).toHaveTextContent("PUN + 0,02 €/kWh");
    expect(screen.getByTestId("offer-monthly")).toHaveTextContent("Varia con il PUN");
    expect(screen.queryByTestId("offer-locked")).toBeNull();
    expect(screen.queryByText(/Bloccato/)).toBeNull();
    expect(screen.queryByText("stima")).toBeNull();
    expect(screen.getByTestId("offer-iban-notice")).toHaveTextContent(
      "Per attivare questa offerta è obbligatorio il pagamento con IBAN: ti servirà al passo successivo.",
    );
    fireEvent.click(screen.getByTestId("offer-details-toggle"));
    expect(screen.queryByText("Prezzo bloccato")).toBeNull();
  });

  it("no IBAN notice for offers that do not require it", () => {
    const iren = withSupplier("offer-aldo-03");
    render(<OfferCard offer={iren} commodity="luce" monthlyCost={null} onActivate={() => {}} />);
    expect(screen.queryByTestId("offer-iban-notice")).toBeNull();
  });

  it("uses Smc for gas and marks a chosen offer", () => {
    const hera = withSupplier("offer-aldo-27");
    render(<OfferCard offer={hera} commodity="gas" monthlyCost={40} chosen onActivate={() => {}} />);
    expect(screen.getByTestId("offer-price")).toHaveTextContent("€/Smc");
    expect(screen.getByTestId("offer-chosen-badge")).toBeInTheDocument();
  });
});

describe("ConsumptionPanel", () => {
  it("pushes valid values up and flags invalid ones without calling onChange", () => {
    const onChange = vi.fn();
    render(<ConsumptionPanel commodity="luce" monthly={225} onChange={onChange} />);
    const input = screen.getByTestId("results-consumption-kwh");
    expect(input).toHaveValue("225");
    fireEvent.change(input, { target: { value: "300" } });
    expect(onChange).toHaveBeenLastCalledWith(300);
    onChange.mockClear();
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/consumo mensile valido/i)).toBeInTheDocument();
    fireEvent.blur(input);
    expect(input).toHaveValue("225");
  });

  it("uses the Smc test id for gas", () => {
    render(<ConsumptionPanel commodity="gas" monthly={60} onChange={() => {}} />);
    expect(screen.getByTestId("results-consumption-smc")).toBeInTheDocument();
  });
});

describe("DualStepIndicator", () => {
  it("shows 1 Luce -> 2 Gas with done marks", () => {
    render(<DualStepIndicator active="gas" luceDone gasDone={false} />);
    const ind = screen.getByTestId("dual-step-indicator");
    expect(ind).toHaveTextContent(/1\s*Luce/);
    expect(ind).toHaveTextContent(/2\s*Gas/);
    expect(ind).toHaveAttribute("data-active", "gas");
    expect(screen.getByText("Luce").closest("li")).toHaveAttribute("data-done", "true");
    expect(screen.getByText("Gas").closest("li")).toHaveAttribute("data-done", "false");
  });
});

describe("EmptyState", () => {
  it("explains the situation without any call wording", () => {
    render(<EmptyState commodityLabel="Gas" />);
    const el = screen.getByTestId("results-empty");
    expect(el).toHaveTextContent("Nessuna offerta disponibile");
    expect(el.textContent).not.toMatch(/chiam|telefon|richiam|call/i);
    expect(screen.getByRole("link", { name: "Modifica i dati" })).toHaveAttribute("href", "/");
  });
});
