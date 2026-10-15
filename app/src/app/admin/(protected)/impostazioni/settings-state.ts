export interface SettingsFormState {
  /** Italian error message for the email field. */
  error?: string;
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
  saveFailed: "Impossibile salvare le impostazioni. Riprova tra poco.",
} as const;
