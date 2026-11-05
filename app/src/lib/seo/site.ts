/** Canonical origin of the site. Previews do not set NEXT_PUBLIC_SITE_URL, so they fall back to the production domain. */
export const DEFAULT_SITE_URL = "https://versuscomparatorelucegas.it";

export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim() ?? "";
  if (!/^https?:\/\//i.test(value)) return DEFAULT_SITE_URL;
  return value.replace(/\/+$/, "");
}

export const SITE_URL: string = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
