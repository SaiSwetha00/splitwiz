"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import { GoogleButton } from "@/components/auth/GoogleButton";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    signUp,
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="mt-1 text-sm text-muted">
          Start splitting expenses with Splitwiz
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {state.error}
        </p>
      )}

      {state.message && (
        <p className="rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">
          {state.message}
        </p>
      )}

      {!state.message && (
        <>
          <GoogleButton label="Sign up with Google" />

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-border" />
            <span className="text-xs text-muted">or</span>
            <hr className="flex-1 border-border" />
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Name
              </span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                className={inputClass}
                placeholder="Alex Smith"
              />
            </label>

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

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Password
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

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground disabled:opacity-60"
            >
              {isPending ? "Creating account…" : "Create account"}
            </button>
          </form>
        </>
      )}

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
