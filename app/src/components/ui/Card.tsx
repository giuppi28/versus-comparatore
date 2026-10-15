import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "md" | "lg";
  /** Visual emphasis (e.g. featured offer). */
  highlighted?: boolean;
}

const paddings = { none: "", md: "p-5", lg: "p-5 sm:p-8" } as const;

export function Card({
  padding = "md",
  highlighted = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border bg-surface shadow-card",
        highlighted ? "border-brand-600 ring-1 ring-brand-600" : "border-line",
        paddings[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
