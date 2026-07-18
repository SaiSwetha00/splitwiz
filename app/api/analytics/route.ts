import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const admin = createAdminClient();

  // User's default currency
  const { data: settings } = await admin
    .from("user_settings")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();

  const currency = settings?.default_currency ?? "USD";

  // All trips the user owns + collaborates on
  const [ownResult, collabResult] = await Promise.all([
    admin.from("trips").select("id, name, code, currency").eq("user_id", user.id),
    admin.from("trip_collaborators").select("trip_id").eq("user_id", user.id),
  ]);

  const allOwn = ownResult.data ?? [];
  const collabIds = (collabResult.data ?? []).map((c) => c.trip_id);

  // Collect other currencies for the note
  const allCurrencies = new Set(allOwn.map((t) => t.currency));
  const otherCurrencies = [...allCurrencies].filter((c) => c !== currency);

  // Trips in the primary currency
  const primaryOwnTrips = allOwn.filter((t) => t.currency === currency);

  let collabTrips: { id: string; name: string; code: string }[] = [];
  if (collabIds.length > 0) {
    const { data } = await admin
      .from("trips")
      .select("id, name, code, currency")
      .in("id", collabIds)
      .eq("currency", currency);
    collabTrips = data ?? [];
  }

  const allTrips = [...primaryOwnTrips, ...collabTrips];

  if (allTrips.length === 0) {
    return NextResponse.json({
      currency,
      monthlySpending: buildEmptyMonths(),
      categoryBreakdown: [],
      topTrips: [],
      budgetUtilization: [],
      totalSpent: 0,
      tripCount: 0,
      expenseCount: 0,
      otherCurrencies,
    });
  }

  const tripMap = new Map(allTrips.map((t) => [t.id, t]));
  const tripIds = allTrips.map((t) => t.id);

  // Expenses for these trips + budgets + categories (parallel)
  const [expensesResult, budgetsResult] = await Promise.all([
    admin
      .from("expenses")
      .select("id, trip_id, amount_cents, category, created_at")
      .in("trip_id", tripIds)
      .order("created_at", { ascending: true }),
    admin
      .from("budgets")
      .select("id, name, amount_cents, category_id, period, start_date, end_date")
      .eq("user_id", user.id),
  ]);

  const allExpenses = expensesResult.data ?? [];
  const budgets = budgetsResult.data ?? [];

  // Resolve category names for budgets
  const categoryIds = [
    ...new Set(budgets.map((b) => b.category_id).filter(Boolean) as string[]),
  ];
  let catNameMap = new Map<string, string>();
  if (categoryIds.length > 0) {
    const { data: cats } = await admin
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);
    catNameMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
  }

  // Monthly spending — last 6 months
  const months = buildEmptyMonths();
  for (const e of allExpenses) {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.total += e.amount_cents;
  }

  // Category breakdown
  const catMap = new Map<string, { total: number; count: number }>();
  for (const e of allExpenses) {
    const cat = e.category ?? "Uncategorized";
    const prev = catMap.get(cat) ?? { total: 0, count: 0 };
    catMap.set(cat, { total: prev.total + e.amount_cents, count: prev.count + 1 });
  }
  const categoryBreakdown = [...catMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Top trips by spend
  const tripTotals = new Map<string, number>();
  for (const e of allExpenses) {
    tripTotals.set(e.trip_id, (tripTotals.get(e.trip_id) ?? 0) + e.amount_cents);
  }
  const topTrips = [...tripTotals.entries()]
    .filter(([, total]) => total > 0)
    .map(([id, total]) => ({ ...(tripMap.get(id) ?? { name: "Unknown", code: "" }), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Budget utilization — "spent" must be scoped to the budget's own
  // period (and end_date, if the budget has one), not a lifetime total.
  // Previously this summed every expense ever recorded, so a "monthly"
  // budget's spend never reset and a category-less budget counted
  // spending from every trip going back to account creation.
  const now = new Date();
  const budgetUtilization = budgets.map((b) => {
    const categoryName = b.category_id ? (catNameMap.get(b.category_id) ?? null) : null;
    const { windowStart, windowEnd } = getBudgetWindow(b.period, b.start_date, b.end_date, now);
    const inWindow = allExpenses.filter((e) => {
      const created = new Date(e.created_at);
      return created >= windowStart && created < windowEnd;
    });
    const spent = categoryName
      ? inWindow
          .filter((e) => (e.category ?? "Uncategorized") === categoryName)
          .reduce((s, e) => s + e.amount_cents, 0)
      : inWindow.reduce((s, e) => s + e.amount_cents, 0);
    return {
      id: b.id,
      name: b.name,
      budgeted: b.amount_cents,
      spent,
      categoryName,
    };
  });

  const totalSpent = allExpenses.reduce((s, e) => s + e.amount_cents, 0);

  return NextResponse.json({
    currency,
    monthlySpending: months.map(({ label, total }) => ({ label, total })),
    categoryBreakdown,
    topTrips,
    budgetUtilization,
    totalSpent,
    tripCount: allTrips.length,
    expenseCount: allExpenses.length,
    otherCurrencies,
  });
}

// Returns the [start, end) window that counts as "current period" for a
// budget's spend, anchored to the budget's start_date. end_date, if set,
// caps the window (a budget that has already ended stops accruing spend).
function getBudgetWindow(
  period: string,
  startDateStr: string,
  endDateStr: string | null,
  now: Date
): { windowStart: Date; windowEnd: Date } {
  const budgetStart = new Date(startDateStr);
  let periodStart: Date;

  switch (period) {
    case "daily":
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly": {
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const diffToMonday = (dayOfWeek + 6) % 7;
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      break;
    }
    case "yearly":
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    case "monthly":
    default:
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  // The budget can't have accrued spend before it existed.
  const windowStart = periodStart > budgetStart ? periodStart : budgetStart;
  const hardEnd = endDateStr ? new Date(endDateStr) : null;
  const windowEnd = hardEnd && hardEnd < now ? hardEnd : new Date(now.getTime() + 1);

  return { windowStart, windowEnd };
}

function buildEmptyMonths() {
  const now = new Date();
  const months: { label: string; key: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      total: 0,
    });
  }
  return months;
}
