"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { VersusLogo } from "@/components/brand";
import { cn } from "@/components/ui/cn";

export interface LoadingSupplier {
  id: string;
  name: string;
  /** Optional SVG/PNG path or URL. When missing, a neutral text chip is rendered. */
  logoUrl?: string | null;
}

export interface LoadingScreenProps {
  /** Suppliers being "compared". The caller should already exclude the current supplier. */
  suppliers: LoadingSupplier[];
  /** Extra guarantee: suppliers with these ids are never shown nor counted. */
  excludeSupplierIds?: string[];
  /** Total animation time in ms (PRD §7: ~4 s). */
  durationMs?: number;
  /** Called once, when the animation ends. */
  onComplete: () => void;
  /** Called once, when the animation starts (used by the caller to update the lead). */
  onStart?: () => void;
  className?: string;
}

/** Max suppliers counted in the "N fornitori" message. */
export const MAX_ORBIT_SUPPLIERS = 10;
/** Max small logos in the quiet row under the progress bar (6 fit in a 390px viewport). */
export const MAX_VISIBLE_LOGOS = 6;
export const DEFAULT_DURATION_MS = 4000;
const TICK_MS = 50;
const STAGGER_MS = 110;

/** Progress thresholds (0..1) at which each message starts. */
const MESSAGE_STARTS = [0, 0.25, 0.55, 0.85] as const;

/** The logo row "highlights" each supplier in turn between these progress values. */
const HIGHLIGHT_FROM = 0.2;
const HIGHLIGHT_TO = 0.85;

/** Index of the logo currently highlighted (full colour), or -1 outside the compare phase. */
export function getHighlightIndex(progress: number, count: number): number {
  if (count <= 0 || progress < HIGHLIGHT_FROM || progress >= HIGHLIGHT_TO) return -1;
  const ratio = (progress - HIGHLIGHT_FROM) / (HIGHLIGHT_TO - HIGHLIGHT_FROM);
  return Math.min(count - 1, Math.floor(ratio * count));
}

function getMessageStep(progress: number): number {
  return MESSAGE_STARTS.reduce<number>((acc, start, i) => (progress >= start ? i : acc), 0);
}

export function getLoadingMessage(progress: number, supplierCount: number): string {
  switch (getMessageStep(progress)) {
    case 0:
      return "Analizziamo i tuoi consumi…";
    case 1:
      if (supplierCount <= 0) return "Confrontiamo le offerte disponibili…";
      return supplierCount === 1
        ? "Confrontiamo le offerte di 1 fornitore…"
        : `Confrontiamo le offerte di ${supplierCount} fornitori…`;
    case 2:
      return "Calcoliamo la tua spesa mensile…";
    default:
      return "Ecco le migliori offerte per te!";
  }
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener?.("change", onChange);
  return () => mq.removeEventListener?.("change", onChange);
}

function getReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
}

/*
 * Scoped keyframes (transform / opacity only). Reduced motion: everything static;
 * progress and messages still advance.
 */
const STYLES = `
@keyframes vs-ring { 0% { transform: scale(0.92); opacity: 0.45; } 100% { transform: scale(1.55); opacity: 0; } }
@keyframes vs-msg { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes vs-logo-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.vs-ring[data-animate="true"] { animation: vs-ring 2.4s cubic-bezier(0.2, 0.6, 0.3, 1) infinite; }
.vs-msg[data-animate="true"] { animation: vs-msg 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.vs-logo-in[data-animate="true"] { animation: vs-logo-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: var(--vs-delay, 0ms); }
.vs-fade { transition: opacity 260ms ease; }
.vs-bar { transition: transform 120ms linear; transform-origin: left center; }
@media (prefers-reduced-motion: reduce) {
  .vs-ring, .vs-msg, .vs-logo-in { animation: none !important; }
  .vs-fade, .vs-bar { transition: none !important; }
}
`;

