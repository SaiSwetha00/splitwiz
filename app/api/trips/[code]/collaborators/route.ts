import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTripWrite } from "@/lib/auth/tripAccess";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";

// GET /api/trips/:code/collaborators — list collaborators with profiles.
// Requires the caller to be a collaborator or the trip creator.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Anonymous trips have no collaborators.
  if (!trip.user_id) {
    return NextResponse.json({ collaborators: [] });
  }

  // Caller must be authenticated and be a collaborator (or the creator).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const isCreator = trip.user_id === user.id;
  if (!isCreator) {
    const { data: collab } = await supabase
      .from("trip_collaborators")
      .select("role")
      .eq("trip_id", trip.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!collab) {
      return NextResponse.json(
        { error: "You are not a member of this trip" },
        { status: 403 }
      );
    }
  }

  const { data: collaborators } = await supabase
    .from("trip_collaborators")
    .select("id, user_id, role, joined_at")
    .eq("trip_id", trip.id)
    .order("joined_at", { ascending: true });

  if (!collaborators?.length) {
    return NextResponse.json({ collaborators: [] });
  }

  // Fetch profiles for display names.
  const userIds = collaborators.map((c) => c.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const result = collaborators.map((c) => ({
    id: c.id,
    userId: c.user_id,
    role: c.role,
    joinedAt: c.joined_at,
    profile: profileMap.get(c.user_id) ?? null,
  }));

  return NextResponse.json({ collaborators: result });
}

// POST /api/trips/:code/collaborators — add a collaborator by email.
// Owner only.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id, name, code")
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

  const { email, role } = (body ?? {}) as {
    email?: string;
    role?: string;
  };

  const inviteEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!inviteEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const inviteRole = role === "viewer" ? "viewer" : "editor";

  // Look up the user by email using an RPC that queries auth.users.
  const adminClient = createAdminClient();
  const { data: inviteeId, error: lookupError } = await adminClient.rpc(
    "lookup_user_by_email",
    { p_email: inviteEmail }
  );

  if (lookupError || !inviteeId) {
    return NextResponse.json(
      {
        error:
          "No account found with that email. They need to sign up for SplitWiz first.",
      },
      { status: 404 }
    );
  }

  // Prevent adding yourself.
  if (inviteeId === access.userId) {
    return NextResponse.json(
      { error: "You are already the owner of this trip" },
      { status: 409 }
    );
  }

  const { error: insertError } = await supabase
    .from("trip_collaborators")
    .insert({ trip_id: trip.id, user_id: inviteeId, role: inviteRole });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This person is already a collaborator on this trip" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add collaborator" },
      { status: 500 }
    );
  }

  if (access.userId) {
    logActivity({
      userId: access.userId,
      tripId: trip.id,
      action: "collaborator_added",
      entityType: "trip_collaborators",
      entityId: inviteeId,
      metadata: { role: inviteRole },
    });
  }

  void createNotification({
    userId: inviteeId,
    type: "trip_invite",
    title: `You were added to "${trip.name}"`,
    body: `You can now collaborate on this trip as a${inviteRole === "editor" ? "n" : ""} ${inviteRole}.`,
    actionUrl: `/trip/${trip.code}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
