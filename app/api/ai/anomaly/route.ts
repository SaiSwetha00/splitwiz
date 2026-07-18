import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/server";

interface AnomalyRequestBody {
  category: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  let body: AnomalyRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { category, amount } = body;
  if (!category || typeof amount !== "number") {
    return NextResponse.json({ error: "category and amount are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("expenses")
    .select("amount")
    .eq("created_by", user.id)
    .eq("category", category)
    .not("amount", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const expenses = (data ?? []).filter((e) => e.amount !== null);
  if (expenses.length === 0) {
    return NextResponse.json({ isAnomaly: false });
  }

  const avg =
    expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0) / expenses.length;

  if (avg > 0 && amount > avg * 2) {
    const ratio = amount / avg;
    return NextResponse.json({
      isAnomaly: true,
      avgAmount: avg,
      ratio,
      message: `This expense is ${ratio.toFixed(1)}x your usual amount in ${category}`,
    });
  }

  return NextResponse.json({ isAnomaly: false });
}
