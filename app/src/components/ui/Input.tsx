"use client";

import { useId, type InputHTMLAttributes, type Ref } from "react";
import { FieldChrome, controlClasses, describedBy } from "./Field";
import { cn } from "./cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  /** Inline error message (Italian). Presence marks the field invalid. */
  error?: string;
  id?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  label,
  hint,
  error,
  id: idProp,
  required,
  className,
  ref,
  ...rest
}: InputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldChrome id={id} label={label} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses(!!error), className)}
        {...rest}
      />
    </FieldChrome>
  );
}
