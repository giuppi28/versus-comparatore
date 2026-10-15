import type { ReactNode } from "react";
import { SiteFooter } from "@/components/brand";
import { FlowProvider } from "@/lib/lead/flow-context";

/** Public customer flow: shares the flow state (sessionStorage-backed) across pages. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <FlowProvider>
      {children}
      <SiteFooter />
    </FlowProvider>
  );
}
