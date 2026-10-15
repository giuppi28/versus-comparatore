import type { NextRequest } from "next/server";
import { handleAdminRequest } from "@/lib/auth/proxy";

export function proxy(request: NextRequest) {
  return handleAdminRequest(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
