import { cn } from "@/components/ui/cn";
import { VersusMark } from "./VersusMark";

export type BrandLockupSize = "sm" | "md" | "lg";

export interface BrandLockupProps {
  /**
   * sm = admin / footer, md = public header (compact below 640px, larger above),
   * lg = login card.
   */
  size?: BrandLockupSize;
  className?: string;
  /** Accessible name of the whole lockup. */
  title?: string;
}

export const LOCKUP_TITLE = "VERSUS — comparatore luce e gas";

const SIZES: Record<BrandLockupSize, { mark: string; brand: string; main: string; sub: string; gap: string }> = {
  sm: {
    mark: "h-8",
    brand: "text-[0.625rem]",
    main: "text-[0.9375rem]",
    sub: "text-[0.8em]",
    gap: "gap-2.5",
  },
  md: {
    mark: "h-8 min-[360px]:h-9 sm:h-12",
    brand: "text-[0.625rem] sm:text-[0.8125rem]",
    main: "text-base min-[360px]:text-[1.1875rem] sm:text-[1.875rem]",
    sub: "text-[0.68em]",
    gap: "gap-2 min-[360px]:gap-2.5 sm:gap-3",
  },
  lg: {
    mark: "h-12",
    brand: "text-xs",
    main: "text-[1.375rem]",
    sub: "text-[0.68em]",
    gap: "gap-3",
  },
};

/**
 * VERSUS lockup: icon (black shapes, no square) + wordmark typeset with our fonts.
 * "COMPARATORE" is the dominant line, "VERSUS" the small brand line above it and
 * "luce e gas" the green qualifier. Real text, not SVG outlines: it follows the
 * page fonts and stays selectable by assistive tech via the root's accessible name.
 */
export function BrandLockup({ size = "md", className, title = LOCKUP_TITLE }: BrandLockupProps) {
  const s = SIZES[size];
  const decorative = title === "";
  return (
    <span
      data-testid="versus-logo"
      data-variant="lockup"
      {...(decorative ? {} : { role: "img", "aria-label": title })}
      className={cn("inline-flex items-center", s.gap, className)}
    >
      <VersusMark className={cn("w-auto shrink-0", s.mark)} />
      <span aria-hidden="true" className="flex min-w-0 flex-col gap-[0.35em] leading-none">
        <span
          className={cn(
            "font-display font-bold uppercase leading-none tracking-[0.34em] text-ink-muted [font-stretch:125%]",
            s.brand,
          )}
        >
          Versus
        </span>{" "}
        <span
          className={cn(
            "whitespace-nowrap font-display font-extrabold uppercase leading-none tracking-[0.005em] text-ink [font-stretch:125%]",
            s.main,
          )}
        >
          Comparatore{" "}
          <span className={cn("ml-[0.05em] font-bold normal-case tracking-normal text-brand-700", s.sub)}>
            luce e gas
          </span>
        </span>
      </span>
    </span>
  );
}
