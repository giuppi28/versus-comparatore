import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { CheckIcon } from "@/components/ui/icons";
import { BrandLockup } from "./BrandLockup";

export interface SiteHeaderProps {
  /**
   * Logo links to "/". Safe everywhere: the flow state lives in sessionStorage.
   * Page 1 passes false (it already is the home page).
   */
  homeLink?: boolean;
  /** Extra classes for the centered content container (e.g. a different max width). */
  className?: string;
}

/**
 * Top bar of all customer-facing pages: light green tint + a thin green gradient strip,
 * the VERSUS lockup on the left, a short trust line on the right (hidden below 1024px: lockup + trust line do not fit side by side between 640 and ~800px).
 *
 * The strip is absolutely positioned so the bar keeps the 3.5rem / 4rem height other
 * screens (loading overlay) compute their min-height from.
 */
export function SiteHeader({ homeLink = true, className }: SiteHeaderProps) {
  const lockup = <BrandLockup size="md" />;
  return (
    <header className="relative border-b border-brand-200 bg-brand-50 [--mark-knockout:var(--color-brand-50)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-300"
      />
      <div
        className={cn(
          "mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 pt-1 sm:h-16 sm:px-6",
          className,
        )}
      >
        {homeLink ? (
          <Link
            href="/"
            aria-label="VERSUS, torna alla home"
            className="-mx-1 flex items-center rounded-control px-1 py-1"
          >
            {lockup}
          </Link>
        ) : (
          lockup
        )}
        <p className="hidden shrink-0 items-center gap-2 text-sm font-medium text-brand-800 lg:flex">
          <CheckIcon width={16} height={16} aria-hidden="true" className="text-brand-600" />
          Confronto gratuito · 100% online
        </p>
      </div>
    </header>
  );
}
