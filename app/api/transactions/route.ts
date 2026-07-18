import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { Transaction, TransactionType, TransactionStatus } from "@/types/transactions";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const typeFilter = searchParams.get("type");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const q = searchParams.get("q");

  // Build the base query
  let query = admin
    .from("transactions")
    .select(
      "id, user_id, type, amount, currency, description, payment_card_id, related_expense_id, related_settlement_id, status, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }
  if (fromDate) {
    query = query.gte("created_at", fromDate);
  }
  if (toDate) {
    // include the full toDate day
    query = query.lte("created_at", `${toDate}T23:59:59.999Z`);
  }
  if (q) {
    query = query.ilike("description", `%${q}%`);
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 }
    );
  }

  const rawRows = rows ?? [];

  // Collect IDs for enrichment
  const settlementIds = [
    ...new Set(
      rawRows
        .map((r) => r.related_settlement_id)
        .filter((id): id is string => id !== null)
    ),
  ];
  const expenseIds = [
    ...new Set(
      rawRows
        .map((r) => r.related_expense_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  // Fetch settlement → trip name
  const settlementTripMap = new Map<string, string>();
  if (settlementIds.length > 0) {
    const { data: settlements } = await admin
      .from("settlements")
      .select("id, trip_id")
      .in("id", settlementIds);

    if (settlements && settlements.length > 0) {
      const tripIds = [
        ...new Set(settlements.map((s) => s.trip_id).filter(Boolean)),
      ];
      const { data: trips } = await admin
        .from("trips")
        .select("id, name")
        .in("id", tripIds);

      const tripNameMap = new Map<string, string>(
        (trips ?? []).map((t) => [t.id, t.name])
      );

      for (const s of settlements) {
        if (s.trip_id) {
          const name = tripNameMap.get(s.trip_id);
          if (name) settlementTripMap.set(s.id, name);
        }
      }
    }
  }

  // Fetch expense titles
  const expenseTitleMap = new Map<string, string>();
  if (expenseIds.length > 0) {
    const { data: expenses } = await admin
      .from("expenses")
      .select("id, title, description")
      .in("id", expenseIds);

    for (const e of expenses ?? []) {
      expenseTitleMap.set(e.id, e.title ?? e.description ?? "Expense");
    }
  }

  // Compute this-calendar-month summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  ).toISOString();

  const { data: summaryRows } = await admin
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .in("type", ["settlement_paid", "settlement_received"])
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd);

  let money_in = 0;
  let money_out = 0;
  for (const row of summaryRows ?? []) {
    if (row.type === "settlement_received") money_in += Number(row.amount);
    else if (row.type === "settlement_paid") money_out += Number(row.amount);
  }

  // Enrich transactions
  const transactions: Transaction[] = rawRows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type as TransactionType,
    amount: Number(r.amount),
    currency: r.currency,
    description: r.description,
    payment_card_id: r.payment_card_id,
    related_expense_id: r.related_expense_id,
    related_settlement_id: r.related_settlement_id,
    status: r.status as TransactionStatus,
    created_at: r.created_at,
    trip_name: r.related_settlement_id
      ? settlementTripMap.get(r.related_settlement_id)
      : undefined,
    expense_title: r.related_expense_id
      ? expenseTitleMap.get(r.related_expense_id)
      : undefined,
  }));

  return NextResponse.json({
    transactions,
    summary: { money_in, money_out, total_owed: 0 },
  });
}
