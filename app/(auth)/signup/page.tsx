"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import { GoogleButton } from "@/components/auth/GoogleButton";

const inputClass =
  "auth-input w-full rounded-lg border px-3 py-2.5 text-sm outline-none";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    signUp,
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--foreground)",
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          Create an account
        </h1>
        <p style={{ marginTop: 6, fontSize: "0.85rem", color: "var(--muted)" }}>
          Start splitting expenses with SplitWiz
        </p>
      </div>

      {state.error && (
        <p
          style={{
            borderRadius: 10,
            border: "1px solid rgba(254,21,20,0.3)",
            background: "rgba(254,21,20,0.08)",
            padding: "0.65rem 1rem",
            fontSize: "0.82rem",
            color: "#FE1514",
          }}
        >
          {state.error}
        </p>
      )}

      {state.message && (
        <p
          style={{
            borderRadius: 10,
            border: "1px solid rgba(69,216,129,0.3)",
            background: "rgba(69,216,129,0.08)",
            padding: "0.65rem 1rem",
            fontSize: "0.82rem",
            color: "#45D881",
          }}
        >
          {state.message}
        </p>
      )}

      {!state.message && (
        <>
          <GoogleButton label="Sign up with Google" />

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <hr style={{ flex: 1, borderColor: "var(--auth-divider)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>or</span>
            <hr style={{ flex: 1, borderColor: "var(--auth-divider)" }} />
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--muted)",
                }}
              >
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
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--muted)",
                }}
              >
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
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--muted)",
                }}
              >
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
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.8rem 1rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
              }}
            >
              {isPending ? "Creating account…" : "Create account"}
            </button>
          </form>
        </>
      )}

      <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link
          href="/login"
          style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
