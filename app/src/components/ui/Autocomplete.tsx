"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { FieldChrome, controlClasses, describedBy } from "./Field";
import { SpinnerIcon } from "./icons";
import { cn } from "./cn";

export interface AutocompleteOption<T = unknown> {
  /** Stable unique id (e.g. ISTAT code). */
  value: string;
  /** Main text shown in the list and, once picked, in the input. */
  label: string;
  /** Optional secondary text (e.g. "Provincia di Milano"). */
  description?: string;
  /** Arbitrary payload handed back to the caller. */
  data?: T;
}

export interface AutocompleteProps<T = unknown> {
  label: string;
  /** Async search callback. Called after the debounce once `minChars` is reached. */
  search: (query: string) => Promise<AutocompleteOption<T>[]>;
  /** Currently selected option (controlled). null = nothing selected. */
  value: AutocompleteOption<T> | null;
  /** Called with the picked option, or null when the user edits the text after picking. */
  onChange: (option: AutocompleteOption<T> | null) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  minChars?: number;
  debounceMs?: number;
  emptyText?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}

/**
 * ARIA 1.2 combobox with listbox popup. Arrow Up/Down move the active option,
 * Enter picks it, Escape closes the list, Tab closes it. Stale responses are dropped.
 */
export function Autocomplete<T = unknown>({
  label,
  search,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  disabled,
  minChars = 2,
  debounceMs = 200,
  emptyText = "Nessun risultato",
  id: idProp,
  name,
  autoComplete = "off",
}: AutocompleteProps<T>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-listbox`;

  const [query, setQuery] = useState(value?.label ?? "");
  const [options, setOptions] = useState<AutocompleteOption<T>[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);

  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef(search);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  // Keep the visible text in sync when the parent sets/clears the selection
  // (adjusting state during render, not in an effect).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) setQuery(value.label);
    else if (query === prevValue?.label) setQuery("");
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  function runSearch(q: string) {
    const current = ++requestId.current;
    setLoading(true);
    searchRef
      .current(q)
      .then((result) => {
        if (current !== requestId.current) return; // stale
        setOptions(result);
        setSearched(true);
        setActive(result.length > 0 ? 0 : -1);
        setOpen(true);
      })
      .catch(() => {
        if (current !== requestId.current) return;
        setOptions([]);
        setSearched(true);
        setActive(-1);
        setOpen(true);
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setQuery(text);
    if (value) onChange(null);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < minChars) {
      requestId.current++; // invalidate in-flight requests
      setLoading(false);
      setOptions([]);
      setSearched(false);
      setOpen(false);
      setActive(-1);
      return;
    }
    timer.current = setTimeout(() => runSearch(text.trim()), debounceMs);
  }

  function pick(option: AutocompleteOption<T>) {
    setQuery(option.label);
    setOpen(false);
    setActive(-1);
    onChange(option);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && options.length > 0) {
        setOpen(true);
        return;
      }
      if (options.length > 0) setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length > 0) setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && options[active]) {
        e.preventDefault();
        pick(options[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const showList = open && !disabled;
  const showEmpty = showList && searched && !loading && options.length === 0;
  const activeId = showList && active >= 0 ? `${id}-opt-${active}` : undefined;

  return (
    <FieldChrome id={id} label={label} hint={hint} error={error} required={required}>
      <div ref={wrapperRef} className="relative">
        <input
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (options.length > 0 && !value) setOpen(true);
          }}
          className={cn(controlClasses(!!error), loading && "pr-11")}
        />
        {loading && (
          <SpinnerIcon
            role="status"
            aria-hidden={false}
            aria-label="Ricerca in corso"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          hidden={!showList || options.length === 0}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-control border border-line bg-surface py-1 shadow-pop"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input keeps focus and blur never races the pick
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "cursor-pointer px-4 py-2.5",
                i === active ? "bg-brand-50 text-brand-900" : "text-ink",
              )}
            >
              <span className="block text-base font-medium">{o.label}</span>
              {o.description && (
                <span className="block text-sm text-ink-muted">{o.description}</span>
              )}
            </li>
          ))}
        </ul>
        {showEmpty && (
          <div
            role="status"
            className="absolute z-20 mt-1 w-full rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink-muted shadow-pop"
          >
            {emptyText}
          </div>
        )}
      </div>
    </FieldChrome>
  );
}
