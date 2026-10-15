import type { ReactNode } from "react";
import { FlowProvider } from "@/lib/lead/flow-context";

/** Public customer flow: shares the flow state (sessionStorage-backed) across pages. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <FlowProvider>{children}</FlowProvider>;
}
