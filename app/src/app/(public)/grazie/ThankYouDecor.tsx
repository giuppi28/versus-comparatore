import { BoltDropIllustration, BulbIllustration, FlameIllustration } from "@/components/brand/decor";

/**
 * Background decoration of the thank-you page (Phase 10, B6 + review P10-6): one large
 * gas flame on the left and one large light bulb on the right, drawn in the logo style,
 * plus a single small accent per side (small flame / bolt drop).
 *
 * - Purely decorative: aria-hidden, pointer-events none, static (no motion).
 * - Desktop only (lg and up): the pieces live in the side margins outside the 36rem card.
 *   Below lg the whole layer is hidden, so nothing is ever cropped by the card edge.
 * - Absolutely positioned inside a clipped wrapper, behind the card (`-z-10` in the page's
 *   `isolate` stacking context): no horizontal scroll, no layout shift.
 */
export function ThankYouDecor() {
  return (
    <div
      aria-hidden="true"
      data-testid="thankyou-decor"
      className="pointer-events-none absolute inset-0 -z-10 hidden select-none overflow-hidden lg:block"
    >
      {/* Left: gas */}
      <div className="absolute inset-y-0 left-0 w-1/2 [--decor-color:var(--color-brand-200)]">
        <FlameIllustration className="absolute left-[8%] top-20 w-44 -rotate-6 opacity-70" />
        <FlameIllustration className="absolute left-[20%] top-[66%] hidden w-16 rotate-12 opacity-60 xl:block" />
      </div>

      {/* Right: luce */}
      <div className="absolute inset-y-0 right-0 w-1/2 [--decor-color:var(--color-brand-200)]">
        <BulbIllustration className="absolute right-[8%] top-16 w-48 rotate-6 opacity-70" />
        <BoltDropIllustration className="absolute right-[20%] top-[66%] hidden w-14 opacity-60 xl:block" />
      </div>
    </div>
  );
}
