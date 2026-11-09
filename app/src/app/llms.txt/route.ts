import { buildLlmsTxt } from "@/lib/seo/llms";
import { SITE_URL } from "@/lib/seo/site";
import { loadSupplierNames } from "@/lib/seo/supplier-names";

// Supplier list follows the admin area: read it on every request.
export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildLlmsTxt(SITE_URL, await loadSupplierNames());
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
