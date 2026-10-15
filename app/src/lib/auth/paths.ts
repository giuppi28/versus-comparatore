import { ADMIN_LOGIN_PATH } from "./constants";

/** True for /admin and /admin/** except the public login segment (/admin/login/**). */
export function isProtectedAdminPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p !== "/admin" && !p.startsWith("/admin/")) return false;
  if (p === ADMIN_LOGIN_PATH || p.startsWith(`${ADMIN_LOGIN_PATH}/`)) return false;
  return true;
}
