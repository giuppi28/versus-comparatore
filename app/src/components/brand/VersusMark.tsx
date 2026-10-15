import { useId } from "react";
import { MarkShapes } from "./logo-shapes";

export interface VersusMarkProps {
  className?: string;
  /** Accessible name. Empty string (default) = decorative. */
  title?: string;
}

/**
 * The VERSUS icon on its own: black house / flame / drop / swoosh, no rounded square and
 * no background. The white "knockout" parts of the original take the colour of
 * `--mark-knockout` (white by default) so the mark can sit on a tinted bar.
 * Geometry is the official one (see logo-shapes.tsx).
 */
export function VersusMark({ className, title = "" }: VersusMarkProps) {
  const titleId = useId();
  const decorative = title === "";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // Tight box around the shapes in the 0.72-scaled group coordinates.
      viewBox="17 19 143 138"
      className={["versus-mark", className].filter(Boolean).join(" ")}
      data-testid="versus-mark"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-labelledby": titleId })}
      focusable="false"
    >
      {!decorative && <title id={titleId}>{title}</title>}
      <MarkShapes />
    </svg>
  );
}
