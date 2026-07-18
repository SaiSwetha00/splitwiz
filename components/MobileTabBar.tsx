"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TripsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ── Quick Add Sheet ───────────────────────────────────────────────────────────

function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  function go(path: string) {
    onClose();
    router.push(path);
  }

  const options = [
    { icon: "➕", label: "Add Expense", sub: "Log a new expense to a trip", path: "/dashboard/trips" },
    { icon: "✈️", label: "New Trip",    sub: "Create a group trip",           path: "/dashboard/trips/new" },
    { icon: "📷", label: "Scan Receipt", sub: "Auto-fill with camera",        path: "/dashboard/trips" },
    { icon: "🎯", label: "Savings Goal", sub: "Track a savings target",       path: "/dashboard/savings" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        style={{ backdropFilter: "blur(4px)" }}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-surface pb-safe"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
        <p className="px-5 pb-3 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          What do you want to add?
        </p>
        <div className="grid grid-cols-2 gap-3 px-5 pb-6">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => go(opt.path)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-4 text-center transition active:scale-95"
            >
              <span className="text-3xl">{opt.icon}</span>
              <div>
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs text-muted">{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Tab definition ────────────────────────────────────────────────────────────

const TABS = [
  { href: "/dashboard",            label: "Home",      icon: HomeIcon     },
  { href: "/dashboard/trips",      label: "Trips",     icon: TripsIcon    },
  { href: null,                    label: "",          icon: null         }, // center "+" placeholder
  { href: "/dashboard/analytics",  label: "Analytics", icon: AnalyticsIcon },
  { href: "/dashboard/profile",    label: "Profile",   icon: ProfileIcon  },
] as const;

// ── Mobile Tab Bar ────────────────────────────────────────────────────────────

export function MobileTabBar() {
  const pathname = usePathname();
  const [showSheet, setShowSheet] = useState(false);

  function isActive(href: string | null): boolean {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      {showSheet && <QuickAddSheet onClose={() => setShowSheet(false)} />}

      {/* Tab bar — visible only on mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-end md:hidden"
        style={{
          height: 64,
          background: "rgba(var(--surface-rgb, 255 255 255) / 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map((tab, i) => {
          // Center "+" button
          if (tab.href === null) {
            return (
              <div key="plus" className="flex flex-1 justify-center" style={{ marginBottom: 10 }}>
                <button
                  onClick={() => setShowSheet(true)}
                  className="flex items-center justify-center rounded-full text-white shadow-lg transition active:scale-90"
                  style={{
                    width: 56,
                    height: 56,
                    background: "linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
                  }}
                  aria-label="Quick add"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            );
          }

          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href ?? i}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 pb-1 pt-2 transition-transform active:scale-90"
              style={{
                color: active ? "var(--accent)" : "var(--muted)",
                textDecoration: "none",
              }}
            >
              <Icon />
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: active ? "var(--accent)" : "var(--muted)" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer so content isn't hidden behind the tab bar on mobile */}
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  );
}
