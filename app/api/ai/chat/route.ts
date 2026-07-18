import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ai/rateLimit";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  message: string;
  history: HistoryMessage[];
  userId?: string;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message, history } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [tripsResult, expensesResult, goalsResult, subsResult, transactionsResult] =
    await Promise.all([
      admin.from("trips").select("id, status").eq("user_id", user.id),
      admin
        .from("expenses")
        .select("amount")
        .eq("created_by", user.id)
        .gte("date", thisMonthStart.slice(0, 10)),
      admin
        .from("savings_goals")
        .select("id")
        .eq("user_id", user.id)
        .eq("completed", false),
      admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("active", true),
      admin.from("transactions").select("type, amount").eq("user_id", user.id),
    ]);

  const trips = tripsResult.data ?? [];
  const tripsCount = trips.length;

  const monthlyExpenseSum = (expensesResult.data ?? []).reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0
  );

  const goalsCount = (goalsResult.data ?? []).length;
  const subsCount = (subsResult.data ?? []).length;

  const netBalance = (transactionsResult.data ?? []).reduce((sum, t) => {
    const isCredit = t.type === "credit" || t.type === "income";
    return sum + (isCredit ? t.amount : -t.amount);
  }, 0);

  const balanceLabel = netBalance >= 0 ? "owed to you" : "you owe";
  const currency = "₹";

  const systemPrompt = `You are SplitWiz AI, a smart personal finance assistant. Be concise and helpful.
User's current data:
- Trips: ${tripsCount} active
- This month's expenses: ${currency}${monthlyExpenseSum.toFixed(2)}
- Savings goals: ${goalsCount} active goal(s)
- Monthly subscriptions: ${subsCount} active
- Net balance: ${currency}${Math.abs(netBalance).toFixed(2)} (${balanceLabel})
Answer questions about their finances. Be specific when you have data.`;

  const recentHistory = (Array.isArray(history) ? history : [])
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const groq = new Groq();
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 800,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: message },
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content ?? "";
            if (content) controller.enqueue(encoder.encode(content));
          }
        } catch {
          /* ignore stream errors */
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
