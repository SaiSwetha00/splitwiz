import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireAuth } from "@/lib/auth/requireAuth";
import { checkRateLimit } from "@/lib/ai/rateLimit";

interface ScanRequestBody {
  imageBase64: string;
  mimeType: string;
}

interface ReceiptItem {
  name: string;
  price: number;
}

interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  category: string | null;
  items: ReceiptItem[];
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 5, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }

  let body: ScanRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { imageBase64, mimeType } = body;

  if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.length === 0) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  if (!mimeType || typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "mimeType must be an image type" }, { status: 400 });
  }

  try {
    const groq = new Groq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: "text",
              text: 'Extract from this receipt. Return ONLY valid JSON: {"merchant": string, "amount": number, "currency": string, "date": "YYYY-MM-DD", "category": string, "items": [{"name": string, "price": number}]}. Use null for fields you cannot find.',
            },
          ],
        },
      ],
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim();
    const cleaned = raw
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: ParsedReceipt;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Could not read receipt" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Could not read receipt" }, { status: 500 });
  }
}
