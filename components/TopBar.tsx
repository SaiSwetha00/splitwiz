"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileMenu } from "@/components/ProfileMenu";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/analytics": "Analytics",
  "/dashboard/trips": "Trips",
  "/dashboard/reports": "Reports",
  "/dashboard/cards": "Cards",
  "/dashboard/transactions": "Transactions",
  "/dashboard/budgets": "Budgets",
  "/dashboard/savings": "Savings",
  "/dashboard/subscriptions": "Subscriptions",
  "/dashboard/ai-assistant": "AI Assistant",
  "/dashboard/profile": "Profile",
  "/dashboard/notifications": "Notifications",
  "/dashboard/settings": "Settings",
  "/dashboard/trips/new": "New Trip",
};

const PAGE_ACCENTS: Record<string, string> = {
  "/dashboard": "#6366f1",
  "/dashboard/trips": "#8b5cf6",
  "/dashboard/analytics": "#06b6d4",
  "/dashboard/reports": "#f59e0b",
  "/dashboard/cards": "#3b82f6",
  "/dashboard/transactions": "#10b981",
  "/dashboard/budgets": "#f43f5e",
  "/dashboard/savings": "#10b981",
  "/dashboard/subscriptions": "#7c3aed",
  "/dashboard/ai-assistant": "#6366f1",
  "/dashboard/profile": "#06b6d4",
  "/dashboard/notifications": "#6366f1",
  "/dashboard/settings": "#64748b",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : "Dashboard";
}

function getAccent(pathname: string): string {
  if (PAGE_ACCENTS[pathname]) return PAGE_ACCENTS[pathname];
  const match = Object.keys(PAGE_ACCENTS)
    .filter((k) => k !== "/dashboard" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_ACCENTS[match] : "#6366f1";
}

interface TopBarProps {
  displayName: string;
  email: string;
  theme: string;
}

export function TopBar({ displayName, email, theme }: TopBarProps) {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const accent = getAccent(pathname);

  return (
    <header
      style={{
        height: 54,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: 12,
        background: "rgba(9, 9, 18, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Left: hamburger + page title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("sidebar:toggle"))}
          aria-label="Toggle sidebar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.2s, color 0.2s",
          }}
          className="md:hidden topbar-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Page title with accent underline */}
        <div style={{ position: "relative", display: "inline-flex", flexDirection: "column" }}>
          <h1
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </h1>
          {/* Accent underline bar */}
          <span
            style={{
              position: "absolute",
              bottom: -3,
              left: 0,
              width: "100%",
              height: 2,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${accent} 0%, ${accent}40 100%)`,
              boxShadow: `0 0 8px ${accent}60`,
            }}
          />
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <ThemeToggle initialTheme={theme} />
        <NotificationBell />
        <ProfileMenu displayName={displayName} email={email} />
      </div>

      <style>{`
        .topbar-btn:hover {
          background: rgba(255,255,255,0.07) !important;
          color: #ffffff !important;
        }
      `}</style>
    </header>
  );
}
