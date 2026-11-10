import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/brand";
import type { SeoPage } from "@/content/seo/types";
import { formatItalianDate } from "@/lib/seo/dates";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import { Breadcrumb } from "./Breadcrumb";
import { RelatedPages } from "./RelatedPages";
import { SeoFaq } from "./SeoFaq";
import { SourcesList } from "./SourcesList";

const H2 = "heading-wide text-xl text-ink sm:text-2xl";
const SECTION = "flex flex-col gap-4 border-t border-line pt-10 sm:pt-12";

/** "Confronta le offerte": the only call to action, a link to the comparison on "/". */
function CtaLink() {
  return (
    <Link
      href="/"
      className="heading-wide inline-flex min-h-13 items-center justify-center rounded-control bg-brand-600 px-6 text-center text-sm font-bold leading-tight text-white hover:bg-brand-700 active:bg-brand-800"
    >
      Confronta le offerte
    </Link>
  );
}

const BRAND_PHRASE = "VERSUS, comparatore luce e gas";

/** The intro text is the single source: the brand phrase, when present, is rendered as a link to "/". */
function IntroText({ text }: { text: string }) {
  const i = text.indexOf(BRAND_PHRASE);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <Link
        href="/"
        className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-600"
      >
        {BRAND_PHRASE}
      </Link>
      {text.slice(i + BRAND_PHRASE.length)}
    </>
  );
}

/**
 * Shared template of the hidden SEO pages (guides and offers pages): breadcrumb, H1, answer-first
 * intro, optional `listings` slot, sections, FAQ, sources, related pages. Server-rendered, no JS.
 */
export function SeoPageTemplate({
  page,
  jsonLd,
  listings,
}: {
  page: SeoPage;
  jsonLd: unknown;
  listings?: ReactNode;
}) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteHeader />
      <main className="flex-1 pb-section">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <header className="flex flex-col gap-5 pb-8 pt-8 sm:pb-10 sm:pt-12">
            <Breadcrumb current={page.h1} />
            <h1 className="heading-wide text-display text-ink [overflow-wrap:anywhere]">{page.h1}</h1>
            <p className="max-w-prose text-lg leading-relaxed text-ink-muted">
              <IntroText text={page.intro} />
            </p>
            <div>
              <CtaLink />
            </div>
          </header>

          <div className="flex flex-col gap-10 sm:gap-12">
            {listings}

            {page.sections.map((section) => (
              <section key={section.heading} className={SECTION}>
                <h2 className={H2}>{section.heading}</h2>
                <div className="flex max-w-prose flex-col gap-4 text-base leading-relaxed text-ink">
                  {section.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {section.bullets && (
                    <ul className="list-disc space-y-2 pl-6">
                      {section.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}

            <section aria-labelledby="faq-title" className={SECTION}>
              <h2 id="faq-title" className={H2}>
                Domande frequenti
              </h2>
              <SeoFaq items={page.faq} />
            </section>

            <section aria-labelledby="fonti-title" className={SECTION}>
              <h2 id="fonti-title" className={H2}>
                Fonti
              </h2>
              <SourcesList sources={page.sources} />
              <p className="text-sm text-ink-subtle">Ultima verifica delle fonti: {formatItalianDate(page.reviewedOn)}</p>
            </section>

            <section aria-labelledby="correlate-title" className={SECTION}>
              <h2 id="correlate-title" className={H2}>
                Continua a leggere
              </h2>
              <RelatedPages paths={page.related} />
            </section>

            <div className="flex flex-col items-start gap-4 rounded-card border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="max-w-prose text-base font-semibold text-ink">
                Rispondi a poche domande e vedi le offerte per la tua fornitura.
              </p>
              <CtaLink />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
