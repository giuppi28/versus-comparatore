import {
  BoltDropIllustration,
  BulbIllustration,
  FlameIllustration,
  HouseOutline,
} from "@/components/brand/decor";

/**
 * Background decoration of the thank-you page (Phase 10, B6): light bulbs (luce) on the
 * right, gas flames on the left, drawn in the logo style.
 *
 * - Purely decorative: aria-hidden, pointer-events none, static (no motion to respect).
 * - Sits behind the card (`-z-10` inside the page's `isolate` stacking context) and, at
 *   desktop, lives in the side margins outside the 36rem card. On mobile only small
 *   cropped hints peek out at the edges (the card itself is opaque).
 * - The wrapper clips (`overflow-hidden`) and is absolutely positioned: no horizontal
 *   scroll and no layout shift.
 */
export function ThankYouDecor() {
  return (
    <div
      aria-hidden="true"
      data-testid="thankyou-decor"
      className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden"
    >
      {/* Left: gas flames */}
      <div className="absolute inset-y-0 left-0 w-1/2 [--decor-color:var(--color-brand-300)]">
        <FlameIllustration className="absolute -left-5 top-3 w-16 -rotate-12 opacity-50 lg:hidden" />
        <FlameIllustration className="absolute -left-3 bottom-4 w-12 rotate-6 opacity-40 lg:hidden" />

        <FlameIllustration className="absolute left-[7%] top-16 hidden w-44 -rotate-6 opacity-50 lg:block" />
        <FlameIllustration className="absolute left-[19%] top-[58%] hidden w-24 rotate-12 opacity-40 lg:block" />
        <FlameIllustration
          color="var(--color-brand-200)"
          className="absolute left-[3%] top-[72%] hidden w-14 -rotate-12 opacity-70 xl:block"
        />
        <HouseOutline className="absolute left-[14%] top-[30%] hidden w-16 text-brand-200 opacity-70 xl:block" />
      </div>

      {/* Right: light bulbs */}
      <div className="absolute inset-y-0 right-0 w-1/2 [--decor-color:var(--color-brand-300)]">
        <BulbIllustration
          className="absolute -right-6 top-2 w-16 rotate-12 opacity-50 lg:hidden"
          rays={false}
        />
        <BulbIllustration
          className="absolute -right-3 bottom-4 w-12 -rotate-6 opacity-40 lg:hidden"
          rays={false}
        />

        <BulbIllustration className="absolute right-[7%] top-12 hidden w-48 rotate-6 opacity-50 lg:block" />
        <BulbIllustration
          className="absolute right-[20%] top-[62%] hidden w-24 -rotate-12 opacity-40 lg:block"
          rays={false}
        />
        <BoltDropIllustration className="absolute right-[4%] top-[70%] hidden w-14 text-brand-200 opacity-70 xl:block" />
      </div>
    </div>
  );
}
