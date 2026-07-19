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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "var(--background)",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: "2rem",
          textDecoration: "none",
          color: "#ffffff",
          fontFamily: "'Clash Display', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          textShadow: "0 0 30px rgba(99,102,241,0.5)",
        }}
      >
        <span style={{ fontSize: 26 }}>💸</span>
        SplitWiz
      </Link>

      {/* Glass card */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(17,17,32,0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "1.25rem",
          padding: "2rem",
          boxShadow:
            "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.05), 0 0 60px rgba(99,102,241,0.04)",
        }}
      >
        {children}
      </div>

      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </div>
  );
}
