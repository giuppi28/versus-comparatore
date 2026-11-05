import Link from "next/link";
import { getSeoPage } from "@/lib/seo/pages";

/** Links only to other pages of the SEO cluster; unknown paths are skipped. */
export function RelatedPages({ paths }: { paths: string[] }) {
  const pages = paths.flatMap((p) => {
    const page = getSeoPage(p);
    return page ? [page] : [];
  });
  if (pages.length === 0) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {pages.map((p) => (
        <li key={p.path}>
          <Link
            href={p.path}
            className="flex h-full min-h-14 items-center rounded-card border border-line bg-surface px-5 py-3 text-base font-semibold text-ink shadow-card hover:border-brand-400 hover:bg-brand-50"
          >
            {p.h1}
          </Link>
        </li>
      ))}
    </ul>
  );
}
