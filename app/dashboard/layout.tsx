import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/DashboardNav";
import { ThemeApplier } from "@/components/ThemeApplier";

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

  const { data: settings } = await supabase
    .from("user_settings")
    .select("theme")
    .eq("id", user.id)
    .maybeSingle();

  const theme = settings?.theme ?? "system";

  return (
    <div className="flex flex-1 flex-col">
      <ThemeApplier theme={theme} />
      <DashboardNav />
      {children}
    </div>
  );
}
