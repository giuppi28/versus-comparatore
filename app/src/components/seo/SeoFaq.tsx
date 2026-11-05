import type { SeoFaq as Faq } from "@/content/seo/types";
import { ChevronDownIcon } from "@/components/ui/icons";

/** Same <details> pattern as the home FAQ; answers are in the raw HTML (collapsed, not removed). */
export function SeoFaq({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-left text-base font-semibold text-ink marker:hidden hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDownIcon
              width={20}
              height={20}
              aria-hidden="true"
              className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
