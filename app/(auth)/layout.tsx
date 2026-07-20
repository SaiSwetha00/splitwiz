import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--background)",
      }}
    >
      {/* Left decorative panel */}
      <div
        style={{
          flex: 1,
          display: "none",
          flexDirection: "column",
          justifyContent: "center",
          padding: "3rem",
          position: "relative",
          overflow: "hidden",
          background: "var(--background)",
        }}
        className="auth-left-panel"
      >
        {/* Background glow */}
        <div aria-hidden style={{ position: "absolute", top: "20%", left: "30%", width: 400, height: 400, background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div aria-hidden style={{ position: "absolute", bottom: "10%", right: "20%", width: 300, height: 300, background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ marginBottom: "3rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              textDecoration: "none", color: "#fff",
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 26 26" fill="none">
              <path d="M13 1.5l10 5.75v11.5L13 24.5 3 18.75V7.25L13 1.5z" fill="url(#authHexGrad)" />
              <defs>
                <linearGradient id="authHexGrad" x1="3" y1="1.5" x2="23" y2="24.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <text x="13" y="17.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="Clash Display, sans-serif" letterSpacing="-0.5">W</text>
            </svg>
            SplitWiz
          </Link>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: "3rem", maxWidth: 380 }}>
          <h2
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: "2.25rem",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.04em",
              lineHeight: 1.2,
              margin: "0 0 16px",
            }}
          >
            Split expenses,<br />
            <span style={{ color: "#6366f1" }}>not friendships</span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "#94a3b8", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            Track shared expenses across trips and groups. Know exactly who owes what — instantly.
          </p>
        </div>

        {/* Floating glass preview cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 340 }}>
          {/* Card 1: Trip */}
          <div style={{
            background: "rgba(15,15,26,0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #0e7490, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>Bali Trip 2024</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: "#94a3b8", margin: "2px 0 0" }}>4 members · 12 expenses</p>
            </div>
            <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 15, fontWeight: 700, color: "#45D881", flexShrink: 0 }}>₹24,500</span>
          </div>

          {/* Card 2: Balance */}
          <div style={{
            background: "rgba(15,15,26,0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(69,216,129,0.15)",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #065f46, #45D881)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>Net balance</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: "#94a3b8", margin: "2px 0 0" }}>Owed to you</p>
            </div>
            <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 15, fontWeight: 700, color: "#45D881" }}>+₹3,200</span>
          </div>

          {/* Card 3: Settled */}
          <div style={{
            background: "rgba(15,15,26,0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #3730a3, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>All settled up!</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: "#94a3b8", margin: "2px 0 0" }}>Goa weekend trip</p>
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#45D881", background: "rgba(69,216,129,0.12)", border: "1px solid rgba(69,216,129,0.2)", borderRadius: 6, padding: "2px 8px" }}>✓ Done</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ marginTop: "2rem", display: "flex", gap: 32 }}>
          {[
            { label: "Trips tracked", value: "500K+" },
            { label: "Settled", value: "$2M+" },
            { label: "Always free", value: "100%" },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontFamily: "'Clash Display', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "#6366f1", margin: "0 0 2px" }}>{s.value}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94a3b8", margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form panel */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Mobile-only logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "1.75rem",
            textDecoration: "none",
            color: "var(--foreground)",
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
          className="auth-mobile-logo"
        >
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
            <path d="M13 1.5l10 5.75v11.5L13 24.5 3 18.75V7.25L13 1.5z" fill="url(#mobileHexGrad)" />
            <defs>
              <linearGradient id="mobileHexGrad" x1="3" y1="1.5" x2="23" y2="24.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <text x="13" y="17.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="Clash Display, sans-serif" letterSpacing="-0.5">W</text>
          </svg>
          SplitWiz
        </Link>

        {/* Glass form card */}
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "var(--auth-card-bg)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--auth-card-border)",
            borderRadius: "1.25rem",
            padding: "2rem",
            boxShadow: "var(--auth-card-shadow)",
          }}
        >
          {children}
        </div>
      </div>

      {/* Ambient glows */}
      <div aria-hidden style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <style>{`
        @media (min-width: 900px) {
          .auth-left-panel { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
