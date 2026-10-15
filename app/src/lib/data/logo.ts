import { SUPPLIER_LOGO_BUCKET } from "./repository";

/**
 * Turns a `suppliers.logo_path` into a URL usable in an <img src>.
 * - absolute http(s) URL, root-relative "/..." path or `data:image/` URL: returned as is
 * - anything else is a Supabase Storage object path in the public
 *   "supplier-logos" bucket: `<NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/supplier-logos/<path>`
 * - null / empty / unresolvable (no Supabase URL configured): null (caller shows the text fallback)
 *
 * Pure and safe on both server and client.
 */
export function resolveLogoUrl(
  logoPath: string | null | undefined,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const p = logoPath?.trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (/^data:image\//i.test(p)) return p;
  if (p.startsWith("//")) return null; // protocol-relative: never trust
  if (p.startsWith("/")) return p;
  if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return null; // javascript:, file:, ...
  const base = supabaseUrl?.trim().replace(/\/+$/, "");
  if (!base) return null;
  const key = p
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${base}/storage/v1/object/public/${SUPPLIER_LOGO_BUCKET}/${key}`;
}
