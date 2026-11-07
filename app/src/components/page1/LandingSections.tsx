import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { EXPLAINER_BLOCKS, EXPLAINER_INTRO, EXPLAINER_TITLE } from "./explainer";
import { FAQ } from "./faq";

/** A real supplier shown in the "Confrontiamo le offerte di" strip. */
export interface SupplierLogo {
  name: string;
  /** Resolved logo URL (never null: suppliers without a logo are not listed). */
  logoUrl: string;
}

/**
 * Local colour logos (`/logos/<slug>.svg`) have a normalised black twin in `/logos/black/`; any other
 * URL (e.g. Supabase Storage) is forced black with a CSS filter. Mirrors `blackLogoUrl` of the loading
 * screen (a "use client" module, so it cannot be called from this server component).
 */
export function blackLogo(url: string): { src: string; needsFilter: boolean } {
  const m = /^\/logos\/([a-z0-9-]+)\.svg$/i.exec(url);
  return m ? { src: `/logos/black/${m[1]}.svg`, needsFilter: false } : { src: url, needsFilter: true };
}

const STEPS: { title: string; text: string }[] = [
  { title: "Confronta", text: "Rispondi a poche domande sulla tua fornitura di luce, gas o entrambe." },
  { title: "Scegli", text: "Vedi le offerte disponibili e scegli quella che fa per te." },
  { title: "Attiva online", text: "Compili i dati per l'attivazione direttamente sul sito." },
];

/** Section wrapper: same column as the form, hairline separator, generous vertical rhythm. */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-10 sm:pt-12">
      <h2 id={id} className="heading-wide text-center text-xl text-ink sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Supporting sections below the form (ui-ux-pro-max "trust-authority-conversion": proof logos,
 * solution overview, FAQ after the CTA). Static, server-rendered, no motion, no flow interaction.
 */
export function LandingSections({ suppliers }: { suppliers: SupplierLogo[] }) {
  return (
    <div data-testid="landing-sections" className="mx-auto mt-14 flex w-full max-w-2xl flex-col gap-12 sm:mt-20 sm:gap-16">
      <Section id="come-funziona" title="Come funziona">
        <ol className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4 sm:flex-col sm:items-center sm:text-center">
              <span
                aria-hidden="true"
                className="heading-wide flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base text-white"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {suppliers.length > 0 && (
        <Section id="fornitori" title="Confrontiamo le offerte di">
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-10">
            {suppliers.map((s) => {
              const logo = blackLogo(s.logoUrl);
              return (
                <li key={s.name} className="flex h-8 w-24 items-center justify-center sm:h-9 sm:w-28">
                  {/* Plain <img>: supplier logos are SVG files. Black set, one opacity: quiet proof. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.src}
                    alt={s.name}
                    loading="lazy"
                    className={`max-h-full max-w-full object-contain opacity-80${logo.needsFilter ? " brightness-0" : ""}`}
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section id="domande-frequenti" title="Domande frequenti">
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {FAQ.map((item) => (
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
      </Section>

      {/* Long-form text (T19.4e): plain server-rendered typography, always visible, comfortable measure. */}
      <Section id="come-funziona-confronto" title={EXPLAINER_TITLE}>
        <div data-testid="home-explainer" className="mx-auto mt-6 flex max-w-prose flex-col gap-4 text-base leading-relaxed text-ink">
          <p>{EXPLAINER_INTRO}</p>
          {EXPLAINER_BLOCKS.map((block) => (
            <div key={block.heading} className="flex flex-col gap-3 pt-4">
              <h3 className="text-lg font-semibold leading-snug text-ink">{block.heading}</h3>
              {block.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {block.bullets && (
                <ul className="list-disc space-y-2 pl-6">
                  {block.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
