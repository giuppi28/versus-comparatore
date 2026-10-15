export type AdminAccess = "anonymous" | "forbidden" | "mfa_required" | "ok";

export interface AccessFacts {
  authenticated: boolean;
  isAdmin: boolean;
  /** Current Authenticator Assurance Level of the session (null = aal1). */
  currentLevel: string | null;
  /** Level the user can reach (aal2 when a verified TOTP factor exists). */
  nextLevel: string | null;
}

/**
 * Pure access decision used by every provider:
 * anonymous -> not signed in; forbidden -> signed in but not in `admins`;
 * mfa_required -> admin with a verified TOTP factor but session still aal1.
 */
export function decideAdminAccess(f: AccessFacts): AdminAccess {
  if (!f.authenticated) return "anonymous";
  if (!f.isAdmin) return "forbidden";
  if (f.nextLevel === "aal2" && f.currentLevel !== "aal2") return "mfa_required";
  return "ok";
}
