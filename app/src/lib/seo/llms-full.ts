import { FAQ } from "@/components/page1/faq";
import { EXPLAINER_BLOCKS, EXPLAINER_INTRO, EXPLAINER_TITLE } from "@/components/page1/explainer";
import { GUIDE_PAGES } from "@/content/seo/guides";
import type { SeoPage } from "@/content/seo/types";
import { buildLlmsTxt } from "./llms";

function guideMarkdown(page: SeoPage, siteUrl: string): string[] {
  const lines: string[] = [
    `## ${page.h1}`,
    "",
    `URL: ${siteUrl}${page.path}`,
    `Aggiornata il ${page.reviewedOn}`,
    "",
    page.intro,
    "",
  ];
  for (const s of page.sections) {
    lines.push(`### ${s.heading}`, "");
    for (const p of s.paragraphs) lines.push(p, "");
    if (s.bullets) lines.push(...s.bullets.map((b) => `- ${b}`), "");
  }
  lines.push("### Domande frequenti", "");
  for (const item of page.faq) lines.push(`#### ${item.q}`, "", item.a, "");
  lines.push("### Fonti", "", ...page.sources.map((s) => `- [${s.label}](${s.url})`), "");
  return lines;
}

/** Pure builder of /llms-full.txt: the llms.txt body plus the home FAQ, the home explainer and the guides in full. No offers pages, no prices. */
export function buildLlmsFullTxt(siteUrl: string, suppliers: string[] | null): string {
  const lines: string[] = [buildLlmsTxt(siteUrl, suppliers).trimEnd(), "", "## Domande frequenti", ""];
  for (const item of FAQ) lines.push(`### ${item.q}`, "", item.a, "");
  lines.push(`## ${EXPLAINER_TITLE}`, "", EXPLAINER_INTRO, "");
  for (const b of EXPLAINER_BLOCKS) {
    lines.push(`### ${b.heading}`, "");
    for (const p of b.paragraphs) lines.push(p, "");
    if (b.bullets) lines.push(...b.bullets.map((x) => `- ${x}`), "");
  }
  for (const g of GUIDE_PAGES) lines.push(...guideMarkdown(g, siteUrl));
  return lines.join("\n");
}
