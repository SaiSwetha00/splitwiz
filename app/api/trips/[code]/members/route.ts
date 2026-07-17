import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkTripWrite } from "@/lib/auth/tripAccess";
import { logActivity } from "@/lib/activity";

// POST /api/trips/:code/members — add a member to an existing trip.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name =
    typeof (body as { name?: unknown })?.name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: member, error } = await supabase
    .from("members")
    .insert({ trip_id: trip.id, name })
    .select("id, name")
    .single();

  if (error || !member) {
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }

  if (trip.user_id && access.userId) {
    logActivity({
      userId: access.userId,
      tripId: trip.id,
      action: "member_added",
      entityType: "members",
      entityId: member.id,
      metadata: { name: member.name },
    });
  }

  return NextResponse.json({ id: member.id, name: member.name }, { status: 201 });
}
