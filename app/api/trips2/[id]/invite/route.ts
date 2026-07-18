import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Only trip owner can create invite
  const { data: trip } = await admin.from("trips").select("user_id, name").eq("id", tripId).single();
  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: "Only trip owner can create invite links" }, { status: 403 });
  }

  // Reuse a non-expired invite if one exists
  const { data: existing } = await admin
    .from("trip_invites")
    .select("token, expires_at")
    .eq("trip_id", tripId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ token: existing.token, expires_at: existing.expires_at });
  }

  const { data: invite, error } = await admin
    .from("trip_invites")
    .insert({ trip_id: tripId, created_by: user.id })
    .select("token, expires_at")
    .single();

  if (error || !invite) return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });

  return NextResponse.json({ token: invite.token, expires_at: invite.expires_at });
}
