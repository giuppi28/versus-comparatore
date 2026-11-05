import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

// Home only (/privacy stays noindex). No lastModified: no invented dates.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/` }];
}
