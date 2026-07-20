"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

export function getPageAccent(pathname: string): string {
  // Match exact or prefix (for nested routes like /dashboard/trips/[id])
  if (PAGE_ACCENTS[pathname]) return PAGE_ACCENTS[pathname];
  const prefix = Object.keys(PAGE_ACCENTS)
    .filter((k) => k !== "/dashboard" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PAGE_ACCENTS[prefix] : "#6366f1";
}

export function PageDecorator() {
  const pathname = usePathname();

  useEffect(() => {
    const accent = getPageAccent(pathname);
    document.documentElement.style.setProperty("--page-accent", accent);

    const main = document.querySelector("main");
    if (main) main.setAttribute("data-page", pathname);

    return () => {
      document.documentElement.style.removeProperty("--page-accent");
    };
  }, [pathname]);

  return null;
}
