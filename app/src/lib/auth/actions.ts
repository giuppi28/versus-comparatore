"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminState, getAuth, requireAdmin } from "./index";
import { getClientIp } from "./client-ip";
import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_MFA_PATH,
  AUTH_MESSAGES,
  LOGIN_RATE_LIMIT,
  MFA_RATE_LIMIT,
} from "./constants";
import type { AuthFormState, EnrollFormState } from "./form-state";
import { getSharedRateLimiter } from "./rate-limit";

const str = (v: FormDataEntryValue | null, max = 512) =>
  typeof v === "string" ? v.slice(0, max) : "";

function fail(prev: AuthFormState, error: string, status?: 429, email?: string): AuthFormState {
  return { error, status, attempt: prev.attempt + 1, email };
}

export async function loginAction(prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = str(formData.get("email"), 254).trim().toLowerCase();
  const password = str(formData.get("password"));
  if (!email || !password) return fail(prev, AUTH_MESSAGES.missingFields, undefined, email);

  const ip = getClientIp(await headers());
  const limiter = getSharedRateLimiter("admin-login", LOGIN_RATE_LIMIT);
  const key = `${ip}|${email}`;
  if (!limiter.consume(key).allowed) return fail(prev, AUTH_MESSAGES.tooManyAttempts, 429, email);

  let result;
  try {
    result = await getAuth().signIn(email, password);
  } catch {
    return fail(prev, AUTH_MESSAGES.unavailable, undefined, email);
  }
  if (result === "invalid") return fail(prev, AUTH_MESSAGES.invalidCredentials, undefined, email);

  limiter.reset(key);
  redirect(result === "mfa_required" ? ADMIN_MFA_PATH : ADMIN_HOME_PATH);
}

export async function verifyMfaAction(prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const state = await getAdminState();
  if (state.access === "anonymous") redirect(ADMIN_LOGIN_PATH);
  if (state.access === "ok") redirect(ADMIN_HOME_PATH);
  const mfa = getAuth().mfa;
  if (state.access !== "mfa_required" || !mfa) redirect(ADMIN_LOGIN_PATH);

  const code = str(formData.get("code"), 16).replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return fail(prev, AUTH_MESSAGES.missingCode);

  const ip = getClientIp(await headers());
  const limiter = getSharedRateLimiter("admin-mfa", MFA_RATE_LIMIT);
  const key = `${ip}|${state.user?.id}`;
  if (!limiter.consume(key).allowed) return fail(prev, AUTH_MESSAGES.tooManyAttempts, 429);

  if (!(await mfa.verify(code))) return fail(prev, AUTH_MESSAGES.invalidCode);
  limiter.reset(key);
  redirect(ADMIN_HOME_PATH);
}

export async function logoutAction(): Promise<void> {
  try {
    await getAuth().signOut();
  } finally {
    redirect(ADMIN_LOGIN_PATH);
  }
}

export async function startMfaEnrollmentAction(
  prev: EnrollFormState,
  formData: FormData,
): Promise<EnrollFormState> {
  void formData;
  await requireAdmin();
  const mfa = getAuth().mfa;
  if (!mfa) return { ...fail(prev, AUTH_MESSAGES.unavailable) };
  if (await mfa.hasVerifiedTotp()) return { attempt: prev.attempt, done: true };
  const enrollment = await mfa.startEnrollment();
  if (!enrollment) return { ...fail(prev, AUTH_MESSAGES.unavailable) };
  return { attempt: prev.attempt, enrollment };
}

export async function confirmMfaEnrollmentAction(
  prev: EnrollFormState,
  formData: FormData,
): Promise<EnrollFormState> {
  const user = await requireAdmin();
  const mfa = getAuth().mfa;
  if (!mfa || !prev.enrollment) return { ...fail(prev, AUTH_MESSAGES.unavailable) };
  const code = str(formData.get("code"), 16).replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { ...fail(prev, AUTH_MESSAGES.missingCode), enrollment: prev.enrollment };

  const ip = getClientIp(await headers());
  const limiter = getSharedRateLimiter("admin-mfa", MFA_RATE_LIMIT);
  const key = `${ip}|${user.id}`;
  if (!limiter.consume(key).allowed) {
    return { ...fail(prev, AUTH_MESSAGES.tooManyAttempts, 429), enrollment: prev.enrollment };
  }
  // Factor id comes from client-held state; Supabase only accepts the user's own factors.
  if (!(await mfa.confirmEnrollment(prev.enrollment.factorId, code))) {
    return { ...fail(prev, AUTH_MESSAGES.invalidCode), enrollment: prev.enrollment };
  }
  limiter.reset(key);
  return { attempt: prev.attempt, done: true };
}
