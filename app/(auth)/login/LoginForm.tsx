"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthFormState } from "@/lib/auth/actions";
import { GoogleButton } from "@/components/auth/GoogleButton";

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-sm outline-none placeholder:opacity-40";

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  borderColor: "rgba(99,102,241,0.2)",
  color: "#ffffff",
};

interface Props {
  urlMessage?: string;
  urlError?: string;
}

export function LoginForm({ urlMessage, urlError }: Props) {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    signIn,
    {}
  );

  const displayError = state.error ?? urlError;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          Welcome back
        </h1>
        <p style={{ marginTop: 6, fontSize: "0.85rem", color: "#888888" }}>
          Sign in to your SplitWiz account
        </p>
      </div>

      {urlMessage === "password-updated" && (
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
          Password updated. You can now sign in.
        </p>
      )}

      {displayError && (
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
          {displayError}
        </p>
      )}

      <GoogleButton label="Continue with Google" />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <hr style={{ flex: 1, borderColor: "rgba(99,102,241,0.15)" }} />
        <span style={{ fontSize: "0.75rem", color: "#888888" }}>or</span>
        <hr style={{ flex: 1, borderColor: "rgba(99,102,241,0.15)" }} />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#888888",
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
            style={inputStyle}
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#888888",
              }}
            >
              Password
            </span>
            <Link
              href="/forgot-password"
              style={{ fontSize: "0.75rem", color: "#6366f1", textDecoration: "none" }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            style={inputStyle}
            placeholder="••••••••"
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
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
          }}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#888888" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}
        >
          Sign up free
        </Link>
      </p>

      <style>{`
        .auth-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2) !important;
        }
      `}</style>
    </div>
  );
}
