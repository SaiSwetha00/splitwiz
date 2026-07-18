import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { AiAssistantClient } from "@/components/AiAssistantClient";

export const metadata = { title: "AI Assistant — Splitwiz" };

export default async function AiAssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName: string =
    user.user_metadata?.display_name ??
    user.email?.split("@")[0] ??
    "there";

  const admin = createAdminClient();

  const [tripsResult, transactionsResult] = await Promise.all([
    admin.from("trips").select("id, status").eq("user_id", user.id),
    admin.from("transactions").select("type, amount, currency").eq("user_id", user.id),
  ]);

  const trips = tripsResult.data ?? [];
  const tripsCount = trips.length;
  const activeTripsCount = trips.filter((t) => t.status === "active").length;

  const transactions = transactionsResult.data ?? [];
  const netBalance = transactions.reduce((sum, t) => {
    const isCredit = t.type === "credit" || t.type === "income";
    return sum + (isCredit ? t.amount : -t.amount);
  }, 0);

  const currency =
    transactions.find((t) => t.currency)?.currency ?? "INR";

  return (
    <AiAssistantClient
      displayName={displayName}
      initialContext={{
        tripsCount,
        activeTripsCount,
        netBalance,
        currency,
      }}
    />
  );
}
