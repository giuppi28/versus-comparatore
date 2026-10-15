import { useId } from "react";
import { FullLogoShapes, IconShapes } from "./logo-shapes";

export type VersusLogoVariant = "full" | "icon";

export interface VersusLogoProps {
  /** "full" = house + wordmark + tagline; "icon" = the square app icon. */
  variant?: VersusLogoVariant;
  className?: string;
  /** Accessible name. Pass an empty string to mark the logo decorative. */
  title?: string;
}

export const LOGO_TITLE = "VERSUS — comparatore luce e gas";

/**
 * Official VERSUS logo rendered as inline SVG (no <img>, no background box).
 * Size it with the height/width utilities on `className` (e.g. "h-9 w-auto").
 * The full logo is drawn for white surfaces: its knockout parts are white.
 */
export function VersusLogo({ variant = "full", className, title = LOGO_TITLE }: VersusLogoProps) {
  const titleId = useId();
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
