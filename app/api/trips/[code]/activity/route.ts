import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ code: string }> };

// GET /api/trips/:code/activity — activity log for a trip (last 50 entries).
export async function GET(_request: Request, { params }: RouteParams) {
  const { code } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Owned trips: require auth + at least viewer access.
  if (trip.user_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    if (trip.user_id !== user.id) {
      const { data: collab } = await admin
        .from("trip_collaborators")
        .select("role")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!collab) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
  }

  const { data: logs } = await admin
    .from("activity_logs")
    .select(
      "id, user_id, action, entity_type, entity_id, metadata, created_at"
    )
    .eq("trip_id", trip.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Enrich with actor display names.
  const userIds = [
    ...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean) as string[]),
  ];

  let profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? "Someone"])
    );
  }

  const enriched = (logs ?? []).map((l) => ({
    ...l,
    actorName: l.user_id
      ? (profileMap.get(l.user_id) ?? "Someone")
      : "Anonymous",
  }));

  return NextResponse.json({ logs: enriched });
}
