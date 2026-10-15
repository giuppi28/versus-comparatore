import type { SupabaseClient } from "@supabase/supabase-js";
import { decideAdminAccess } from "../access";
import { createSupabaseServerClient } from "../supabase-server";
import type { AdminState, AuthProvider, MfaApi, SignInResult } from "./types";

const ANONYMOUS: AdminState = { access: "anonymous", user: null };

/** DB contract: `public.is_admin() returns boolean` (true when auth.uid() is in `admins`). */
async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

async function assurance(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { currentLevel: null, nextLevel: null };
  return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
}

const TOTP_CODE = /^\d{6}$/;

function createMfaApi(): MfaApi {
  async function verifiedTotpId(supabase: SupabaseClient): Promise<string | null> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return null;
    return data.totp[0]?.id ?? null;
  }

  return {
    async hasVerifiedTotp() {
      const supabase = await createSupabaseServerClient();
      return (await verifiedTotpId(supabase)) !== null;
    },
    async verify(code) {
      if (!TOTP_CODE.test(code)) return false;
      const supabase = await createSupabaseServerClient();
      const factorId = await verifiedTotpId(supabase);
      if (!factorId) return false;
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      return !error;
    },
    async startEnrollment() {
      const supabase = await createSupabaseServerClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      // Drop abandoned, never-verified TOTP factors before enrolling a new one.
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "VERSUS admin",
        issuer: "VERSUS",
      });
      if (error || !data) return null;
      return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
    },
    async confirmEnrollment(factorId, code) {
      if (!TOTP_CODE.test(code) || !factorId) return false;
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      return !error;
    },
  };
}

export function createSupabaseAuthProvider(): AuthProvider {
  return {
    mode: "supabase",
    async getState() {
      const supabase = await createSupabaseServerClient();
      // getClaims() validates the JWT (signature + expiry), unlike getSession().
      const { data, error } = await supabase.auth.getClaims();
      const claims = data?.claims;
      if (error || !claims?.sub) return ANONYMOUS;
      const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
      const admin = await isAdmin(supabase);
      const levels = admin ? await assurance(supabase) : { currentLevel: null, nextLevel: null };
      return { access: decideAdminAccess({ authenticated: true, isAdmin: admin, ...levels }), user };
    },
    async signIn(email, password): Promise<SignInResult> {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return "invalid";
      if (!(await isAdmin(supabase))) {
        await supabase.auth.signOut();
        return "invalid";
      }
      const levels = await assurance(supabase);
      const access = decideAdminAccess({ authenticated: true, isAdmin: true, ...levels });
      return access === "mfa_required" ? "mfa_required" : "ok";
    },
    async signOut() {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    },
    mfa: createMfaApi(),
  };
}
