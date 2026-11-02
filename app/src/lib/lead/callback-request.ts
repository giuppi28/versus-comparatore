/**
 * Explicit callback request (SPEC decision #28, art. 51 c.8-bis Codice del consumo).
 *
 * The sentence shown right above the "Richiamami" button on activation step B. The same
 * constant is stored on the lead (leads.callback_request_text, with callback_requested_at)
 * by the complete route, server side: the text is never taken from the client body, so the
 * record always matches what the customer saw. Client-safe module (no secrets).
 */
export const CALLBACK_REQUEST_TEXT =
  "Premendo «Richiamami» chiedi di essere ricontattato da un consulente VERSUS al numero di telefono che hai indicato, per attivare l'offerta scelta.";

/** Label of the step B submit button (the callback request itself). */
export const CALLBACK_REQUEST_BUTTON_LABEL = "Richiamami";

/** Max length accepted by the DB (leads_callback_request_text_len, complete_lead). */
export const CALLBACK_REQUEST_TEXT_MAX = 500;
