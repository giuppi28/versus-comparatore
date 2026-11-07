import { getRepository } from "@/lib/data";
import { latestUpdateDay, UPDATED_FLOOR } from "./dates";

/**
 * Home `dateModified` / sitemap `lastModified`: latest `updated_at` among the active offers (floored at
 * UPDATED_FLOOR). Four small reads of the public offers view; any failure falls back to the floor.
 */
export async function loadHomeModifiedDay(): Promise<string> {
  try {
    const repo = getRepository();
    const lists = await Promise.all([
      repo.listActiveOffers("luce", "casa"),
      repo.listActiveOffers("luce", "business"),
      repo.listActiveOffers("gas", "casa"),
      repo.listActiveOffers("gas", "business"),
    ]);
    return latestUpdateDay(lists.flat().map((o) => o.updated_at));
  } catch (error) {
    console.error("home dateModified: could not load the active offers", error);
    return UPDATED_FLOOR;
  }
}