function SupplierLogo({
  supplier,
  index,
  active,
  animate,
}: {
  supplier: LoadingSupplier;
  index: number;
  active: boolean;
  animate: boolean;
}) {
  return (
    <li
      data-testid="loading-supplier"
      data-supplier-id={supplier.id}
      data-active={active ? "true" : "false"}
      data-animate={animate}
      className="vs-logo-in relative h-6 w-11 sm:h-7 sm:w-[4.5rem]"
      style={{ "--vs-delay": `${index * STAGGER_MS}ms` } as React.CSSProperties}
    >
      {supplier.logoUrl ? (
        <>
          {/* Plain <img>: supplier logos are SVG files, no raster optimisation needed. */}
          {/* Resting state: greyscale, quiet. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={supplier.logoUrl}
            alt={supplier.name}
            className="absolute inset-0 h-full w-full object-contain opacity-50 grayscale"
          />
          {/* Being compared: the same logo in full colour fades in on top. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={supplier.logoUrl}
            alt=""
            aria-hidden="true"
            className={cn(
              "vs-fade absolute inset-0 h-full w-full object-contain",
              active ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : (
        <span
          className={cn(
            "vs-fade absolute inset-0 flex items-center justify-center text-center text-[10px] font-semibold leading-tight tracking-tight sm:text-xs",
            active ? "text-ink" : "text-ink-subtle opacity-60",
          )}
        >
          <span className="line-clamp-2">{supplier.name}</span>
        </span>
      )}
    </li>
  );
}

export function LoadingScreen({
  suppliers,
  excludeSupplierIds,
  durationMs = DEFAULT_DURATION_MS,
  onComplete,
  onStart,
  className,
}: LoadingScreenProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = !reducedMotion;

  // Current supplier (and duplicates) are dropped here: never shown, never counted.
  const shown = useMemo(() => {
    const excluded = new Set(excludeSupplierIds ?? []);
    const seen = new Set<string>();
    const result: LoadingSupplier[] = [];
    for (const s of suppliers) {
      if (excluded.has(s.id) || seen.has(s.id)) continue;
      seen.add(s.id);
      result.push(s);
      if (result.length >= MAX_ORBIT_SUPPLIERS) break;
    }
    return result;
  }, [suppliers, excludeSupplierIds]);
  const logos = shown.slice(0, MAX_VISIBLE_LOGOS);

  const [progress, setProgress] = useState(0);

  // Keep latest callbacks without restarting the timer when the parent re-renders.
  const onCompleteRef = useRef(onComplete);
  const onStartRef = useRef(onStart);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onStartRef.current = onStart;
  });
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      onStartRef.current?.();
    }
    const total = Math.max(0, durationMs);
    const startedAt = Date.now();
    const finish = () => {
      setProgress(1);
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };
    if (total === 0) {
      finish();
      return;
    }
    const interval = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / total);
      if (ratio >= 1) {
        clearInterval(interval);
        finish();
      } else {
        setProgress(ratio);
      }
    }, Math.min(TICK_MS, total));
    return () => clearInterval(interval);
  }, [durationMs]);

  const percent = Math.round(progress * 100);
  const step = getMessageStep(progress);
  const message = getLoadingMessage(progress, shown.length);
  const highlight = getHighlightIndex(progress, logos.length);

  return (
    <section
      data-testid="loading-screen"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      aria-busy={progress < 1}
      className={cn(
        // Fills the area below the header (header 3.5/4rem + main padding 3/5rem) and centres the content.
        "mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-xl flex-col items-center justify-center gap-7 pb-6 sm:min-h-[calc(100dvh-10rem)] sm:gap-8 sm:pb-8",
        className,
      )}
    >
      <style>{STYLES}</style>

      {/* VERSUS icon with a soft pulsing ring */}
      <div className="relative flex h-16 w-16 items-center justify-center" data-testid="loading-mark">
        <span
          aria-hidden="true"
          data-animate={animate}
          className="vs-ring absolute inset-0 rounded-[22%] border-2 border-brand-600 opacity-20"
        />
        <VersusLogo variant="icon" title="" className="relative h-16 w-16 rounded-[22%]" />
      </div>

      {/* Message: height reserved for two lines, so nothing moves between messages */}
      <p
        role="status"
        aria-live="polite"
        data-testid="loading-message"
        className="flex h-[3.25rem] w-full items-center justify-center text-center text-base font-medium leading-snug text-ink sm:h-8 sm:text-lg"
      >
        <span
          key={step}
          data-animate={animate}
          className={cn("vs-msg block", step === 3 && "text-brand-700")}
        >
          {message}
        </span>
      </p>

      <div
        role="progressbar"
        aria-label="Avanzamento del confronto"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        data-testid="loading-progress"
        className="h-1 w-full max-w-80 overflow-hidden rounded-full bg-line"
      >
        <div
          className="vs-bar h-full w-full rounded-full bg-brand-600"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>

      {/* Quiet row of suppliers: greyscale at rest, the one being compared turns to colour */}
      {logos.length > 0 && (
        <ul
          aria-label="Fornitori confrontati"
          data-testid="loading-suppliers"
          className="flex min-h-6 flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:min-h-7 sm:gap-x-5"
        >
          {logos.map((supplier, i) => (
            <SupplierLogo
              key={supplier.id}
              supplier={supplier}
              index={i}
              active={i === highlight}
              animate={animate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
