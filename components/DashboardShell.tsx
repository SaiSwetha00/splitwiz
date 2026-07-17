"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

interface DashboardShellProps {
  displayName: string;
  email: string;
  theme: string;
  children: React.ReactNode;
}

export function DashboardShell({ displayName, email, theme, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") {
      root.dataset.theme = theme;
    } else {
      delete root.dataset.theme;
    }
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  return (
    <>
      <Sidebar
        displayName={displayName}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          displayName={displayName}
          email={email}
          theme={theme}
          onHamburger={() => setMobileOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </main>
      </div>
    </>
  );
}
