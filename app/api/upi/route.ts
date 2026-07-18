import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { data: upiCards, error } = await admin
    .from("payment_cards")
    .select("*")
    .eq("user_id", user.id)
    .not("upi_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load UPI IDs" }, { status: 500 });
  }

  return NextResponse.json({ upiCards: upiCards ?? [] });
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

  const { upi_id, card_holder_name } = (body ?? {}) as {
    upi_id?: string;
    card_holder_name?: string;
  };

  if (!upi_id?.trim()) {
    return NextResponse.json({ error: "UPI ID is required" }, { status: 400 });
  }
  if (!card_holder_name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: card, error } = await admin
    .from("payment_cards")
    .insert({
      user_id: user.id,
      upi_id: upi_id.trim(),
      card_holder_name: card_holder_name.trim(),
      card_color: "#1a1a2e",
      is_default: false,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to add UPI ID" }, { status: 500 });
  }

  return NextResponse.json({ card }, { status: 201 });
}
