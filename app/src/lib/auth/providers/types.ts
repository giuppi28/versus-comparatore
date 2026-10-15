import type { AdminAccess } from "../access";
import type { AuthMode } from "../env";

export interface AdminUser {
  id: string;
  email: string | null;
}

export interface AdminState {
  access: AdminAccess;
  user: AdminUser | null;
}

export type SignInResult = "ok" | "mfa_required" | "invalid";

export interface TotpEnrollment {
  factorId: string;
  /** SVG markup of the QR code. */
  qrCode: string;
  secret: string;
}

/** TOTP MFA operations (Supabase only; the mock provider has none). */
export interface MfaApi {
  hasVerifiedTotp(): Promise<boolean>;
  /** Verifies a code against the user's verified TOTP factor; upgrades the session to aal2. */
  verify(code: string): Promise<boolean>;
  startEnrollment(): Promise<TotpEnrollment | null>;
  confirmEnrollment(factorId: string, code: string): Promise<boolean>;
}

export interface AuthProvider {
  mode: AuthMode;
  getState(): Promise<AdminState>;
  /** Credentials check. Non-admin users are signed out and reported as "invalid". */
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  mfa: MfaApi | null;
}
