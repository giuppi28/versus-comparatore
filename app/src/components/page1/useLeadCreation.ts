"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createLead, LeadApiError } from "@/lib/lead/client";
import { toLeadCreateData, type FlowPatch, type FlowState } from "@/lib/lead/flow-state";
import { mapApiError } from "./logic";

const TOKEN_WAIT_MS = 20_000;
const POLL_MS = 100;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Options {
  state: FlowState;
  hydrated: boolean;
  update: (patch: FlowPatch) => void;
}

/**
 * Saves the lead the moment the privacy consent is ticked (PRD §6 Block C, §4.8).
 *
 * The Turnstile token and the consent can arrive in either order: whichever comes last
 * triggers `POST /api/lead`. After a failure nothing is retried automatically (the message
 * is shown next to the consent); re-ticking the consent or submitting the form retries.
 * Triggers are event callbacks (token / consent / submit), never effects with state writes.
 */
export function useLeadCreation({ state, hydrated, update }: Options) {
  const [error, setError] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  const stateRef = useRef(state);
  const tokenRef = useRef<string | null>(null);
  const wantRef = useRef(false);
  const blockedRef = useRef(false);
  const createdRef = useRef(false);
  const inflightRef = useRef<Promise<void> | null>(null);
  const lastErrorRef = useRef<unknown>(null);
  const updateRef = useRef(update);

  const tryCreate = useCallback(() => {
    if (
      !wantRef.current ||
      !tokenRef.current ||
      blockedRef.current ||
      createdRef.current ||
      inflightRef.current
    ) {
      return;
    }
    const token = tokenRef.current;
    tokenRef.current = null; // a Turnstile token is single use
    const run = createLead(toLeadCreateData(stateRef.current), token)
      .then(() => {
        createdRef.current = true;
        wantRef.current = false;
        lastErrorRef.current = null;
        setError(null);
        updateRef.current({ leadCreated: true });
      })
      .catch((e: unknown) => {
        lastErrorRef.current = e;
        blockedRef.current = true;
        setError(mapApiError(e).message);
        setWidgetKey((k) => k + 1); // ask Turnstile for a fresh token
      })
      .finally(() => {
        inflightRef.current = null;
      });
    inflightRef.current = run;
  }, []);

  // Mirror render-time values into refs (refs are only read from callbacks / promises).
  useEffect(() => {
    stateRef.current = state;
    updateRef.current = update;
    // `createdRef` only goes true -> false through markLeadLost(), never from a stale render.
    if (hydrated && state.leadCreated) createdRef.current = true;
    wantRef.current = hydrated && state.privacyConsent && !createdRef.current;
    tryCreate();
  });

  /** Widget callback. */
  const onToken = useCallback(
    (token: string | null) => {
      tokenRef.current = token;
      tryCreate();
    },
    [tryCreate],
  );

  /** Consent checkbox. The caller persists `privacyConsent`; this (re)arms the creation. */
  const onConsentChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        blockedRef.current = false;
        wantRef.current = !createdRef.current;
        setError(null);
        tryCreate();
      } else {
        wantRef.current = false;
        setError(null);
      }
    },
    [tryCreate],
  );

  /**
   * Resolves once the lead exists (creating it if needed, waiting for the Turnstile token
   * for up to 20 s). Throws the API error otherwise.
   */
  const ensureLead = useCallback(async () => {
    if (createdRef.current) return;
    blockedRef.current = false;
    wantRef.current = true;
    const deadline = Date.now() + TOKEN_WAIT_MS;
    while (!createdRef.current) {
      if (inflightRef.current) {
        await inflightRef.current;
        if (!createdRef.current) throw lastErrorRef.current;
      } else if (tokenRef.current) {
        tryCreate();
      } else if (Date.now() > deadline) {
        throw lastErrorRef.current ?? new LeadApiError(403, "turnstile_failed");
      } else {
        await sleep(POLL_MS);
      }
    }
  }, [tryCreate]);

  /** The server no longer knows our lead (cookie expired): create a new one on demand. */
  const markLeadLost = useCallback(() => {
    createdRef.current = false;
    wantRef.current = true;
    blockedRef.current = false;
    updateRef.current({ leadCreated: false });
  }, []);

  return { error, widgetKey, onToken, onConsentChange, ensureLead, markLeadLost };
}
