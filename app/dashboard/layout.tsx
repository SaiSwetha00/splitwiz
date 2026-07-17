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

  return (
    <DashboardShell
      displayName={displayName}
      email={user.email ?? ""}
      theme={theme}
    >
      {children}
    </DashboardShell>
  );
}
