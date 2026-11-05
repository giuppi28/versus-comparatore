import type { MetadataRoute } from "next";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { SITE_URL } from "@/lib/seo/site";

// Home + the 4 indexable guides (lastModified = the guide's reviewedOn). The 4 offers pages are noindex and a
// sitemap must not list noindex URLs. The home has no lastModified: no invented dates.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    ...GUIDE_PAGES.map((g) => ({ url: `${SITE_URL}${g.path}`, lastModified: g.reviewedOn })),
  ];
}
