import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { data: goals, error } = await admin
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load savings goals" }, { status: 500 });
  }

  return NextResponse.json({ goals: goals ?? [] });
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

  const { name, icon, target_cents, current_cents, deadline } =
    (body ?? {}) as {
      name?: string;
      icon?: string | null;
      target_cents?: number;
      current_cents?: number;
      deadline?: string | null;
    };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!target_cents || target_cents <= 0) {
    return NextResponse.json({ error: "Target amount must be positive" }, { status: 400 });
  }

  const { data: goal, error } = await admin
    .from("savings_goals")
    .insert({
      user_id: user.id,
      name: name.trim(),
      icon: icon ?? null,
      target_cents,
      current_cents: current_cents ?? 0,
      deadline: deadline ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create savings goal" }, { status: 500 });
  }

  return NextResponse.json({ goal }, { status: 201 });
}
