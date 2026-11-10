import { getRepository } from "@/lib/data";
import { HOME_CONTENT_UPDATED, homeModifiedDay } from "./dates";

/**
 * Home `dateModified` / sitemap `lastModified`: later of HOME_CONTENT_UPDATED and the latest active-offer
 * `updated_at`. Four small reads of the public offers view; any failure falls back to HOME_CONTENT_UPDATED.
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
    return homeModifiedDay(lists.flat().map((o) => o.updated_at));
  } catch (error) {
    console.error("home dateModified: could not load the active offers", error);
    return HOME_CONTENT_UPDATED;
  }
}
