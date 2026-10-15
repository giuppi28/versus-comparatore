import { resolveLogoUrl } from "@/lib/data/logo";
import type { Supplier } from "@/lib/data/types";

/** Image URL for a supplier logo, or null (the UI then shows a neutral text chip). */
export function supplierLogoSrc(supplier: Pick<Supplier, "logo_path">): string | null {
  return resolveLogoUrl(supplier.logo_path);
}
