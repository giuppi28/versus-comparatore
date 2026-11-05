import Link from "next/link";

/** Home > current page. Visible counterpart of the BreadcrumbList JSON-LD. */
export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Percorso di navigazione" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link
            href="/"
            className="-mx-1 inline-flex min-h-8 items-center rounded-control px-1 font-medium text-brand-700 underline underline-offset-4 hover:text-brand-600"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true" className="text-ink-subtle">
          /
        </li>
        <li aria-current="page" className="min-w-0 [overflow-wrap:anywhere]">
          {current}
        </li>
      </ol>
    </nav>
  );
}
