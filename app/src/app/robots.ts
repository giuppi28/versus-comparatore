import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

// Deliberate deviation from DOMINIO_IONOS_VERCEL.md §6: /offerte, /grazie and /attivazione are NOT
// disallowed. A crawler blocked by robots.txt can never read their noindex meta, so they would stay
// indexable by link. The same holds for the 4 noindex offers pages (/offerte-luce*, /offerte-gas). Only /admin and /api/ are blocked.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
