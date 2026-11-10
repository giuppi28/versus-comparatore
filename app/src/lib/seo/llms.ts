import { COMPANY } from "@/lib/legal/company";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { HOME_CONTENT_UPDATED } from "./dates";
import { ALL_SEO_PAGES } from "./pages";

/** Derived, never typed by hand: the later of the newest guide `reviewedOn` and the home content date. */
export const LLMS_LAST_UPDATE = [HOME_CONTENT_UPDATED, ...GUIDE_PAGES.map((g) => g.reviewedOn)].reduce((a, b) => (b > a ? b : a));

/** Pure builder of /llms.txt. `suppliers` = real suppliers with at least one active offer (null = unavailable: section omitted). */
export function buildLlmsTxt(siteUrl: string, suppliers: string[] | null): string {
  const lines: string[] = [
    "# VERSUS — comparatore luce e gas",
    "",
    "> VERSUS è un comparatore luce e gas online e gratuito per casa e partita IVA: si risponde a poche domande, si sceglie l'offerta e la si attiva online.",
    "",
    `Ultimo aggiornamento: ${LLMS_LAST_UPDATE}`,
    "",
    "## Cosa fa VERSUS",
    "- Confronta le offerte di luce, gas o luce + gas presenti su VERSUS.",
    "- Il confronto è gratuito.",
    "- Permette di attivare online l'offerta scelta.",
    "",
    "## Per chi è",
    "- Clienti: casa e partita IVA.",
    "- Forniture: luce, gas, luce + gas.",
    "- Casi: cambio fornitore, subentro, voltura, primo allaccio.",
    "",
    "## Come funziona",
    "1. Confronta: si risponde a poche domande sulla propria fornitura di luce, gas o entrambe.",
    "2. Scegli: si vedono le offerte disponibili e si sceglie quella che fa per sé.",
    "3. Attiva online: si compilano i dati per l'attivazione direttamente sul sito.",
    "",
    "## Cose da sapere",
    "- Le stime di spesa mostrate sono IVA esclusa.",
    "- Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.",
    "- VERSUS opera come agente ed è remunerato dai venditori.",
    "",
  ];
  if (suppliers && suppliers.length > 0) {
    lines.push("## Fornitori con offerte attive", ...suppliers.map((s) => `- ${s}`), "");
  }
  lines.push(
    "## Titolare",
    `- ${COMPANY.ragioneSociale}, sede legale ${COMPANY.sedeLegale}`,
    `- P.IVA ${COMPANY.partitaIva}, REA ${COMPANY.rea}`,
    `- Email: ${COMPANY.email}`,
    "",
    "## Pagine principali",
    `- [Home: comparatore luce e gas](${siteUrl}/)`,
    ...ALL_SEO_PAGES.map((p) => `- [${p.h1}](${siteUrl}${p.path})`),
    `- [Informativa sulla privacy](${siteUrl}/privacy)`,
    "",
    "## Versione estesa",
    `- [llms-full.txt](${siteUrl}/llms-full.txt)`,
    "",
  );
  return lines.join("\n");
}
