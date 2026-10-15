import { useId } from "react";
import { BrandLockup, type BrandLockupSize, LOCKUP_TITLE } from "./BrandLockup";
import { FullLogoShapes, IconShapes } from "./logo-shapes";

export type VersusLogoVariant = "lockup" | "full" | "icon";

export interface VersusLogoProps {
  /**
   * "lockup" (default) = icon + typeset wordmark, no black box (see BrandLockup);
   * "full" = the official outlined logo with its black tagline bar (kept for reference);
   * "icon" = the square app icon (white shapes in a black rounded square).
   */
  variant?: VersusLogoVariant;
  className?: string;
  /** Accessible name. Pass an empty string to mark the logo decorative. */
  title?: string;
  /** Lockup only. Defaults to "sm" (fits a 2rem-high slot, e.g. the admin header). */
  size?: BrandLockupSize;
}

export const LOGO_TITLE = LOCKUP_TITLE;

/**
 * VERSUS logo. The lockup is HTML + inline SVG icon; "full" and "icon" are inline SVG
 * (no <img>) sized with height/width utilities on `className` (e.g. "h-9 w-auto").
 * The full logo is drawn for white surfaces: its knockout parts are white.
 */
export function VersusLogo({
  variant = "lockup",
  className,
  title = LOGO_TITLE,
  size = "sm",
}: VersusLogoProps) {
  const titleId = useId();
  if (variant === "lockup") return <BrandLockup size={size} className={className} title={title} />;

  const decorative = title === "";
  // Tight viewBox: the original 572x180 canvas has ~30px of empty margin on the left/top.
  const viewBox = variant === "full" ? "29 31 534 135" : "0 0 240 240";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      className={className}
      data-testid="versus-logo"
      data-variant={variant}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-labelledby": titleId })}
      focusable="false"
    >
      {!decorative && <title id={titleId}>{title}</title>}
      {variant === "full" ? <FullLogoShapes /> : <IconShapes />}
    </svg>
  );
}
