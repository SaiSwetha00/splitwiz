import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const { data: budgets, error } = await supabase
    .from("budgets")
    .select(
      "id, name, amount_cents, period, start_date, end_date, created_at, category:categories(id, name, icon, color)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load budgets" }, { status: 500 });
  }

  return NextResponse.json({ budgets: budgets ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

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

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!amount_cents || amount_cents <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }
  if (!start_date) {
    return NextResponse.json({ error: "Start date is required" }, { status: 400 });
  }

  const validPeriods = ["daily", "weekly", "monthly", "yearly"];
  const finalPeriod = validPeriods.includes(period ?? "") ? period! : "monthly";

  const { data: budget, error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      name: name.trim(),
      amount_cents,
      period: finalPeriod,
      start_date,
      end_date: end_date ?? null,
      category_id: category_id ?? null,
    })
    .select(
      "id, name, amount_cents, period, start_date, end_date, created_at, category:categories(id, name, icon, color)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
  }

  return NextResponse.json({ budget }, { status: 201 });
}
