import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { Database } from "@/lib/supabase/database.types";

type GoalUpdate = Database["public"]["Tables"]["savings_goals"]["Update"];

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

  const { name, icon, target_cents, current_cents, deadline, completed } =
    (body ?? {}) as {
      name?: string;
      icon?: string | null;
      target_cents?: number;
      current_cents?: number;
      deadline?: string | null;
      completed?: boolean;
    };

  const update: GoalUpdate = {};
  if (name !== undefined) update.name = name.trim();
  if (icon !== undefined) update.icon = icon;
  if (target_cents !== undefined) update.target_cents = target_cents;
  if (current_cents !== undefined) update.current_cents = current_cents;
  if (deadline !== undefined) update.deadline = deadline;
  if (completed !== undefined) update.completed = completed;

  const { data: goal, error } = await admin
    .from("savings_goals")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update savings goal" }, { status: 500 });
  }

  return NextResponse.json({ goal });
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
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete savings goal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
