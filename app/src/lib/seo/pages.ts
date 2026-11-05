import type { Metadata } from "next";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { OFFERS_PAGES } from "@/content/seo/offers-pages";
import type { OffersSeoPage, SeoPage } from "@/content/seo/types";

export const ALL_SEO_PAGES: SeoPage[] = [...OFFERS_PAGES, ...GUIDE_PAGES];

export function getSeoPage(path: string): SeoPage | undefined {
  return ALL_SEO_PAGES.find((p) => p.path === path);
}

export function getOffersPage(path: string): OffersSeoPage {
  const page = OFFERS_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`Unknown offers page ${path}`);
  return page;
}

// Page-level openGraph/twitter replace the layout's, so the file-convention image is referenced explicitly.
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "VERSUS — comparatore luce e gas" };

export function buildSeoMetadata(page: SeoPage): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: "VERSUS",
      url: page.path,
      title: page.title,
      description: page.description,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [OG_IMAGE] },
  };
}
