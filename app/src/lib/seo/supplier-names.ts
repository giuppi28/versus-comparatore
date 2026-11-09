import { getDataSource, getRepository } from "@/lib/data";
import { isRealSupplier } from "@/lib/data/types";

/** Names of real suppliers with at least one active offer; null when the repository fails. */
export async function loadSupplierNames(): Promise<string[] | null> {
  // A deployment without NEXT_PUBLIC_DATA_SOURCE falls back to mock data: never publish those names.
  if (getDataSource() === "mock" && process.env.NODE_ENV === "production") return null;
  try {
    const repo = getRepository();
    const suppliers = (await repo.listActiveSuppliers()).filter(isRealSupplier);
    const lists = await Promise.all(
      (["luce", "gas"] as const).flatMap((c) =>
        (["casa", "business"] as const).map((t) => repo.listActiveOffers(c, t)),
      ),
    );
    const withOffers = new Set(lists.flat().map((o) => o.supplier_id));
    return suppliers
      .filter((s) => withOffers.has(s.id))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "it"))
      .map((s) => s.name);
  } catch (error) {
    console.error("llms.txt: could not load the suppliers", error);
    return null;
  }
}
