import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
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

  const { is_default, card_color, bank_name } = (body ?? {}) as {
    is_default?: boolean;
    card_color?: string;
    bank_name?: string | null;
  };

  // Verify ownership first
  const { data: existing, error: fetchError } = await admin
    .from("payment_cards")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  if (is_default) {
    const { error: clearError } = await admin
      .from("payment_cards")
      .update({ is_default: false })
      .eq("user_id", user.id);
    if (clearError) {
      return NextResponse.json({ error: "Failed to clear default" }, { status: 500 });
    }
  }

  const update: {
    is_default?: boolean;
    card_color?: string;
    bank_name?: string | null;
  } = {};
  if (is_default !== undefined) update.is_default = is_default;
  if (card_color !== undefined) update.card_color = card_color;
  if (bank_name !== undefined) update.bank_name = bank_name;

  const { data: card, error } = await admin
    .from("payment_cards")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }

  return NextResponse.json({ card });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { error } = await admin
    .from("payment_cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
