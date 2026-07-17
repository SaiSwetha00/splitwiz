"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-20 text-center">
      <p className="mb-4 text-4xl">⚠️</p>
      <p className="text-lg font-semibold">Dashboard error</p>
      <p className="mt-2 text-sm text-muted">
        Something went wrong loading your dashboard. Please try again.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-muted/60">Error ID: {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Retry
        </button>
        <Link
          href="/"
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
