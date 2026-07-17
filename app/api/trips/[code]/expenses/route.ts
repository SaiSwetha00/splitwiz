import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseExpenseInput } from "@/lib/expenseInput";
import { checkTripWrite } from "@/lib/auth/tripAccess";
import { logActivity } from "@/lib/activity";
import { notifyTripCollaborators } from "@/lib/notifications";

// POST /api/trips/:code/expenses — add an expense with its split.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, user_id, name, code, currency, members(id)")
    .eq("code", code.toUpperCase())
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      trip_id: trip.id,
      description,
      amount_cents: amountCents,
      category: category ?? null,
      paid_by_id: paidById,
      split_type: splitType,
    })
    .select("id")
    .single();

  if (expenseError || !expense) {
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }

  const { error: sharesError } = await supabase.from("expense_shares").insert(
    shares.map((s) => ({
      expense_id: expense.id,
      member_id: s.memberId,
      amount_cents: s.amount,
    }))
  );

  if (sharesError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    return NextResponse.json(
      { error: "Failed to create expense shares" },
      { status: 500 }
    );
  }

  // Fire-and-forget: log activity + notify collaborators on owned trips.
  if (trip.user_id && access.userId) {
    const actorId = access.userId;
    logActivity({
      userId: actorId,
      tripId: trip.id,
      action: "expense_added",
      entityType: "expenses",
      entityId: expense.id,
      metadata: { description, amount_cents: amountCents, category: category ?? null },
    });
    void notifyTripCollaborators({
      tripId: trip.id,
      tripOwnerId: trip.user_id,
      actorUserId: actorId,
      type: "expense_added",
      title: `New expense in "${trip.name}"`,
      body: `"${description}" — ${trip.currency} ${(amountCents / 100).toFixed(2)}`,
      actionUrl: `/trip/${trip.code}`,
    });
  }

  return NextResponse.json({ id: expense.id }, { status: 201 });
}
