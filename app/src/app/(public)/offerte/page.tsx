import { Suspense } from "react";
import type { Metadata } from "next";
import { ResultsView, type ServerOffers } from "@/components/results";
import { getRepository } from "@/lib/data";

export const metadata: Metadata = {
  title: "Le tue offerte — VERSUS",
  description: "Confronta le offerte luce e gas selezionate per i tuoi consumi.",
};

// Offers come from the server-side repository on every request, so admin changes
// (activate / feature / edit) reach customers immediately (PRD §8).
export const dynamic = "force-dynamic";

/**
 * The customer type lives in the browser flow state, so the server loads the active
 * offers of both customer types; the client picks the right list (and a luce+gas
 * comparison has both commodities available without a second round trip).
 */
async function loadOffers(): Promise<ServerOffers | null> {
  try {
    const repo = getRepository();
    const [luceCasa, luceBusiness, gasCasa, gasBusiness] = await Promise.all([
      repo.listActiveOffers("luce", "casa"),
      repo.listActiveOffers("luce", "business"),
      repo.listActiveOffers("gas", "casa"),
      repo.listActiveOffers("gas", "business"),
    ]);
    return {
      luce: { casa: luceCasa, business: luceBusiness },
      gas: { casa: gasCasa, business: gasBusiness },
    };
  } catch (error) {
    console.error("offerte: could not load the active offers", error);
    return null;
  }
}

export default async function OffertePage() {
  const offers = await loadOffers();
  // useSearchParams (?fast=1) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ResultsView offers={offers} />
    </Suspense>
  );
}
