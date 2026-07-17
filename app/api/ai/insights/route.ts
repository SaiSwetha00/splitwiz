import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fromCents } from "@/lib/money";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .eq("dismissed", false)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("generated_at", { ascending: false });

  return NextResponse.json({ insights: data ?? [] });
}

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "AI features require GROQ_API_KEY to be configured" },
      { status: 503 }
    );
  }

  const [budgetsResult, goalsResult, subsResult] = await Promise.all([
    supabase
      .from("budgets")
      .select("name, amount_cents, period")
      .eq("user_id", user.id),
    supabase
      .from("savings_goals")
      .select("name, target_cents, current_cents, completed")
      .eq("user_id", user.id),
    supabase
      .from("subscriptions")
      .select("name, amount_cents, billing_cycle")
      .eq("user_id", user.id)
      .eq("active", true),
  ]);

  const budgets = budgetsResult.data ?? [];
  const goals = goalsResult.data ?? [];
  const subs = subsResult.data ?? [];

  const budgetText =
    budgets.length === 0
      ? "No budgets set"
      : budgets
          .map(
            (b) =>
              `${b.name}: $${fromCents(b.amount_cents).toFixed(2)} ${b.period}`
          )
          .join(", ");

  const savingsText =
    goals.length === 0
      ? "No savings goals"
      : goals
          .map(
            (g) =>
              `${g.name}: $${fromCents(g.current_cents).toFixed(2)} saved of $${fromCents(g.target_cents).toFixed(2)} target${g.completed ? " (completed)" : ""}`
          )
          .join("; ");

  const monthlySubCost = subs.reduce((sum, s) => {
    if (s.billing_cycle === "monthly") return sum + s.amount_cents;
    if (s.billing_cycle === "yearly")
      return sum + Math.round(s.amount_cents / 12);
    if (s.billing_cycle === "weekly") return sum + s.amount_cents * 4;
    return sum;
  }, 0);

  const subText =
    subs.length === 0
      ? "No active subscriptions"
      : `${subs
          .map(
            (s) =>
              `${s.name} ($${fromCents(s.amount_cents).toFixed(2)}/${s.billing_cycle})`
          )
          .join(", ")} — ~$${fromCents(monthlySubCost).toFixed(2)}/month total`;

  const prompt = `You are a personal finance advisor. Analyze this user's financial data and provide actionable insights.

Financial Overview:
- Budgets: ${budgetText}
- Savings Goals: ${savingsText}
- Subscriptions: ${subText}

Provide exactly 3 actionable personal finance insights. Reply with a JSON array only — no markdown, no explanation:
[
  {"title": "Short insight title", "body": "2-3 sentence explanation with specific advice."},
  {"title": "Short insight title", "body": "2-3 sentence explanation with specific advice."},
  {"title": "Short insight title", "body": "2-3 sentence explanation with specific advice."}
]`;

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

    let parsed: { title: string; body: string }[];
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
    } catch {
      return NextResponse.json(
        { error: "AI returned unexpected format" },
        { status: 500 }
      );
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 1);

    const rows = parsed.slice(0, 5).map((item) => ({
      user_id: user.id,
      type: "personal_finance",
      title: String(item.title ?? "Insight").slice(0, 200),
      content: { body: String(item.body ?? "") },
      expires_at: expiry.toISOString(),
    }));

    const { data: inserted } = await supabase
      .from("ai_insights")
      .insert(rows)
      .select("*");

    return NextResponse.json({ insights: inserted ?? [] }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 500 }
    );
  }
}
