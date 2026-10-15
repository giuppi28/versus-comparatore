import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { VersusLogo } from "./VersusLogo";

export interface SiteHeaderProps {
  /**
   * Logo links to "/". Safe everywhere: the flow state lives in sessionStorage.
   * Page 1 passes false (it already is the home page).
   */
  homeLink?: boolean;
  /** Container width, aligned with the page below. */
  className?: string;
}

/** White top bar with the VERSUS logo (all customer-facing pages). */
export function SiteHeader({ homeLink = true, className }: SiteHeaderProps) {
  const logo = <VersusLogo variant="full" className="h-9 w-auto sm:h-10" />;
  return (
    <header className="border-b border-line bg-surface">
      <div
        className={cn(
          "mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:h-16 sm:px-6",
          className,
        )}
      >
        {homeLink ? (
          <Link
            href="/"
            aria-label="VERSUS, torna alla home"
            className="-mx-1 flex items-center rounded-control px-1 py-1"
          >
            {logo}
          </Link>
        ) : (
          logo
        )}
      </div>
    </header>
  );
}
