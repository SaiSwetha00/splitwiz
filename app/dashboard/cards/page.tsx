import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CardsPageClient } from "@/components/CardsPageClient";
import type { PaymentCard } from "@/types/cards";

export const metadata = { title: "Cards — Splitwiz" };

export default async function CardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: cards } = await admin
    .from("payment_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return <CardsPageClient initialCards={(cards ?? []) as PaymentCard[]} />;
}
