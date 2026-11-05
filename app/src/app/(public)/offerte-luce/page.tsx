import { OffersPageView } from "@/components/seo";
import { buildSeoMetadata, getOffersPage } from "@/lib/seo/pages";

const PATH = "/offerte-luce";

export const metadata = buildSeoMetadata(getOffersPage(PATH));

// The list is read from the repository on every request: admin changes show up immediately.
export const dynamic = "force-dynamic";

export default function Page() {
  return <OffersPageView path={PATH} />;
}
