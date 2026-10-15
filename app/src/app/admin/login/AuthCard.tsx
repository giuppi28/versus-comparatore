import type { ReactNode } from "react";
import { VersusLogo } from "@/components/brand";
import { Card } from "@/components/ui";

/** Centered card shell shared by the login / MFA screens. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <VersusLogo className="h-12 w-auto" />
        <Card padding="lg" className="w-full">
          <h1 className="heading-wide text-title">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </main>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      data-testid="form-error"
      className="rounded-control border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
    >
      {message}
    </p>
  );
}
