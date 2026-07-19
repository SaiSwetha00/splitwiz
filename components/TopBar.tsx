"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileMenu } from "@/components/ProfileMenu";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/analytics": "Analytics",
  "/dashboard/budgets": "Budgets",
  "/dashboard/savings": "Savings",
  "/dashboard/subscriptions": "Subscriptions",
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
      className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4"
      style={{ gap: 12, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("sidebar:toggle"))}
          aria-label="Toggle sidebar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-border hover:text-foreground md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <ThemeToggle initialTheme={theme} />
        <NotificationBell />
        <ProfileMenu displayName={displayName} email={email} />
      </div>
    </header>
  );
}
