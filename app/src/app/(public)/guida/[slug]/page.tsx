import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoPageTemplate } from "@/components/seo";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { buildSeoMetadata } from "@/lib/seo/pages";
import { buildGuideJsonLd } from "@/lib/seo/pages-jsonld";
import { SITE_URL } from "@/lib/seo/site";

type Params = Promise<{ slug: string }>;

const findGuide = (slug: string) => GUIDE_PAGES.find((g) => g.path === `/guida/${slug}`);

// Unknown slugs are a 404, never rendered on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_PAGES.map((g) => ({ slug: g.path.replace("/guida/", "") }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const guide = findGuide((await params).slug);
  return guide ? buildSeoMetadata(guide) : {};
}

export default async function GuidePage({ params }: { params: Params }) {
  const guide = findGuide((await params).slug);
  if (!guide) notFound();
  return <SeoPageTemplate page={guide} jsonLd={buildGuideJsonLd(guide, SITE_URL)} />;
}
