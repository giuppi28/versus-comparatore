"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { VersusMark } from "@/components/brand";
import { cn } from "@/components/ui/cn";
import type { Commodity } from "@/lib/data/types";

export interface LoadingSupplier {
  id: string;
  name: string;
  /** Optional SVG/PNG path or URL. When missing, a neutral text chip is rendered. */
  logoUrl?: string | null;
}

export interface LoadingScreenProps {
  /** Suppliers being "compared". The caller should already exclude the current supplier. */
  suppliers: LoadingSupplier[];
  /** Extra guarantee: suppliers with these ids are never shown. */
  excludeSupplierIds?: string[];
  /** Commodities being compared; only used to word the messages ("offerte luce", "offerte gas"...). */
  commodities?: Commodity[];
  /** Total animation time in ms (PRD §7: ~4 s). */
  durationMs?: number;
  /** Called once, when the animation ends. */
  onComplete: () => void;
  /** Called once, when the animation starts (used by the caller to update the lead). */
  onStart?: () => void;
  className?: string;
}

export const DEFAULT_DURATION_MS = 4000;
const TICK_MS = 50;

/** Progress thresholds (0..1) at which each message starts. */
const MESSAGE_STARTS = [0, 0.2, 0.42, 0.64, 0.86] as const;

/** A message is a list of parts; `{ em }` parts are highlighted in VERSUS green. */
export type MessagePart = string | { em: string };

export function commodityPhrase(commodities?: Commodity[]): string {
  const hasLuce = commodities?.includes("luce") ?? false;
  const hasGas = commodities?.includes("gas") ?? false;
  if (hasLuce && hasGas) return "offerte luce e gas";
  if (hasLuce) return "offerte luce";
  if (hasGas) return "offerte gas";
  return "offerte";
}

export function getMessageStep(progress: number): number {
  return MESSAGE_STARTS.reduce<number>((acc, start, i) => (progress >= start ? i : acc), 0);
}

export function getLoadingMessageParts(progress: number, commodities?: Commodity[]): MessagePart[] {
  switch (getMessageStep(progress)) {
    case 0:
      return ["Analizziamo i ", { em: "tuoi consumi" }];
    case 1:
      return ["Stiamo confrontando le ", { em: commodityPhrase(commodities) }, " per te"];
    case 2:
      return ["Analizziamo i ", { em: "migliori fornitori" }];
    case 3:
      return ["Calcoliamo la tua ", { em: "spesa mensile" }];
    default:
      return ["Ecco le ", { em: "migliori offerte" }, " per te!"];
  }
}

export function getLoadingMessage(progress: number, commodities?: Commodity[]): string {
  return getLoadingMessageParts(progress, commodities)
    .map((p) => (typeof p === "string" ? p : p.em))
    .join("");
}

