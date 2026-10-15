import { Suspense } from "react";
import type { Metadata } from "next";
import { ResultsView } from "@/components/results";

export const metadata: Metadata = {
  title: "Le tue offerte — VERSUS",
  description: "Confronta le offerte luce e gas selezionate per i tuoi consumi.",
};

export default function OffertePage() {
  // useSearchParams (?fast=1) needs a Suspense boundary for prerendering.
  return (
    <Suspense fallback={null}>
      <ResultsView />
    </Suspense>
  );
}
