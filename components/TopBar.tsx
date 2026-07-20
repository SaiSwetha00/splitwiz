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

function getTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "Dashboard";
}

interface TopBarProps {
  displayName: string;
  email: string;
  theme: string;
}

export function TopBar({ displayName, email, theme }: TopBarProps) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: 12,
        background: "rgba(9, 9, 18, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
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
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            flexShrink: 0,
          }}
          className="md:hidden topbar-btn"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
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
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <ThemeToggle initialTheme={theme} />
        <NotificationBell />
        <ProfileMenu displayName={displayName} email={email} />
      </div>

      <style>{`
        .topbar-btn:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #ffffff !important;
        }
      `}</style>
    </header>
  );
}
