import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/server";

type TimelineEntry = { date: string; amount: number };
type CategoryEntry = { name: string; amount: number; count: number };
type BudgetEntry = { id: string; name: string; limit: number; spent: number };
type TripEntry = { id: string; name: string; code: string; total: number };
type MonthlyEntry = { label: string; key: string; total: number };
type MemberEntry = { name: string; paid: number };
type ExpenseEntry = {
  id: string;
  date: string;
  title: string;
  category: string | null;
  tripName: string;
  tripCode: string;
  paidByName: string;
  amount: number;
  currency: string;
  note: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);

  const now = new Date();
  const defaultFrom = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultTo = localDateStr(now);

  const fromISO = searchParams.get("from") ?? defaultFrom;
  const toISO = searchParams.get("to") ?? defaultTo;
  const tripIdParam = searchParams.get("tripId") ?? null;

  // User's default currency
  const { data: settings } = await admin
    .from("user_settings")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();
  const currency = settings?.default_currency ?? "USD";

  // All trips the user owns + collaborates on, filtered by currency
  const [ownResult, collabResult] = await Promise.all([
    admin
      .from("trips")
      .select("id, name, code, currency")
      .eq("user_id", user.id)
      .eq("currency", currency),
    admin
      .from("trip_collaborators")
      .select("trip_id")
      .eq("user_id", user.id),
  ]);

  const ownTrips = ownResult.data ?? [];
  const collabIds = (collabResult.data ?? []).map((c) => c.trip_id);

  let collabTrips: { id: string; name: string; code: string; currency: string }[] = [];
  if (collabIds.length > 0) {
    const { data } = await admin
      .from("trips")
      .select("id, name, code, currency")
      .in("id", collabIds)
      .eq("currency", currency);
    collabTrips = data ?? [];
  }

  let allTrips = [...ownTrips, ...collabTrips];

  // Narrow to a single trip when tripId is provided
  if (tripIdParam) {
    allTrips = allTrips.filter((t) => t.id === tripIdParam);
  }

  const tripMap = new Map(allTrips.map((t) => [t.id, t]));
  const tripIds = allTrips.map((t) => t.id);

  // Empty response when the user has no applicable trips
  if (tripIds.length === 0) {
    return NextResponse.json({
      currency,
      totalSpent: 0,
      expenseCount: 0,
      avgPerDay: 0,
      biggestExpense: null,
      timeline: buildTimeline(fromISO, toISO, []),
      categories: [] as CategoryEntry[],
      budgets: [] as BudgetEntry[],
      trips: [] as TripEntry[],
      monthly: buildEmptyMonths(),
      expenses: [] as ExpenseEntry[],
    });
  }

  // Expenses in date range
  const { data: rawExpenses } = await admin
    .from("expenses")
    .select(
      "id, trip_id, title, description, amount_cents, amount, category, date, created_at, paid_by_member_id, note"
    )
    .in("trip_id", tripIds)
    .gte("date", fromISO)
    .lte("date", toISO)
    .order("date", { ascending: true });

  const expenses = rawExpenses ?? [];

  // Resolve paid_by member names
  const paidByIds = [
    ...new Set(
      expenses
        .map((e) => e.paid_by_member_id)
        .filter((id): id is string => id != null)
    ),
  ];
  let memberNameMap = new Map<string, string>();
  if (paidByIds.length > 0) {
    const { data: membersData } = await admin
      .from("trip_members")
      .select("id, name")
      .in("id", paidByIds);
    memberNameMap = new Map((membersData ?? []).map((m) => [m.id, m.name]));
  }

  // Helpers
  const normalizeAmount = (e: {
    amount: number | string | null | undefined;
    amount_cents: number | null | undefined;
  }): number => {
    if (e.amount != null) return Number(e.amount);
    if (e.amount_cents) return e.amount_cents / 100;
    return 0;
  };

  const normalizeTitle = (e: {
    title: string | null | undefined;
    description: string | null | undefined;
  }): string => e.title ?? e.description ?? "Expense";

  // Totals
  const totalSpent = expenses.reduce((sum, e) => sum + normalizeAmount(e), 0);
  const expenseCount = expenses.length;

  // Days in range (inclusive)
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  const fromDate = new Date(fy, fm - 1, fd);
  const toDate = new Date(ty, tm - 1, td);
  const daysDiff = Math.max(
    1,
    Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
  );
  const avgPerDay = totalSpent / daysDiff;

  // Biggest expense
  let biggestExpense: { amount: number; title: string } | null = null;
  for (const e of expenses) {
    const amt = normalizeAmount(e);
    if (!biggestExpense || amt > biggestExpense.amount) {
      biggestExpense = { amount: amt, title: normalizeTitle(e) };
    }
  }

  // Timeline: one entry per day in range, zero-filled
  const timeline = buildTimeline(
    fromISO,
    toISO,
    expenses.map((e) => ({ date: e.date ?? "", amount: normalizeAmount(e) }))
  );

  // Category breakdown
  const catMap = new Map<string, { amount: number; count: number }>();
  for (const e of expenses) {
    const cat = e.category ?? "Uncategorized";
    const prev = catMap.get(cat) ?? { amount: 0, count: 0 };
    catMap.set(cat, {
      amount: prev.amount + normalizeAmount(e),
      count: prev.count + 1,
    });
  }
  const categories: CategoryEntry[] = [...catMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);

  // Trips sorted by total spend
  const tripTotals = new Map<string, number>();
  for (const e of expenses) {
    tripTotals.set(e.trip_id, (tripTotals.get(e.trip_id) ?? 0) + normalizeAmount(e));
  }
  const trips: TripEntry[] = [...tripTotals.entries()]
    .map(([id, total]) => {
      const t = tripMap.get(id) ?? { name: "Unknown", code: "", id: "" };
      return { id, name: t.name, code: t.code, total };
    })
    .sort((a, b) => b.total - a.total);

  // Budgets: limit vs category-filtered spend in range
  const { data: budgetsData } = await admin
    .from("budgets")
    .select("id, name, amount_cents, category_id")
    .eq("user_id", user.id);

  const budgetsRaw = budgetsData ?? [];
  const budgetCatIds = [
    ...new Set(
      budgetsRaw
        .map((b) => b.category_id)
        .filter((id): id is string => id != null)
    ),
  ];
  let budgetCatNameMap = new Map<string, string>();
  if (budgetCatIds.length > 0) {
    const { data: catData } = await admin
      .from("categories")
      .select("id, name")
      .in("id", budgetCatIds);
    budgetCatNameMap = new Map((catData ?? []).map((c) => [c.id, c.name]));
  }

  const budgets: BudgetEntry[] = budgetsRaw.map((b) => {
    const catName = b.category_id
      ? (budgetCatNameMap.get(b.category_id) ?? null)
      : null;
    const spent = catName
      ? expenses
          .filter((e) => (e.category ?? "Uncategorized") === catName)
          .reduce((sum, e) => sum + normalizeAmount(e), 0)
      : expenses.reduce((sum, e) => sum + normalizeAmount(e), 0);
    return {
      id: b.id,
      name: b.name,
      limit: (b.amount_cents ?? 0) / 100,
      spent,
    };
  });

  // Monthly trend: always last 12 months regardless of from/to
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const { data: monthlyRawData } = await admin
    .from("expenses")
    .select("trip_id, amount_cents, amount, date")
    .in("trip_id", tripIds)
    .gte("date", localDateStr(twelveMonthsAgo));

  const monthly = buildEmptyMonths();
  for (const e of monthlyRawData ?? []) {
    const dateStr = e.date ?? "";
    if (!dateStr) continue;
    const [ey, em] = dateStr.split("-").map(Number);
    const key = `${ey}-${String(em).padStart(2, "0")}`;
    const bucket = monthly.find((m) => m.key === key);
    if (bucket) {
      const amt =
        e.amount != null
          ? Number(e.amount)
          : e.amount_cents
          ? e.amount_cents / 100
          : 0;
      bucket.total += amt;
    }
  }

  // Member spending: only when tripId is provided
  let members: MemberEntry[] | undefined;
  if (tripIdParam) {
    const { data: tripMembersData } = await admin
      .from("trip_members")
      .select("id, name")
      .eq("trip_id", tripIdParam);

    if (tripMembersData) {
      const memberPaid = new Map<string, { name: string; paid: number }>();
      for (const m of tripMembersData) {
        memberPaid.set(m.id, { name: m.name, paid: 0 });
      }
      for (const e of expenses) {
        if (e.paid_by_member_id && memberPaid.has(e.paid_by_member_id)) {
          const entry = memberPaid.get(e.paid_by_member_id)!;
          entry.paid += normalizeAmount(e);
        }
      }
      members = [...memberPaid.values()].sort((a, b) => b.paid - a.paid);
    }
  }

  // Expense list for export / detail views
  const expenseEntries: ExpenseEntry[] = expenses.map((e) => ({
    id: e.id,
    date: e.date ?? "",
    title: normalizeTitle(e),
    category: e.category ?? null,
    tripName: tripMap.get(e.trip_id)?.name ?? "Unknown",
    tripCode: tripMap.get(e.trip_id)?.code ?? "",
    paidByName:
      e.paid_by_member_id
        ? (memberNameMap.get(e.paid_by_member_id) ?? "Unknown")
        : "Unknown",
    amount: normalizeAmount(e),
    currency,
    note: (e as { note?: string | null }).note ?? null,
  }));

  return NextResponse.json({
    currency,
    totalSpent,
    expenseCount,
    avgPerDay,
    biggestExpense,
    timeline,
    categories,
    budgets,
    trips,
    monthly,
    ...(members !== undefined ? { members } : {}),
    expenses: expenseEntries,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function buildTimeline(
  fromISO: string,
  toISO: string,
  expenses: { date: string; amount: number }[]
): TimelineEntry[] {
  const dailyMap = new Map<string, number>();
  for (const e of expenses) {
    if (e.date) {
      dailyMap.set(e.date, (dailyMap.get(e.date) ?? 0) + e.amount);
    }
  }

  const result: TimelineEntry[] = [];
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);

  while (cur <= end) {
    const key = localDateStr(cur);
    result.push({ date: key, amount: dailyMap.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function buildEmptyMonths(): MonthlyEntry[] {
  const now = new Date();
  const months: MonthlyEntry[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      total: 0,
    });
  }
  return months;
}
