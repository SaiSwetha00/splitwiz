import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkTripWrite } from "@/lib/auth/tripAccess";

// PATCH /api/trips/:code/collaborators/:userId — change a collaborator's role.
// Owner only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; userId: string }> }
) {
  const { code, userId: targetUserId } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null, "owner");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role } = (body ?? {}) as { role?: string };
  if (role !== "editor" && role !== "viewer") {
    return NextResponse.json(
      { error: "Role must be 'editor' or 'viewer'" },
      { status: 400 }
    );
  }

  // Cannot change the trip creator's role via this endpoint.
  if (trip.user_id === targetUserId) {
    return NextResponse.json(
      { error: "Cannot change the trip owner's role" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("trip_collaborators")
    .update({ role })
    .eq("trip_id", trip.id)
    .eq("user_id", targetUserId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/trips/:code/collaborators/:userId — remove a collaborator.
// Owner only. Cannot remove the trip creator.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; userId: string }> }
) {
  const { code, userId: targetUserId } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null, "owner");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Cannot remove the trip creator (they own the trip via trips.user_id).
  if (trip.user_id === targetUserId) {
    return NextResponse.json(
      { error: "Cannot remove the trip owner" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("trip_collaborators")
    .delete()
    .eq("trip_id", trip.id)
    .eq("user_id", targetUserId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