/** Local colour logos (`/logos/<slug>.svg`) have a normalised black twin in `/logos/black/`. */
export function blackLogoUrl(url: string): { src: string; needsFilter: boolean } {
  const m = /^\/logos\/([a-z0-9-]+)\.svg$/i.exec(url);
  return m ? { src: `/logos/black/${m[1]}.svg`, needsFilter: false } : { src: url, needsFilter: true };
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

/** Seconds the marquee needs to scroll past one logo (~90px/s with the spacing below). */
const MARQUEE_SECONDS_PER_ITEM = 1.9;
/** The first track group must be wider than any viewport: repeat the logos until we have this many. */
const MARQUEE_MIN_ITEMS = 12;

/*
 * Scoped keyframes (transform / opacity / stroke-dashoffset only).
 * Reduced motion: marquee static, messages swap without motion; the ring still shows progress.
 */
const STYLES = `
@keyframes vs-marquee { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-50%, 0, 0); } }
@keyframes vs-msg { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.vs-marquee-mask {
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 14%, #000 86%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 14%, #000 86%, transparent 100%);
}
.vs-marquee-track { animation: vs-marquee var(--vs-marquee-s, 20s) linear infinite; will-change: transform; }
.vs-msg[data-animate="true"] { animation: vs-msg 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.vs-ring-arc { transition: stroke-dashoffset 80ms linear; }
@media (prefers-reduced-motion: reduce) {
  .vs-marquee-track, .vs-msg { animation: none !important; }
  .vs-marquee-mask { -webkit-mask-image: none; mask-image: none; }
  .vs-ring-arc { transition: none !important; }
}
`;

function LogoItem({
  supplier,
  testId,
  hidden,
}: {
  supplier: LoadingSupplier;
  testId: string;
  hidden: boolean;
}) {
  const logo = supplier.logoUrl ? blackLogoUrl(supplier.logoUrl) : null;
  return (
    <li
      data-testid={testId}
      data-supplier-id={supplier.id}
      aria-hidden={hidden ? "true" : undefined}
      className="flex h-8 shrink-0 items-center pr-10 sm:h-10 sm:pr-14"
    >
      {logo ? (
        <>
          {/* Plain <img>: supplier logos are SVG files, no raster optimisation needed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.src}
            alt={hidden ? "" : supplier.name}
            draggable={false}
            className={cn(
              "h-full w-auto max-w-[8.5rem] select-none object-contain opacity-90 sm:max-w-[10rem]",
              logo.needsFilter && "brightness-0",
            )}
          />
        </>
      ) : (
        <span className="whitespace-nowrap text-base font-semibold tracking-tight text-ink sm:text-lg">
          {supplier.name}
        </span>
      )}
    </li>
  );
}

function SupplierMarquee({ suppliers, reducedMotion }: { suppliers: LoadingSupplier[]; reducedMotion: boolean }) {
  if (suppliers.length === 0) return null;

  if (reducedMotion) {
    // Static, centred, wrapped row: no movement, no duplicated logos.
    return (
      <div className="w-full rounded-card border border-line bg-surface px-4 py-5 shadow-card sm:px-8">
        <ul
          aria-label="Fornitori confrontati"
          data-testid="loading-suppliers"
          className="flex flex-wrap items-center justify-center gap-y-4"
        >
          {suppliers.map((s) => (
            <LogoItem key={s.id} supplier={s} testId="loading-supplier" hidden={false} />
          ))}
        </ul>
      </div>
    );
  }

  const repeats = Math.max(1, Math.ceil(MARQUEE_MIN_ITEMS / suppliers.length));
  // One cycle = the logos repeated until it is wider than the screen; the track holds two cycles
  // and slides by exactly -50% (seamless). Only the very first set carries the real list semantics.
  const cycle = Array.from({ length: repeats }, (_, r) => suppliers.map((s) => ({ s, real: r === 0 }))).flat();
  const seconds = (cycle.length * MARQUEE_SECONDS_PER_ITEM).toFixed(1);

  return (
    <div className="w-full overflow-hidden rounded-card border border-line bg-surface py-5 shadow-card sm:py-6">
      <div className="vs-marquee-mask overflow-hidden">
        <div
          className="vs-marquee-track flex w-max"
          style={{ "--vs-marquee-s": `${seconds}s` } as React.CSSProperties}
        >
          <ul aria-label="Fornitori confrontati" data-testid="loading-suppliers" className="flex shrink-0">
            {cycle.map(({ s, real }, i) => (
              <LogoItem
                key={`${s.id}-${i}`}
                supplier={s}
                testId={real ? "loading-supplier" : "loading-supplier-copy"}
                hidden={!real}
              />
            ))}
          </ul>
          <ul aria-hidden="true" className="flex shrink-0">
            {cycle.map(({ s }, i) => (
              <LogoItem key={`${s.id}-${i}`} supplier={s} testId="loading-supplier-copy" hidden />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const RING_RADIUS = 46;

export function LoadingScreen({
  suppliers,
  excludeSupplierIds,
  commodities,
  durationMs = DEFAULT_DURATION_MS,
  onComplete,
  onStart,
  className,
}: LoadingScreenProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = !reducedMotion;

  // Current supplier (and duplicates) are dropped here: never shown.
  const shown = useMemo(() => {
    const excluded = new Set(excludeSupplierIds ?? []);
    const seen = new Set<string>();
    const result: LoadingSupplier[] = [];
    for (const s of suppliers) {
      if (excluded.has(s.id) || seen.has(s.id)) continue;
      seen.add(s.id);
      result.push(s);
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
  const step = getMessageStep(progress);
  const parts = getLoadingMessageParts(progress, commodities);

  return (
    <section
      data-testid="loading-screen"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      aria-busy={progress < 1}
      className={cn(
        // Fills the area below the header and centres the content; the marquee card may use the full width.
        "mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-4xl flex-col items-center justify-center gap-6 pb-6 sm:min-h-[calc(100dvh-10rem)] sm:gap-9 sm:pb-8",
        className,
      )}
    >
      <style>{STYLES}</style>

      {/* Black VERSUS icon inside a green progress ring (SVG circle, stroke-dashoffset) */}
      <div
        role="progressbar"
        aria-label="Avanzamento del confronto"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        data-testid="loading-progress"
        className="relative flex h-36 w-36 items-center justify-center sm:h-52 sm:w-52"
      >
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full">
          <circle cx="50" cy="50" r={RING_RADIUS} fill="var(--color-surface)" />
          <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="var(--color-brand-100)" strokeWidth="3.5" />
          <circle
            data-testid="loading-ring"
            className="vs-ring-arc"
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-brand-600)"
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - percent}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <VersusMark className="relative h-24 w-24 sm:h-32 sm:w-32" />
      </div>

      {/* Message: fixed height for up to three lines, so nothing moves between messages */}
      <p
        role="status"
        aria-live="polite"
        data-testid="loading-message"
        className="flex h-[5.5rem] w-full items-center justify-center px-1 text-center font-display text-[1.5rem] font-bold leading-[1.15] text-ink text-balance [font-stretch:125%] sm:text-4xl sm:leading-[1.15]"
      >
        <span key={step} data-animate={animate} className="vs-msg block">
          {parts.map((p, i) =>
            typeof p === "string" ? (
              <Fragment key={i}>{p}</Fragment>
            ) : (
              <span key={i} className="text-brand-700">
                {p.em}
              </span>
            ),
          )}
        </span>
      </p>

      <SupplierMarquee suppliers={shown} reducedMotion={reducedMotion} />
    </section>
  );
}
