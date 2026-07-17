import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ trips: [], expenses: [] });
  }

  const admin = createAdminClient();

  const [ownTripsResult, collabResult] = await Promise.all([
    admin.from("trips").select("id").eq("user_id", user.id),
    admin.from("trip_collaborators").select("trip_id").eq("user_id", user.id),
  ]);

  const accessibleIds = [
    ...new Set([
      ...(ownTripsResult.data ?? []).map((t) => t.id),
      ...(collabResult.data ?? []).map((c) => c.trip_id),
    ]),
  ];

  if (accessibleIds.length === 0) {
    return NextResponse.json({ trips: [], expenses: [] });
  }

  const [tripsResult, expensesResult] = await Promise.all([
    admin
      .from("trips")
      .select("id, code, name, currency, created_at")
      .in("id", accessibleIds)
      .ilike("name", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("expenses")
      .select("id, description, amount_cents, category, created_at, trip_id")
      .in("trip_id", accessibleIds)
      .ilike("description", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const expenseTripIds = [
    ...new Set((expensesResult.data ?? []).map((e) => e.trip_id)),
  ];

  let tripMap = new Map<string, { code: string; name: string; currency: string }>();
  if (expenseTripIds.length > 0) {
    const { data: tripRows } = await admin
      .from("trips")
      .select("id, code, name, currency")
      .in("id", expenseTripIds);
    tripMap = new Map(
      (tripRows ?? []).map((t) => [
        t.id,
        { code: t.code, name: t.name, currency: t.currency },
      ])
    );
  }

  const expenses = (expensesResult.data ?? []).map((e) => ({
    id: e.id,
    description: e.description,
    amount_cents: e.amount_cents,
    category: e.category,
    created_at: e.created_at,
    trip: tripMap.get(e.trip_id) ?? null,
  }));

  return NextResponse.json({ trips: tripsResult.data ?? [], expenses });
}
