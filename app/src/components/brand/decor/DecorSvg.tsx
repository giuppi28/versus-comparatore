import type { CSSProperties, ReactNode } from "react";

export interface DecorProps {
  /** Size/position it with utilities (e.g. "absolute -right-10 top-4 h-72 w-auto"). */
  className?: string;
  /** Any CSS colour. Default = VERSUS green (overridable with a `text-*` class or `--decor-color`). */
  color?: string;
  /** Outline weight in the illustration's own units (the logo house uses 14 on a 240 grid). */
  strokeWidth?: number;
  /** Extra inline style (the illustration always keeps pointer-events: none). */
  style?: CSSProperties;
}

interface DecorSvgProps extends DecorProps {
  viewBox: string;
  name: string;
  defaultStroke: number;
  children: ReactNode;
}

/**
 * Shared shell of the decorative illustrations: always aria-hidden, never interactive.
 * Shapes draw with `currentColor`; the colour comes from the `.decor` class (green by
 * default, defined in globals.css) or the `color` prop.
 */
export function DecorSvg({
  viewBox,
  name,
  className,
  color,
  strokeWidth,
  style,
  defaultStroke,
  children,
}: DecorSvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? defaultStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-decor={name}
      className={["decor", className].filter(Boolean).join(" ")}
      style={{ pointerEvents: "none", ...(color ? { color } : null), ...style }}
    >
      {children}
    </svg>
  );
}

/** The solid lightning bolt of the logo (drop interior), at its original coordinates. */
export const LOGO_BOLT = "M158 112 L136 152 H151 L144 182 L170 140 H154 L164 112Z";
