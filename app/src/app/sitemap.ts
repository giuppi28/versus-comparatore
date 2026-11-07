import type { MetadataRoute } from "next";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { loadHomeModifiedDay } from "@/lib/seo/home-modified";
import { SITE_URL } from "@/lib/seo/site";

// Home + the 4 indexable guides (lastModified = the guide's reviewedOn). The 4 offers pages are noindex and a
// sitemap must not list noindex URLs. The home lastModified is the latest active-offer update (floored, see dates.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: `${SITE_URL}/`, lastModified: await loadHomeModifiedDay() },
    ...GUIDE_PAGES.map((g) => ({ url: `${SITE_URL}${g.path}`, lastModified: g.reviewedOn })),
  ];
}
