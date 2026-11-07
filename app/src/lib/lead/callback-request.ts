/**
 * Explicit callback request (SPEC decision #28, art. 51 c.8-bis Codice del consumo).
 *
 * The sentence shown right below the "Accetta" button on activation step B. The same
 * constant is stored on the lead (leads.callback_request_text, with callback_requested_at)
 * by the complete route, server side: the text is never taken from the client body, so the
 * record always matches what the customer saw. Client-safe module (no secrets).
 */
export const CALLBACK_REQUEST_TEXT =
  "Premendo «Accetta» accetti di essere richiamato da un nostro operatore per la firma del contratto.";

/** Label of the step B submit button (the callback request itself). */
export const CALLBACK_REQUEST_BUTTON_LABEL = "Accetta";

/** Max length accepted by the DB (leads_callback_request_text_len, complete_lead). */
export const CALLBACK_REQUEST_TEXT_MAX = 500;
