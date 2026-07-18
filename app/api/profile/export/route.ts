import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  // Fetch trips
  const { data: trips } = await admin
    .from("trips")
    .select("*")
    .eq("user_id", user.id);

  const tripIds = (trips ?? []).map((t) => t.id);

  // Fetch trip-related data and user-level data in parallel
  const [
    membersResult,
    expensesResult,
    settlementsResult,
    budgetsResult,
    savingsGoalsResult,
    subscriptionsResult,
  ] = await Promise.all([
    tripIds.length > 0
      ? admin.from("trip_members").select("*").in("trip_id", tripIds)
      : Promise.resolve({ data: [] }),
    tripIds.length > 0
      ? admin.from("expenses").select("*").in("trip_id", tripIds)
      : Promise.resolve({ data: [] }),
    tripIds.length > 0
      ? admin.from("settlements").select("*").in("trip_id", tripIds)
      : Promise.resolve({ data: [] }),
    admin.from("budgets").select("*").eq("user_id", user.id),
    admin.from("savings_goals").select("*").eq("user_id", user.id),
    admin.from("subscriptions").select("*").eq("user_id", user.id),
  ]);

  const expenses = expensesResult.data ?? [];
  const expenseIds = expenses.map((e) => e.id);

  // Fetch expense splits
  const { data: expenseSplits } = expenseIds.length > 0
    ? await admin.from("expense_splits").select("*").in("expense_id", expenseIds)
    : { data: [] };

  return NextResponse.json({
    trips: trips ?? [],
    members: membersResult.data ?? [],
    expenses,
    expense_splits: expenseSplits ?? [],
    settlements: settlementsResult.data ?? [],
    budgets: budgetsResult.data ?? [],
    savings_goals: savingsGoalsResult.data ?? [],
    subscriptions: subscriptionsResult.data ?? [],
    user_email: user.email,
    exported_at: new Date().toISOString(),
  });
}
