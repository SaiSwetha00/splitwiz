import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ trips: [], expenses: [], subscriptions: [], goals: [] });
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

  const like = `%${q}%`;

  const [tripsResult, expensesResult, subsResult, goalsResult] = await Promise.all([
    accessibleIds.length > 0
      ? admin
          .from("trips")
          .select("id, code, name, currency, created_at")
          .in("id", accessibleIds)
          .ilike("name", like)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    accessibleIds.length > 0
      ? admin
          .from("expenses")
          .select("id, title, description, amount_cents, amount, category, created_at, trip_id")
          .in("trip_id", accessibleIds)
          .or(`description.ilike.${like},title.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    admin
      .from("subscriptions")
      .select("id, name, amount_cents")
      .eq("user_id", user.id)
      .ilike("name", like)
      .limit(5),
    admin
      .from("savings_goals")
      .select("id, name, target_cents, current_cents")
      .eq("user_id", user.id)
      .ilike("name", like)
      .limit(5),
  ]);

  const expenseRows = (expensesResult.data ?? []);
  const expenseTripIds = [...new Set(expenseRows.map((e) => e.trip_id))];

  let tripMap = new Map<string, { code: string; name: string; currency: string }>();
  if (expenseTripIds.length > 0) {
    const { data: tripRows } = await admin
      .from("trips")
      .select("id, code, name, currency")
      .in("id", expenseTripIds);
    tripMap = new Map(
      (tripRows ?? []).map((t) => [t.id, { code: t.code, name: t.name, currency: t.currency }])
    );
  }

  const expenses = expenseRows.map((e) => ({
    id: e.id,
    title: (e.title ?? e.description ?? '') as string,
    amount_cents: (e.amount_cents ?? Math.round(Number(e.amount ?? 0) * 100)) as number,
    category: e.category as string | null,
    created_at: e.created_at as string,
    trip: tripMap.get(e.trip_id) ?? null,
  }));

  return NextResponse.json({
    trips: tripsResult.data ?? [],
    expenses,
    subscriptions: subsResult.data ?? [],
    goals: goalsResult.data ?? [],
  });
}
