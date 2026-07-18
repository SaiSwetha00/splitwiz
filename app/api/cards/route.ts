import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { data: cards, error } = await admin
    .from("payment_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load cards" }, { status: 500 });
  }

  return NextResponse.json({ cards: cards ?? [] });
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
    card_type,
    last_4_digits,
    card_holder_name,
    bank_name,
    card_color,
    is_default,
    upi_id,
  } = (body ?? {}) as {
    card_type?: string | null;
    last_4_digits?: string;
    card_holder_name?: string;
    bank_name?: string | null;
    card_color?: string;
    is_default?: boolean;
    upi_id?: string | null;
  };

  if (!last_4_digits || !/^\d{4}$/.test(last_4_digits)) {
    return NextResponse.json(
      { error: "last_4_digits must be exactly 4 digits" },
      { status: 400 }
    );
  }
  if (!card_holder_name?.trim()) {
    return NextResponse.json({ error: "Cardholder name is required" }, { status: 400 });
  }

  if (is_default) {
    const { error: clearError } = await admin
      .from("payment_cards")
      .update({ is_default: false })
      .eq("user_id", user.id);
    if (clearError) {
      return NextResponse.json({ error: "Failed to update default card" }, { status: 500 });
    }
  }

  const { data: card, error } = await admin
    .from("payment_cards")
    .insert({
      user_id: user.id,
      card_type: card_type ?? null,
      last_4_digits,
      card_holder_name: card_holder_name.trim(),
      bank_name: bank_name ?? null,
      card_color: card_color ?? "#1a1a2e",
      is_default: is_default ?? false,
      upi_id: upi_id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to add card" }, { status: 500 });
  }

  return NextResponse.json({ card }, { status: 201 });
}
