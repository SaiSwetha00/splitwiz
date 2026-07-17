"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword, type AuthFormState } from "@/lib/auth/actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    forgotPassword,
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and we&apos;ll send a reset link
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {state.error}
        </p>
      )}

      {state.message ? (
        <p className="rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Email
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
