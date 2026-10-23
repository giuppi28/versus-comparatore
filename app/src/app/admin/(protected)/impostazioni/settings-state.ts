export interface SettingsFormState {
  /** Italian error message for the email field. */
  error?: string;
  /** Italian error message for the callback phone field. */
  phoneError?: string;
  /** Callback phone to keep in the field after a failed submit. */
  phone?: string;
  /** Set after a successful save. */
  saved?: "enabled" | "disabled";
  /** Value to keep in the field after a failed submit. */
  email?: string;
  /** Incremented on every submit (lets tests wait for the action to answer). */
  attempt: number;
}

export const INITIAL_SETTINGS_STATE: SettingsFormState = { attempt: 0 };

export const SETTINGS_MESSAGES = {
  invalidEmail: "Inserisci un indirizzo email valido (es. nome@azienda.it).",
  invalidPhone:
    "Usa solo cifre e spazi, con + iniziale facoltativo (6–20 caratteri). Es. +39 095 1234567",
  saveFailed: "Impossibile salvare le impostazioni. Riprova tra poco.",
} as const;

export interface TestEmailState {
  result?: "sent" | "error";
  /** Full Italian message (errors include Resend's body verbatim). */
  message?: string;
  /** Incremented on every submit. */
  attempt: number;
}

export const INITIAL_TEST_EMAIL_STATE: TestEmailState = { attempt: 0 };
