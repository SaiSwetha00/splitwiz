import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { Database } from "@/lib/supabase/database.types";

type SubUpdate = Database["public"]["Tables"]["subscriptions"]["Update"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    description,
    amount_cents,
    currency,
    billing_cycle,
    next_billing_date,
    active,
    category_id,
  } = (body ?? {}) as {
    name?: string;
    description?: string | null;
    amount_cents?: number;
    currency?: string;
    billing_cycle?: string;
    next_billing_date?: string | null;
    active?: boolean;
    category_id?: string | null;
  };

  const update: SubUpdate = {};
  if (name !== undefined) update.name = name.trim();
  if (description !== undefined) update.description = description;
  if (amount_cents !== undefined) update.amount_cents = amount_cents;
  if (currency !== undefined) update.currency = currency;
  if (billing_cycle !== undefined) update.billing_cycle = billing_cycle;
  if (next_billing_date !== undefined) update.next_billing_date = next_billing_date;
  if (active !== undefined) update.active = active;
  if (category_id !== undefined) update.category_id = category_id;

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, name, description, amount_cents, currency, billing_cycle, next_billing_date, active, created_at, category:categories(id, name, icon, color)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }

  return NextResponse.json({ subscription });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
