/** Inline error for a SelectCard group (text inputs show theirs through the Input chrome). */
export function GroupError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

export function GroupLabel({ id, children, required }: { id: string; children: React.ReactNode; required?: boolean }) {
  return (
    <p id={id} className="mb-2 text-sm font-semibold text-ink">
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-danger">
          *
        </span>
      )}
    </p>
  );
}
