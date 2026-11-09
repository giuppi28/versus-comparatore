import { buildLlmsFullTxt } from "@/lib/seo/llms-full";
import { SITE_URL } from "@/lib/seo/site";
import { loadSupplierNames } from "@/lib/seo/supplier-names";

// Same dynamic behaviour as /llms.txt: the supplier list follows the admin area.
export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildLlmsFullTxt(SITE_URL, await loadSupplierNames());
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
