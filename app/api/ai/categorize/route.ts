import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const DEFAULT_CATEGORIES = [
  "Food",
  "Lodging",
  "Transport",
  "Activities",
  "Shopping",
  "Other",
];

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ category: null });
  }

  let body: { description?: string; categories?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ category: null });
  }

  const description = String(body.description ?? "").trim();
  if (description.length < 2) {
    return NextResponse.json({ category: null });
  }

  const categories =
    Array.isArray(body.categories) && body.categories.length > 0
      ? body.categories
      : DEFAULT_CATEGORIES;

  try {
    const groq = new Groq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Pick the best category for this expense from the list.\n\nExpense: "${description}"\nCategories: ${categories.join(", ")}\n\nReply with ONLY the exact category name, nothing else.`,
        },
      ],
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    const matched = categories.find(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );
    return NextResponse.json({ category: matched ?? null });
  } catch {
    return NextResponse.json({ category: null });
  }
}
