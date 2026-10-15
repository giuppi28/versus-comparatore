"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const NAV = [
  { href: "/admin/leads", label: "Lead" },
  { href: "/admin/fornitori", label: "Fornitori" },
  { href: "/admin/offerte", label: "Offerte" },
  { href: "/admin/impostazioni", label: "Impostazioni" },
] as const;

/**
 * Top navigation. The current section is marked with aria-current="page" and a 2px green
 * underline. Items wrap onto a second row on narrow screens, so nothing is ever clipped.
 */
export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Area riservata" className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
      <ul className="flex flex-wrap gap-x-1 gap-y-0.5 sm:gap-x-2">
        {NAV.map((item) => {
          const current = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-semibold sm:px-3 sm:text-base",
                  current
                    ? "border-brand-600 text-ink"
                    : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
