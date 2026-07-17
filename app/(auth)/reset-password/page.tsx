"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthFormState } from "@/lib/auth/actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    resetPassword,
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">New password</h1>
        <p className="mt-1 text-sm text-muted">Choose a strong password</p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            New password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
            placeholder="At least 8 characters"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Confirm password
          </span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
            placeholder="Repeat your password"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground disabled:opacity-60"
        >
          {isPending ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
