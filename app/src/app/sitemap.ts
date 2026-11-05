import type { MetadataRoute } from "next";
import { ALL_SEO_PAGES } from "@/lib/seo/pages";
import { SITE_URL } from "@/lib/seo/site";

// Home + the 8 SEO pages. Only the SEO pages carry a lastModified (their `reviewedOn`): no invented dates.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    ...ALL_SEO_PAGES.map((p) => ({ url: `${SITE_URL}${p.path}`, lastModified: p.reviewedOn })),
  ];
}
