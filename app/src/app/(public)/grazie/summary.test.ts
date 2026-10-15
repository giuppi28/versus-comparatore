import { describe, expect, it } from "vitest";
import {
  INITIAL_FLOW_STATE,
  totalMonthlyCost,
  type ChosenOfferSnapshot,
  type FlowState,
} from "@/lib/lead/flow-state";
import { thankYouSummary } from "./summary";

const luceOffer: ChosenOfferSnapshot = {
  offer_id: "offer-luce",
  commodity: "luce",
  offer_name: "Luce Semplice",
  supplier_id: "sup-1",
  supplier_name: "Alfa Energia",
  supplier_logo_path: null,
  energy_price: 0.129,
  other_variable_costs: 0.01,
  fixed_fee_monthly: 4.5,
  other_fixed_costs_monthly: 1,
  locked_months: 12,
  activation_cost: 0,
  promo_text: null,
  monthly_cost: 52.34,
};

const gasOffer: ChosenOfferSnapshot = {
  ...luceOffer,
  offer_id: "offer-gas",
  commodity: "gas",
  offer_name: "Gas Stabile",
  supplier_name: "Beta Gas",
  energy_price: 0.9,
  fixed_fee_monthly: 6,
  locked_months: 1,
  monthly_cost: 40.1,
};

function withState(patch: Partial<FlowState>): FlowState {
  return { ...INITIAL_FLOW_STATE, leadCompleted: true, ...patch };
}

describe("thankYouSummary", () => {
  it("returns null when the lead is not completed yet", () => {
    const state = withState({
      firstName: "Mario",
      leadCompleted: false,
      chosenOffers: { luce: luceOffer, gas: null },
    });
    expect(thankYouSummary(state)).toBeNull();
  });

  it("returns null without a first name", () => {
    const state = withState({ firstName: "   ", chosenOffers: { luce: luceOffer, gas: null } });
    expect(thankYouSummary(state)).toBeNull();
  });

  it("returns null without any chosen offer", () => {
    expect(thankYouSummary(withState({ firstName: "Mario" }))).toBeNull();
  });

  it("builds a single-offer summary without a total", () => {
    const state = withState({ firstName: " Mario ", chosenOffers: { luce: luceOffer, gas: null } });
    expect(thankYouSummary(state)).toEqual({
      firstName: "Mario",
      offers: [luceOffer],
      totalMonthly: null,
    });
  });

  it("builds a dual summary with luce first and the total monthly cost", () => {
    const state = withState({
      firstName: "Anna",
      chosenOffers: { luce: luceOffer, gas: gasOffer },
    });
    const summary = thankYouSummary(state);
    expect(summary?.offers).toEqual([luceOffer, gasOffer]);
    expect(summary?.totalMonthly).toBeCloseTo(92.44, 2);
    expect(summary?.totalMonthly).toBeCloseTo(totalMonthlyCost(state) ?? NaN, 2);
  });

  it("keeps a gas-only offer", () => {
    const state = withState({ firstName: "Anna", chosenOffers: { luce: null, gas: gasOffer } });
    expect(thankYouSummary(state)?.offers).toEqual([gasOffer]);
  });
});
