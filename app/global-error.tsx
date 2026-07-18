"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui,-apple-system,sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "12px",
          textAlign: "center",
          padding: "2rem",
          background: "#f6f7f9",
          color: "#171717",
        }}
      >
        <p style={{ fontSize: "2.5rem" }}>⚠️</p>
        <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>Something went wrong</p>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error boundary must not depend on the Next.js router, which may itself be broken */}
          <a
            href="/"
            style={{
              padding: "0.625rem 1.5rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.75rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none",
              color: "#171717",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
