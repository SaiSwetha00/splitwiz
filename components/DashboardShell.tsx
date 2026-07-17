"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ThemeApplier } from "@/components/ThemeApplier";

interface DashboardShellProps {
  displayName: string;
  email: string;
  theme: string;
  children: React.ReactNode;
}

export function DashboardShell({ displayName, email, theme, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <ThemeApplier theme={theme} />
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
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
      </div>
    </>
  );
}
