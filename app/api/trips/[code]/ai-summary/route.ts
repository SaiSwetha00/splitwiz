import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import { fromCents } from "@/lib/money";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const { code } = await params;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "AI features require GROQ_API_KEY to be configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, name, currency, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  if (trip.user_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    if (trip.user_id !== user.id) {
      const { data: collab } = await supabase
        .from("trip_collaborators")
        .select("role")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!collab) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
  }

  const [expensesResult, membersResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("description, amount_cents, category, paid_by_id")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: true })
      .limit(30),
    supabase.from("members").select("id, name").eq("trip_id", trip.id),
  ]);

  const expenses = expensesResult.data ?? [];
  const members = membersResult.data ?? [];

  if (expenses.length === 0) {
    return NextResponse.json(
      { error: "No expenses to analyse yet" },
      { status: 422 }
    );
  }

  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);

  const expenseLines = expenses
    .map((e) => {
      const payer = memberMap.get(e.paid_by_id) ?? "Unknown";
      const cat = e.category ? ` [${e.category}]` : "";
      return `- ${e.description}${cat}: ${trip.currency} ${fromCents(e.amount_cents).toFixed(2)} (paid by ${payer})`;
    })
    .join("\n");

  const prompt = `You are a travel expense analyst. Analyse these trip expenses and provide helpful insights.

Trip: "${trip.name}"
Currency: ${trip.currency}
Participants: ${members.map((m) => m.name).join(", ")}
Total spent: ${trip.currency} ${fromCents(total).toFixed(2)}

Expenses (${expenses.length} items):
${expenseLines}

Reply with a JSON object only — no markdown, no explanation:
{
  "summary": "2-3 sentence narrative overview of how money was spent",
  "breakdown": [{"category": "string", "amount": 0.0, "percentage": 0}],
  "insights": ["string", "string", "string"],
  "suggestions": ["string", "string"]
}`;

  try {
    const groq = new Groq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    const cleaned = raw
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(
        { error: "AI returned unexpected format" },
        { status: 500 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 500 }
    );
  }
}
