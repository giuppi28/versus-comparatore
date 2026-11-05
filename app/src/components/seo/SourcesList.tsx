import type { SeoSource } from "@/content/seo/types";

export function SourcesList({ sources }: { sources: SeoSource[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm leading-relaxed">
      {sources.map((s) => (
        <li key={s.url}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener"
            className="font-medium text-brand-700 underline underline-offset-4 [overflow-wrap:anywhere] hover:text-brand-600"
          >
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
