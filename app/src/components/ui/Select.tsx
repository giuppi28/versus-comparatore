"use client";

import { useId, type Ref, type SelectHTMLAttributes } from "react";
import { FieldChrome, controlClasses, describedBy } from "./Field";
import { ChevronDownIcon } from "./icons";
import { cn } from "./cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  options: SelectOption[];
  /** Renders a disabled empty first option, e.g. "Seleziona…". */
  placeholder?: string;
  hint?: string;
  error?: string;
  id?: string;
  ref?: Ref<HTMLSelectElement>;
}

/** Native <select> (best mobile UX + a11y) with the VERSUS look. */
export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  id: idProp,
  required,
  className,
  ref,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldChrome id={id} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(controlClasses(!!error), "appearance-none pr-11", className)}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </FieldChrome>
  );
}
