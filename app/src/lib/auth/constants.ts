/** Shared constants for admin authentication. */

export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_MFA_PATH = "/admin/login/mfa";
export const ADMIN_MFA_ENROLL_PATH = "/admin/login/mfa/attiva";
/** Signs out authenticated non-admin users, then redirects to the login page. */
export const ADMIN_REJECT_PATH = "/admin/login/esci";

/** httpOnly cookie used only by the mock auth provider (tests / local dev). */
export const MOCK_SESSION_COOKIE = "versus_admin_mock";
export const MOCK_SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Login rate limit: attempts per IP+email per window. */
export const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 } as const;
/** MFA code rate limit: attempts per IP+user per window. */
export const MFA_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 } as const;

/** Italian UI messages (generic on purpose: no user enumeration). */
export const AUTH_MESSAGES = {
  invalidCredentials: "Email o password non corretti.",
  missingFields: "Inserisci email e password.",
  tooManyAttempts: "Troppi tentativi, riprova più tardi",
  turnstileFailed: "Verifica di sicurezza non riuscita. Riprova.",
  invalidCode: "Codice non valido. Riprova.",
  missingCode: "Inserisci il codice a 6 cifre.",
  rejected: "Accesso non consentito.",
  unavailable: "Servizio di accesso non disponibile. Riprova più tardi.",
} as const;
