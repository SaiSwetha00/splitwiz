"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊", exact: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈", exact: false },
  { href: "/dashboard/budgets", label: "Budgets", icon: "💰", exact: false },
  { href: "/dashboard/savings", label: "Savings", icon: "🏦", exact: false },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: "🔄", exact: false },
  { href: "/dashboard/notifications", label: "Notifications", icon: "🔔", exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️", exact: false },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-1">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
