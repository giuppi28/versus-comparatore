import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferModal, type OfferModalOffer } from "./OfferModal";
import { renderBold } from "./formatBold";

function makeOffer(over: Partial<OfferModalOffer> = {}): OfferModalOffer {
  return {
    id: "o1",
    supplier_id: "s1",
    name: "Casa Fix 12",
    commodity: "luce",
    customer_type: "casa",
    price_type: "fixed",
    energy_price: 0.1234,
    other_variable_costs: 0.0156,
    fixed_fee_monthly: 9.5,
    other_fixed_costs_monthly: 0,
    locked_months: 12,
    activation_cost: 0,
    promo_text: null,
    advantages: ["**Prezzo bloccato** per 12 mesi", "Seconda voce", "Terza **voce** finale"],
    details: null,
    featured: false,
    iban_required: false,
    featured_audience: null,
    active: true,
    price_verified: false,
    updated_at: "2026-10-15T00:00:00.000Z",
    supplier: { name: "Alfa Energia", logoUrl: null, logo_path: null },
    ...over,
  };
}

function setup(over: Partial<OfferModalOffer> = {}, props: Record<string, unknown> = {}) {
  const onClose = vi.fn();
  const onActivate = vi.fn();
  render(
    <OfferModal
      open
      onClose={onClose}
      onActivate={onActivate}
      offer={makeOffer(over)}
      commodity="luce"
      monthlyCost={56.78}
      {...props}
    />,
  );
  return { onClose, onActivate };
}

