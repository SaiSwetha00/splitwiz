import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ThemeApplier } from "@/components/ThemeApplier";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallBanner } from "@/components/InstallBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PushPermissionBanner } from "@/components/PushPermissionBanner";
import { PageDecorator } from "@/components/PageDecorator";

interface DashboardShellProps {
  displayName: string;
  email: string;
  theme: string;
  children: React.ReactNode;
}

// Server component — no client boundary at the layout root.
// Mobile sidebar state lives in Sidebar; TopBar triggers it via custom event.
export function DashboardShell({ displayName, email, theme, children }: DashboardShellProps) {
  return (
    <>
      <ThemeApplier theme={theme} />
      <PageDecorator />
      <ServiceWorkerRegistration />
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <Sidebar displayName={displayName} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar displayName={displayName} email={email} theme={theme} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileTabBar />
      <InstallBanner />
      <PushPermissionBanner />
    </>
  );
}
