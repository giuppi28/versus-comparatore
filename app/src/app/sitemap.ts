import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

// Home only: the 8 SEO pages are noindex and a sitemap must not list noindex URLs. No lastModified: no invented dates.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/` }];
}