describe("OfferModal", () => {
  it("renders nothing when closed", () => {
    render(
      <OfferModal
        open={false}
        onClose={() => {}}
        onActivate={() => {}}
        offer={makeOffer()}
        commodity="luce"
        monthlyCost={10}
      />,
    );
    expect(screen.queryByTestId("offer-modal")).not.toBeInTheDocument();
  });

  it("shows the offer name, supplier text chip and heading", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Casa Fix 12" })).toBeInTheDocument();
    expect(within(screen.getByTestId("offer-modal-logo")).getByText("Alfa Energia")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "I vantaggi dell'offerta" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Caratteristiche principali" })).toBeInTheDocument();
  });

  it("renders an image when the supplier has a logo URL", () => {
    setup({ supplier: { name: "Alfa Energia", logoUrl: "/logos/alfa.svg" } });
    expect(screen.getByRole("img", { name: "Alfa Energia" })).toHaveAttribute("src", "/logos/alfa.svg");
  });

  it("ignores a bare storage path in logo_path (falls back to text)", () => {
    setup({ supplier: { name: "Alfa Energia", logo_path: "logos/alfa.svg" } });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders advantages in order with bold segments", () => {
    setup();
    const items = within(screen.getByTestId("offer-modal-advantages")).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Prezzo bloccato per 12 mesi",
      "Seconda voce",
      "Terza voce finale",
    ]);
    expect(items[0].querySelector("strong")?.textContent).toBe("Prezzo bloccato");
    expect(items[1].querySelector("strong")).toBeNull();
    expect(items[2].querySelector("strong")?.textContent).toBe("voce");
  });

  it("escapes HTML in advantages and never injects elements", () => {
    setup({
      advantages: ['<img src=x onerror="alert(1)"> **<b>grassetto</b>**', "<script>alert(1)</script>"],
    });
    const list = screen.getByTestId("offer-modal-advantages");
    expect(list.querySelector("img")).toBeNull();
    expect(list.querySelector("script")).toBeNull();
    expect(list.querySelector("b")).toBeNull();
    expect(list.textContent).toContain("<script>alert(1)</script>");
    expect(list.querySelector("strong")?.textContent).toBe("<b>grassetto</b>");
  });

  it("hides the advantages section when the offer has none", () => {
    setup({ advantages: [] });
    expect(screen.queryByTestId("offer-modal-advantages")).not.toBeInTheDocument();
    expect(screen.queryByText("I vantaggi dell'offerta")).not.toBeInTheDocument();
  });

  it("shows the key facts for luce (kWh) and the monthly cost with the VAT note", () => {
    setup();
    const facts = screen.getByTestId("offer-modal-features");
    expect(facts).toHaveTextContent("Prezzo bloccato12 mesi");
    expect(facts).toHaveTextContent("Prezzo energia0,1234 €/kWh");
    expect(facts).toHaveTextContent("Altri costi variabili0,0156 €/kWh");
    expect(facts).toHaveTextContent("Quota fissa mensile9,50 €");
    expect(facts).toHaveTextContent("Costo di attivazione0,00 €");
    expect(facts).toHaveTextContent("Tariffa monoraria a prezzo fisso");
    const monthly = screen.getByTestId("offer-modal-monthly");
    expect(monthly).toHaveTextContent("Spesa mensile stimata");
    expect(monthly).toHaveTextContent("56,78 €");
    expect(monthly).toHaveTextContent("Stima IVA esclusa");
  });

  it("uses €/Smc for gas", () => {
    setup({ commodity: "gas" }, { commodity: "gas" });
    const facts = screen.getByTestId("offer-modal-features");
    expect(facts).toHaveTextContent("0,1234 €/Smc");
    expect(facts).not.toHaveTextContent("€/kWh");
    expect(facts).not.toHaveTextContent("monoraria");
  });

  it("hides optional rows and boxes when absent", () => {
    setup();
    expect(screen.queryByText("Altri costi fissi mensili")).not.toBeInTheDocument();
    expect(screen.queryByTestId("offer-modal-promo")).not.toBeInTheDocument();
    expect(screen.queryByTestId("offer-modal-details")).not.toBeInTheDocument();
    expect(screen.queryByTestId("offer-modal-step")).not.toBeInTheDocument();
  });

  it("shows optional rows when present", () => {
    setup({
      other_fixed_costs_monthly: 2.5,
      promo_text: "Sconto di benvenuto",
      details: "Condizioni generali\nseconda riga",
      activation_cost: 12,
      locked_months: 1,
    });
    expect(screen.getByTestId("offer-modal-features")).toHaveTextContent("Altri costi fissi mensili2,50 €");
    expect(screen.getByTestId("offer-modal-features")).toHaveTextContent("Prezzo bloccato1 mese");
    expect(screen.getByTestId("offer-modal-features")).toHaveTextContent("Costo di attivazione12,00 €");
    expect(screen.getByTestId("offer-modal-promo")).toHaveTextContent("Sconto di benvenuto");
    const details = screen.getByTestId("offer-modal-details");
    expect(within(details).getByText("Dettagli e condizioni")).toBeInTheDocument();
    expect(details).toHaveTextContent("Condizioni generali");
  });

  it("shows the step label for Luce + Gas", () => {
    setup({}, { step: "Offerta Gas" });
    expect(screen.getByTestId("offer-modal-step")).toHaveTextContent("Offerta Gas");
  });

  it("CTA calls onActivate", async () => {
    const { onActivate, onClose } = setup();
    const cta = screen.getByTestId("offer-modal-cta");
    expect(cta).toHaveTextContent("Attiva online in 1 minuto");
    await userEvent.click(cta);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("close button and Escape call onClose", async () => {
    const { onClose } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("contains no forbidden wording", () => {
    setup({
      other_fixed_costs_monthly: 1,
      promo_text: "Promo",
      details: "Dettagli",
    });
    const text = (screen.getByRole("dialog").textContent ?? "").toLowerCase();
    for (const word of ["chiama", "telefon", "richiam", "demo", "esperto", "esclusiva", "club"]) {
      expect(text).not.toContain(word);
    }
  });
});

describe("renderBold", () => {
  it("leaves unmatched markers literal", () => {
    const { container } = render(<p>{renderBold("a **b c")}</p>);
    expect(container.textContent).toBe("a **b c");
  });

  describe("variable and IBAN offers", () => {
    it("shows PUN price, 'Varia con il PUN' and no lock row", () => {
      setup({ price_type: "variable", energy_price: 0.01, locked_months: null }, { monthlyCost: null });
      expect(screen.getByTestId("offer-modal-monthly")).toHaveTextContent("Varia con il PUN");
      const features = screen.getByTestId("offer-modal-features");
      expect(features).toHaveTextContent("PUN + 0,01 €/kWh");
      expect(features).not.toHaveTextContent("Prezzo bloccato");
      expect(features).toHaveTextContent("prezzo variabile");
    });

    it("shows the IBAN notice only when iban_required", () => {
      const { unmount } = render(
        <OfferModal open onClose={() => {}} onActivate={() => {}} offer={makeOffer({ iban_required: true })} commodity="luce" monthlyCost={10} />,
      );
      expect(screen.getByTestId("offer-modal-iban-notice")).toHaveTextContent(
        "Per attivare questa offerta è obbligatorio il pagamento con IBAN: ti servirà al passo successivo.",
      );
      unmount();
      setup();
      expect(screen.queryByTestId("offer-modal-iban-notice")).toBeNull();
    });
  });
});
