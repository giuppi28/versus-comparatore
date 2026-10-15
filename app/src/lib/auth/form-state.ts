export interface AuthFormState {
  error?: string;
  /** 429 when rate limited. */
  status?: 429;
  /** Incremented on every failed submit (used to reset the Turnstile widget). */
  attempt: number;
  /** Email to keep in the field after a failed login (the form is reset by React). */
  email?: string;
}

export interface EnrollFormState extends AuthFormState {
  enrollment?: { factorId: string; qrCode: string; secret: string };
  done?: boolean;
}

export const INITIAL_AUTH_STATE: AuthFormState = { attempt: 0 };
export const INITIAL_ENROLL_STATE: EnrollFormState = { attempt: 0 };
