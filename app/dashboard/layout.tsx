import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [settingsResult, profileResult] = await Promise.all([
    supabase.from("user_settings").select("theme").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  const theme = settingsResult.data?.theme ?? "system";
  const displayName: string =
    profileResult.data?.display_name ??
    user.user_metadata?.display_name ??
    user.email?.split("@")[0] ??
    "Account";

  // Wrap in a server-rendered div so the async layout's Suspense boundary (B:0)
  // contains real server HTML — this ensures React streams $RC to reveal it.
  // If DashboardShell (a client component) were the direct root, React would mark
  // the boundary $~ and never send the reveal script, leaving the page blank.
  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      <DashboardShell
        displayName={displayName}
        email={user.email ?? ""}
        theme={theme}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
