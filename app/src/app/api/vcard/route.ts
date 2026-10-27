/**
 * GET /api/vcard — vCard 3.0 with the callback number from settings ("Salva il nostro numero"
 * on the thank-you page). Read-only and public (the number is already shown there), so no
 * rate limiting. PHOTO is omitted: only an SVG icon exists and vCard 3.0 needs a raster.
 */
import { DEFAULT_CALLBACK_PHONE, getRepository } from "@/lib/data";
import { buildVCard } from "@/lib/vcard";

export const dynamic = "force-dynamic";

async function loadCallbackPhone(): Promise<string> {
  try {
    const phone = await getRepository().getCallbackPhone();
    return phone.trim() !== "" ? phone : DEFAULT_CALLBACK_PHONE;
  } catch {
    return DEFAULT_CALLBACK_PHONE;
  }
}

export async function GET() {
  const body = buildVCard({ phone: await loadCallbackPhone() });
  return new Response(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="versus.vcf"',
      "Cache-Control": "no-store",
    },
  });
}
