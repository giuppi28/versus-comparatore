"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/components/ui/cn";

export interface LoadingSupplier {
  id: string;
  name: string;
  /** Optional SVG/PNG path or URL. When missing, a neutral text chip is rendered. */
  logoUrl?: string | null;
}

export interface LoadingScreenProps {
  /** Suppliers to orbit. The caller should already exclude the current supplier. */
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

/** Max logos on the orbit (more would overlap on a 390px screen). */
export const MAX_ORBIT_SUPPLIERS = 10;
export const DEFAULT_DURATION_MS = 4000;
const TICK_MS = 50;
const STAGGER_MS = 160;

/** Progress thresholds (0..1) at which each message starts. */
const MESSAGE_STARTS = [0, 0.25, 0.55, 0.85] as const;

export function getLoadingMessage(progress: number, supplierCount: number): string {
  const step = MESSAGE_STARTS.reduce<number>((acc, start, i) => (progress >= start ? i : acc), 0);
  switch (step) {
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
 * Scoped styles: orbit radius is responsive through --vs-orbit-r (mobile 112px,
 * >=640px 168px). Keyframes live here so the component is self-contained.
 */
const STYLES = `
.vs-loading { --vs-orbit-r: 112px; --vs-chip-w: 76px; --vs-chip-h: 40px; }
@media (min-width: 640px) {
  .vs-loading { --vs-orbit-r: 168px; --vs-chip-w: 108px; --vs-chip-h: 52px; }
}
.vs-orbit { width: calc(var(--vs-orbit-r) * 2 + var(--vs-chip-w)); height: calc(var(--vs-orbit-r) * 2 + var(--vs-chip-w)); max-width: 100%; }
.vs-slot { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform: rotate(var(--vs-angle)) translateY(calc(var(--vs-orbit-r) * -1)) rotate(calc(var(--vs-angle) * -1)); }
.vs-chip-box { position: absolute; left: calc(var(--vs-chip-w) / -2); top: calc(var(--vs-chip-h) / -2); width: var(--vs-chip-w); height: var(--vs-chip-h); }
@keyframes vs-spin { to { transform: rotate(360deg); } }
@keyframes vs-spin-rev { to { transform: rotate(-360deg); } }
@keyframes vs-pop { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
@keyframes vs-pulse { 0% { transform: scale(0.9); opacity: 0.55; } 100% { transform: scale(1.35); opacity: 0; } }
.vs-ring[data-animate="true"] { animation: vs-spin 28s linear infinite; }
.vs-counter[data-animate="true"] { animation: vs-spin-rev 28s linear infinite; }
.vs-pop[data-animate="true"] { animation: vs-pop 520ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: var(--vs-delay, 0ms); }
.vs-pulse[data-animate="true"] { animation: vs-pulse 1.8s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .vs-ring, .vs-counter, .vs-pop, .vs-pulse { animation: none !important; }
}
`;

function SupplierChip({ supplier }: { supplier: LoadingSupplier }) {
  return (
    <div
      data-testid="loading-supplier"
      data-supplier-id={supplier.id}
      className="flex h-full w-full items-center justify-center overflow-hidden rounded-control border border-line bg-surface px-2 shadow-card"
    >
      {supplier.logoUrl ? (
        // Plain <img>: supplier logos are SVG files, no raster optimisation needed.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={supplier.logoUrl}
          alt={supplier.name}
          className="max-h-full max-w-full object-contain py-1.5"
        />
      ) : (
        <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight tracking-tight text-ink sm:text-sm">
          {supplier.name}
        </span>
      )}
    </div>
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
  const message = getLoadingMessage(progress, shown.length);

  return (
    <section
      data-testid="loading-screen"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      aria-busy={progress < 1}
      className={cn(
        "vs-loading mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-8 sm:gap-10 sm:py-12",
        className,
      )}
    >
      <style>{STYLES}</style>

      <div className="vs-orbit relative" data-testid="loading-orbit">
        {/* Orbit track */}
        <div
          aria-hidden="true"
          className="absolute rounded-full border border-dashed border-brand-200"
          style={{
            inset: "calc(var(--vs-chip-w) / 2)",
          }}
        />

        {/* Center logo with pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden="true"
              data-animate={animate}
              className="vs-pulse absolute h-24 w-24 rounded-full bg-brand-200 sm:h-32 sm:w-32"
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-surface shadow-pop sm:h-32 sm:w-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/versus_icona.svg"
                alt="VERSUS"
                className="h-14 w-14 rounded-[22%] sm:h-20 sm:w-20"
              />
            </div>
          </div>
        </div>

        {/* Orbiting suppliers */}
        <div data-animate={animate} className="vs-ring absolute inset-0">
          {shown.map((supplier, i) => (
            <div
              key={supplier.id}
              className="vs-slot"
              style={{ "--vs-angle": `${(360 / shown.length) * i}deg` } as React.CSSProperties}
            >
              <div className="vs-chip-box">
                <div
                  data-animate={animate}
                  className="vs-pop h-full w-full"
                  style={{ "--vs-delay": `${i * STAGGER_MS}ms` } as React.CSSProperties}
                >
                  <div data-animate={animate} className="vs-counter h-full w-full">
                    <SupplierChip supplier={supplier} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p
          role="status"
          aria-live="polite"
          data-testid="loading-message"
          className="min-h-[3.5rem] text-center text-lg font-semibold text-ink sm:min-h-0 sm:text-xl"
        >
          {message}
        </p>
        <div
          role="progressbar"
          aria-label="Avanzamento del confronto"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          data-testid="loading-progress"
          className="h-2.5 w-full overflow-hidden rounded-full bg-brand-100"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-100 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
