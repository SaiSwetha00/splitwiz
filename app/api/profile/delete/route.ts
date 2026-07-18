import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase, admin } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { confirmation } = (body ?? {}) as { confirmation?: string };

  if (confirmation !== "DELETE") {
    return NextResponse.json(
      { error: 'Please send { "confirmation": "DELETE" } to confirm account deletion.' },
      { status: 400 }
    );
  }

  // 1. Get tripIds
  const { data: tripRows } = await admin
    .from("trips")
    .select("id")
    .eq("user_id", user.id);

  const tripIds = (tripRows ?? []).map((t) => t.id);

  // 2. Get expenseIds
  let expenseIds: string[] = [];
  if (tripIds.length > 0) {
    const { data: expenseRows } = await admin
      .from("expenses")
      .select("id")
      .in("trip_id", tripIds);
    expenseIds = (expenseRows ?? []).map((e) => e.id);
  }

  // 3. Delete expense_splits
  if (expenseIds.length > 0) {
    await admin.from("expense_splits").delete().in("expense_id", expenseIds);
  }

  // 4. Delete expenses, settlements, trip_members by tripIds
  if (tripIds.length > 0) {
    await Promise.all([
      admin.from("expenses").delete().in("trip_id", tripIds),
      admin.from("settlements").delete().in("trip_id", tripIds),
      admin.from("trip_members").delete().in("trip_id", tripIds),
    ]);
  }

  // 5. Delete trips
  if (tripIds.length > 0) {
    await admin.from("trips").delete().eq("user_id", user.id);
  }

  // 6. Delete user-level data
  await Promise.all([
    admin.from("budgets").delete().eq("user_id", user.id),
    admin.from("savings_goals").delete().eq("user_id", user.id),
    admin.from("subscriptions").delete().eq("user_id", user.id),
    admin.from("user_settings").delete().eq("id", user.id),
    admin.from("profiles").delete().eq("id", user.id),
  ]);

  // 7. Sign out
  await supabase.auth.signOut();

  // 8. Delete auth user
  await admin.auth.admin.deleteUser(user.id);

  return NextResponse.json({ ok: true });
}
