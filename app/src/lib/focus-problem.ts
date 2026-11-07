/**
 * Scroll-to-problem helpers for forms with a blocked submit (T18.5).
 *
 * `revealElement` brings one element into view (smooth, roughly centred, instant under
 * prefers-reduced-motion) and moves the focus to the right control inside it.
 * `focusFirstProblem` finds the first problem in DOM order inside a root: an invalid control or
 * group (`aria-invalid="true"`, which card groups set) or a form-level message marked
 * `data-form-problem` (server / network errors, give it `tabIndex={-1}`).
 */

const PROBLEM_SELECTOR = '[aria-invalid="true"], [data-form-problem]';
const CONTROL_SELECTOR = "input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)";
const SELF_FOCUSABLE = "input, select, textarea, button, [tabindex]";

function isRendered(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

/** The control that should receive the focus for `el` (the element itself, the selected card, or the first control). */
function focusTarget(el: HTMLElement): HTMLElement | null {
  if (el.matches(SELF_FOCUSABLE)) return el;
  return (
    el.querySelector<HTMLElement>('[aria-checked="true"]:not(:disabled)') ??
    el.querySelector<HTMLElement>(CONTROL_SELECTOR)
  );
}

export function revealElement(el: HTMLElement): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // A block taller than most of the screen is aligned to its start so its top stays visible.
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.7;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: tall ? "start" : "center" });
  focusTarget(el)?.focus({ preventScroll: true });
}

/** Scrolls to and focuses the first problem inside `root`; false when there is none. */
export function focusFirstProblem(root: ParentNode = document): boolean {
  const el = Array.from(root.querySelectorAll<HTMLElement>(PROBLEM_SELECTOR)).find(isRendered);
  if (!el) return false;
  revealElement(el);
  return true;
}
