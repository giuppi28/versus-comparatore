import type { ChosenOfferSnapshot, FlowState } from "@/lib/lead/flow-state";
import { totalMonthlyCost } from "@/lib/lead/flow-state";

/** What the thank-you page shows; copied out of the flow state on first render. */
export interface ThankYouSummary {
  firstName: string;
  /** Luce first, then gas; never empty. */
  offers: ChosenOfferSnapshot[];
  /** Sum of the monthly costs when two offers are chosen (luce + gas), otherwise null. */
  totalMonthly: number | null;
}

/**
 * Builds the thank-you summary from the flow state.
 * Returns null when the page must redirect home: the lead is not completed
 * (`leadCompleted`, set after POST /api/lead/complete succeeds), or no first name,
 * or no chosen offer.
 */
export function thankYouSummary(state: FlowState): ThankYouSummary | null {
  if (!state.leadCompleted) return null;
  const firstName = state.firstName.trim();
  const offers = [state.chosenOffers.luce, state.chosenOffers.gas].filter(
    (o): o is ChosenOfferSnapshot => o !== null,
  );
  if (!firstName || offers.length === 0) return null;
  return {
    firstName,
    offers,
    totalMonthly: offers.length > 1 ? totalMonthlyCost(state) : null,
  };
}
