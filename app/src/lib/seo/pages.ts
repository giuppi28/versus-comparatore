import type { Metadata } from "next";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { OFFERS_PAGES } from "@/content/seo/offers-pages";
import type { OffersSeoPage, SeoPage } from "@/content/seo/types";

export const ALL_SEO_PAGES: SeoPage[] = [...OFFERS_PAGES, ...GUIDE_PAGES];

export function isGuidePage(page: SeoPage): boolean {
  return GUIDE_PAGES.some((g) => g.path === page.path);
}

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
  const guide = isGuidePage(page);
  return {
    title: page.title,
    description: page.description,
    // Guides (T17.15): indexable with a self-canonical (absolute via metadataBase). The 4 offers pages stay
    // noindex, follow with no canonical: Giuseppe never wants them to rank for "offerte luce e gas".
    ...(guide ? { alternates: { canonical: page.path } } : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: "VERSUS — comparatore luce e gas",
      url: page.path,
      title: page.title,
      description: page.description,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [OG_IMAGE] },
  };
}
