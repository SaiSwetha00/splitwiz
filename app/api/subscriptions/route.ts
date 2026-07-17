import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select(
      "id, name, description, amount_cents, currency, billing_cycle, next_billing_date, active, created_at, category:categories(id, name, icon, color)"
    )
    .eq("user_id", user.id)
    .order("active", { ascending: false })
    .order("next_billing_date", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }

  return NextResponse.json({ subscriptions: subscriptions ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

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
    category_id,
  } = (body ?? {}) as {
    name?: string;
    description?: string | null;
    amount_cents?: number;
    currency?: string;
    billing_cycle?: string;
    next_billing_date?: string | null;
    category_id?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!amount_cents || amount_cents <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const validCycles = ["weekly", "monthly", "yearly"];
  const finalCycle = validCycles.includes(billing_cycle ?? "") ? billing_cycle! : "monthly";

  const { data: subscription, error } = await admin
    .from("subscriptions")
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() ?? null,
      amount_cents,
      currency: currency ?? "USD",
      billing_cycle: finalCycle,
      next_billing_date: next_billing_date ?? null,
      category_id: category_id ?? null,
    })
    .select(
      "id, name, description, amount_cents, currency, billing_cycle, next_billing_date, active, created_at, category:categories(id, name, icon, color)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }

  return NextResponse.json({ subscription }, { status: 201 });
}
