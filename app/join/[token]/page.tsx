import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ token: string }> };

export default async function JoinTripPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/join/${token}`);
  }

  const admin = createAdminClient();

  // Look up the invite
  const { data: invite } = await admin
    .from("trip_invites")
    .select("trip_id, expires_at")
    .eq("token", token)
    .single();

  if (!invite) redirect("/dashboard/trips?join=invalid");

  const now = new Date();
  if (new Date(invite.expires_at as string) < now) {
    redirect("/dashboard/trips?join=expired");
  }

  const tripId = invite.trip_id as string;

  // Check if already a member
  const { data: existingMember } = await admin
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) {
    redirect(`/dashboard/trips/${tripId}?join=already`);
  }

  // Get user profile for name
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const name = (profile?.display_name as string | null) ?? user.email?.split("@")[0] ?? "Member";

  // Join the trip
  await admin.from("trip_members").insert({
    trip_id: tripId,
    user_id: user.id,
    name,
    email: user.email,
    is_creator: false,
  });

  redirect(`/dashboard/trips/${tripId}?join=success`);
}
