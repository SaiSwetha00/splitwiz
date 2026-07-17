import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseExpenseInput } from "@/lib/expenseInput";
import type { Json } from "@/lib/supabase/database.types";
import { checkTripWrite } from "@/lib/auth/tripAccess";
import { logActivity } from "@/lib/activity";

// PATCH /api/trips/:code/expenses/:expenseId — replace an expense's details.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; expenseId: string }> }
) {
  const { code, expenseId } = await params;
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, user_id, members(id)")
    .eq("code", code.toUpperCase())
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (expenseError || !expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validIds = new Set(trip.members.map((m) => m.id));
  const parsed = parseExpenseInput(body, validIds);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { description, amountCents, category, paidById, splitType, shares } =
    parsed.data;

  // Atomically replace shares and update the expense via a PostgreSQL function.
  const { error } = await supabase.rpc("update_expense_with_shares", {
    p_expense_id: expenseId,
    p_description: description,
    p_amount_cents: amountCents,
    p_category: category,
    p_paid_by_id: paidById,
    p_split_type: splitType,
    p_shares: shares.map((s) => ({
      member_id: s.memberId,
      amount_cents: s.amount,
    })) as unknown as Json,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }

  if (trip.user_id && access.userId) {
    logActivity({
      userId: access.userId,
      tripId: trip.id,
      action: "expense_updated",
      entityType: "expenses",
      entityId: expenseId,
      metadata: { description, amount_cents: amountCents },
    });
  }

  return NextResponse.json({ id: expenseId });
}

// DELETE /api/trips/:code/expenses/:expenseId — remove an expense.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; expenseId: string }> }
) {
  const { code, expenseId } = await params;
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .select("id, description")
    .eq("id", expenseId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (expenseError || !expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Cascade delete in the DB removes expense_shares automatically.
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }

  if (trip.user_id && access.userId) {
    logActivity({
      userId: access.userId,
      tripId: trip.id,
      action: "expense_deleted",
      entityType: "expenses",
      entityId: expenseId,
      metadata: { description: expense.description },
    });
  }

  return NextResponse.json({ ok: true });
}
