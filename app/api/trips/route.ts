import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateUniqueCode } from "@/lib/tripService";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { logActivity } from "@/lib/activity";

// POST /api/trips — create a new trip with its initial members.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, currency, members } = (body ?? {}) as {
    name?: string;
    currency?: string;
    members?: unknown;
  };

  const tripName = typeof name === "string" ? name.trim() : "";
  if (!tripName) {
    return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
  }

  const cur =
    typeof currency === "string" && SUPPORTED_CURRENCIES.includes(currency)
      ? currency
      : "USD";

  const memberNames = Array.isArray(members)
    ? members
        .map((m) => (typeof m === "string" ? m.trim() : ""))
        .filter((m) => m.length > 0)
    : [];

  if (memberNames.length < 1) {
    return NextResponse.json(
      { error: "Add at least one member" },
      { status: 400 }
    );
  }

  const code = await generateUniqueCode();
  const supabase = await createClient();
  const admin = createAdminClient();

  // Verify auth — user client reads the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Use admin client for writes so missing GRANTs don't block.
  const { data: trip, error: tripError } = await admin
    .from("trips")
    .insert({ code, name: tripName, currency: cur, user_id: user?.id ?? null })
    .select("id, code")
    .single();

  if (tripError || !trip) {
    console.error("Trip insert error:", tripError);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }

  const { error: membersError } = await admin
    .from("members")
    .insert(memberNames.map((n) => ({ trip_id: trip.id, name: n })));

  if (membersError) {
    await admin.from("trips").delete().eq("id", trip.id);
    return NextResponse.json(
      { error: "Failed to create members" },
      { status: 500 }
    );
  }

  if (user) {
    logActivity({
      userId: user.id,
      tripId: trip.id,
      action: "trip_created",
      entityType: "trips",
      entityId: trip.id,
      metadata: { name: tripName, code: trip.code, currency: cur },
    });
  }

  return NextResponse.json({ code: trip.code }, { status: 201 });
}
