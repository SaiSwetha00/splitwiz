import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { Database } from "@/lib/supabase/database.types";

type BudgetUpdate = Database["public"]["Tables"]["budgets"]["Update"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, amount_cents, period, start_date, end_date, category_id } =
    (body ?? {}) as {
      name?: string;
      amount_cents?: number;
      period?: string;
      start_date?: string;
      end_date?: string | null;
      category_id?: string | null;
    };

  const update: BudgetUpdate = {};
  if (name !== undefined) update.name = name.trim();
  if (amount_cents !== undefined) update.amount_cents = amount_cents;
  if (period !== undefined) update.period = period;
  if (start_date !== undefined) update.start_date = start_date;
  if (end_date !== undefined) update.end_date = end_date;
  if (category_id !== undefined) update.category_id = category_id;

  const { data: budget, error } = await admin
    .from("budgets")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, name, amount_cents, period, start_date, end_date, created_at, category:categories(id, name, icon, color)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }

  return NextResponse.json({ budget });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { error } = await admin
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
