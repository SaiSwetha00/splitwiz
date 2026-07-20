"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";

// ─── Page-specific accent colors ─────────────────────────────────────────────

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

function getAccentForPath(pathname: string): string {
  if (PAGE_ACCENTS[pathname]) return PAGE_ACCENTS[pathname];
  const match = Object.keys(PAGE_ACCENTS)
    .filter((k) => k !== "/dashboard" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_ACCENTS[match] : "#6366f1";
}

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  badge?: string;
}

const NAV_MAIN: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/trips",
    label: "Trips",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/dashboard/cards",
    label: "Cards",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/transactions",
    label: "Transactions",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/budgets",
    label: "Budgets",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2v-3" />
        <path d="M16 12h6" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/dashboard/savings",
    label: "Savings",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    href: "/dashboard/subscriptions",
    label: "Subscriptions",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <polyline points="23 20 23 14 17 14" />
        <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
      </svg>
    ),
  },
  {
    href: "/dashboard/ai-assistant",
    label: "AI Assistant",
    badge: "New",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.45 4.45L18 9l-4.55 1.55L12 15l-1.45-4.45L6 9l4.55-1.55L12 3z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
        <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
      </svg>
    ),
  },
];

const NAV_BOTTOM: NavItem[] = [
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function HexLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path
        d="M13 1.5l10 5.75v11.5L13 24.5 3 18.75V7.25L13 1.5z"
        fill="url(#hexGrad)"
      />
      <defs>
        <linearGradient id="hexGrad" x1="3" y1="1.5" x2="23" y2="24.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <text
        x="13"
        y="17.5"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="700"
        fontFamily="'Clash Display', sans-serif"
        letterSpacing="-0.5"
      >
        W
      </text>
    </svg>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({ item, active, pageAccent }: { item: NavItem; active: boolean; pageAccent: string }) {
  const itemAccent = getAccentForPath(item.href);

  return (
    <Link
      href={item.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 9px 6px 7px",
        borderRadius: 8,
        marginBottom: 1,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? "#ffffff" : "var(--sidebar-fg)",
        background: active ? `${itemAccent}14` : "transparent",
        textDecoration: "none",
        transition: "background 0.25s, color 0.2s, border-color 0.25s",
        letterSpacing: active ? "-0.01em" : "normal",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        borderLeft: `3px solid ${active ? itemAccent : "transparent"}`,
        paddingLeft: 6,
      }}
      data-active={active}
      data-accent={itemAccent}
    >
      <span
        style={{
          flexShrink: 0,
          color: active ? itemAccent : "var(--sidebar-fg)",
          opacity: active ? 1 : 0.55,
          transition: "color 0.2s, opacity 0.2s, filter 0.2s",
          filter: active ? `drop-shadow(0 0 5px ${itemAccent}80)` : "none",
        }}
      >
        {item.icon}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && !active && (
        <span className="sidebar-badge">{item.badge}</span>
      )}
      {active && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: itemAccent,
            flexShrink: 0,
            boxShadow: `0 0 8px ${itemAccent}`,
          }}
        />
      )}
    </Link>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

interface SidebarProps {
  displayName: string;
}

function SidebarContent({ displayName, onClose }: { displayName: string; onClose?: () => void }) {
  const pathname = usePathname();
  const pageAccent = getAccentForPath(pathname);

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div
      style={{
        width: 220,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        flexShrink: 0,
        overflow: "hidden",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "15px 13px 11px",
          borderBottom: "1px solid var(--sidebar-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            textDecoration: "none",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            fontFamily: "'Clash Display', sans-serif",
          }}
        >
          <HexLogo />
          <span style={{ background: "linear-gradient(135deg,#fff 40%,rgba(255,255,255,0.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SplitWiz
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--sidebar-fg)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* New Trip CTA */}
      <div style={{ padding: "11px 10px 5px" }}>
        <Link
          href="/dashboard/trips"
          className="sidebar-new-trip"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 9,
            background: `linear-gradient(135deg, ${pageAccent} 0%, ${pageAccent}cc 100%)`,
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "-0.01em",
            boxShadow: `0 3px 14px ${pageAccent}50`,
            fontFamily: "'DM Sans', sans-serif",
            width: "100%",
            boxSizing: "border-box",
            transition: "opacity 0.2s, transform 0.2s, box-shadow 0.2s",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          + New Trip
        </Link>
      </div>

      {/* Main Nav */}
      <nav
        style={{
          flex: 1,
          padding: "4px 7px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <p
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--sidebar-fg)",
            opacity: 0.4,
            padding: "10px 9px 5px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Workspace
        </p>
        {NAV_MAIN.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} pageAccent={pageAccent} />
        ))}

        <p
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--sidebar-fg)",
            opacity: 0.4,
            padding: "14px 9px 5px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Account
        </p>
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} pageAccent={pageAccent} />
        ))}
      </nav>

      {/* Footer user card */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--sidebar-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            position: "relative",
            flexShrink: 0,
          }}
        >
          <Avatar name={displayName} size={28} />
          <span
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#45D881",
              border: "1.5px solid var(--sidebar)",
              boxShadow: "0 0 5px #45D88180",
            }}
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--sidebar-fg-active)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {displayName}
          </p>
          <p
            style={{
              fontSize: 10.5,
              marginTop: 1,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              background: `linear-gradient(90deg, ${pageAccent}, ${pageAccent}bb)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Free plan
          </p>
        </div>
      </div>

      <style>{`
        [data-active="false"].sidebar-link-item:hover {
          background: var(--sidebar-hover) !important;
          color: #ffffff !important;
        }
        [data-active="false"].sidebar-link-item:hover span:first-child {
          opacity: 0.85 !important;
          color: #ffffff !important;
        }
        .sidebar-new-trip:hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }
        .sidebar-badge {
          font-size: 9px;
          font-weight: 700;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: #fff;
          padding: 1px 5px;
          border-radius: 6px;
          letter-spacing: 0.04em;
          animation: badgePulse 2.2s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        a[data-active="false"]:hover {
          background: rgba(255,255,255,0.04) !important;
          color: #ffffff !important;
        }
        a[data-active="false"]:hover > span:first-child {
          opacity: 0.8 !important;
          color: #ffffff !important;
          filter: none !important;
        }
      `}</style>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function Sidebar({ displayName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onToggle() { setMobileOpen((v) => !v); }
    window.addEventListener("sidebar:toggle", onToggle);
    return () => window.removeEventListener("sidebar:toggle", onToggle);
  }, []);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:block" style={{ height: "100%", flexShrink: 0 }}>
        <SidebarContent displayName={displayName} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 40,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 50,
              display: "flex",
            }}
          >
            <SidebarContent displayName={displayName} onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
