"use client";

import {
  createContext,
  useContext,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "./cn";
import { CheckIcon } from "./icons";

type SelectType = "radio" | "checkbox";

interface GroupContext {
  type: SelectType;
  /** Selected value(s) */
  value: string | string[] | null;
  onToggle: (value: string) => void;
}

const SelectCardGroupContext = createContext<GroupContext | null>(null);

interface GroupBaseProps {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  children: ReactNode;
}

export type SelectCardGroupProps = GroupBaseProps &
  (
    | { type: "radio"; value: string | null; onValueChange: (value: string) => void }
    | { type: "checkbox"; value: string[]; onValueChange: (value: string[]) => void }
  );

/**
 * Groups SelectCards. Radio groups get arrow-key navigation (roving selection);
 * checkbox groups are plain Tab + Space.
 */
export function SelectCardGroup(props: SelectCardGroupProps) {
  const { type, value, className, children, ...rest } = props;
  const aria = {
    "aria-label": rest["aria-label"],
    "aria-labelledby": rest["aria-labelledby"],
  };

  function onToggle(v: string) {
    if (props.type === "radio") {
      props.onValueChange(v);
      return;
    }
    const next = props.value.includes(v)
      ? props.value.filter((x) => x !== v)
      : [...props.value, v];
    props.onValueChange(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (type !== "radio") return;
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const backward = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !backward) return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'),
    );
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIdx =
      idx === -1 ? 0 : (idx + (forward ? 1 : -1) + items.length) % items.length;
    e.preventDefault();
    items[nextIdx].focus();
    items[nextIdx].click();
  }

  return (
    <SelectCardGroupContext.Provider value={{ type, value, onToggle }}>
      <div
        role={type === "radio" ? "radiogroup" : "group"}
        className={className}
        onKeyDown={onKeyDown}
        {...aria}
      >
        {children}
      </div>
    </SelectCardGroupContext.Provider>
  );
}

export interface SelectCardProps {
  /** Required inside a SelectCardGroup. */
  value?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** Standalone mode only (outside a group). */
  type?: SelectType;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}

/**
 * Icon-based selection block. Renders a <button role="radio|checkbox" aria-checked>,
 * so Space/Enter toggle it natively and screen readers get the right semantics.
 */
export function SelectCard({
  value,
  title,
  description,
  icon,
  disabled = false,
  className,
  type: typeProp = "radio",
  selected: selectedProp = false,
  onSelectedChange,
}: SelectCardProps) {
  const group = useContext(SelectCardGroupContext);
  const type = group?.type ?? typeProp;

  let selected = selectedProp;
  if (group) {
    selected = Array.isArray(group.value)
      ? group.value.includes(value ?? "")
      : group.value === value;
  }

  // Radio roving tabindex: when something in the group is selected only that
  // card is in the tab order; with no selection every card is reachable.
  const groupHasSelection = group
    ? Array.isArray(group.value)
      ? group.value.length > 0
      : group.value != null && group.value !== ""
    : true;
  const tabIndex = type === "radio" && group && groupHasSelection && !selected ? -1 : 0;

  function onClick() {
    if (disabled) return;
    if (group) {
      group.onToggle(value ?? "");
      return;
    }
    // Standalone radio cannot be un-selected by clicking it again.
    if (type === "radio" && selected) return;
    onSelectedChange?.(type === "radio" ? true : !selected);
  }

  return (
    <button
      type="button"
      role={type}
      aria-checked={selected}
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onClick}
      data-selected={selected}
      className={cn(
        "relative flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-card border-[1.5px] px-3 pb-4 text-center transition-colors",
        // The top-right indicator (size-5 at top-2.5) must never touch the label: text-only cards
        // start their content below it (pt-9 = 36px > 10 + 20); with an icon the title is far below
        // the indicator and the icon sits in the middle, so the normal padding is enough.
        icon ? "pt-4" : "pt-9",
        // Selected cards are always fully opaque; only unselected disabled cards fade.
        selected
          ? "border-brand-600 bg-brand-50 disabled:cursor-not-allowed"
          : "border-line bg-surface hover:border-[#aeb7c6] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line",
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 items-center justify-center rounded-[9px] transition-colors",
            selected ? "bg-brand-600 text-white" : "bg-surface-muted text-ink-muted",
          )}
        >
          {icon}
        </span>
      )}
      <span className="max-w-full text-balance break-words text-base font-semibold leading-snug text-ink">{title}</span>
      {description && <span className="text-sm text-ink-muted">{description}</span>}
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-2.5 top-2.5 flex size-5 items-center justify-center border-[1.5px] text-white transition-colors",
          type === "radio" ? "rounded-full" : "rounded-[6px]",
          selected ? "border-brand-600 bg-brand-600" : "border-control bg-surface",
        )}
      >
        {selected && <CheckIcon width={12} height={12} strokeWidth={3} />}
      </span>
    </button>
  );
}
