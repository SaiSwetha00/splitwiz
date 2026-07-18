import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  category: string;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Extract text from PDF
  let pdfText: string;
  try {
    // Dynamic import to avoid browser-API globals at module init time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = (require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    pdfText = result.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("password")) {
      return NextResponse.json({ error: "Password-protected PDFs are not supported. Please export an unprotected statement." }, { status: 422 });
    }
    return NextResponse.json({ error: "Could not read PDF. Please ensure it's a valid bank statement." }, { status: 422 });
  }

  if (!pdfText || pdfText.trim().length < 50) {
    return NextResponse.json({ error: "PDF appears to be empty or image-based. Please use a text-based bank statement." }, { status: 422 });
  }

  // Use Groq to parse transactions
  let transactions: ParsedTransaction[] = [];
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `Extract all DEBIT transactions from this bank statement. Return ONLY a valid JSON array with no explanation:
[{"date":"YYYY-MM-DD","description":"string","amount":number,"category":"string"}]

Categories must be one of: Food, Transport, Shopping, Entertainment, Health, Utilities, Travel, Education, Other

Ignore credits, opening balance, closing balance, and table headers.

Bank statement text:
${pdfText.slice(0, 8000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";

    // Extract JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");

    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    transactions = parsed
      .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
      .map((t) => ({
        date: typeof t.date === "string" ? t.date : new Date().toISOString().slice(0, 10),
        description: typeof t.description === "string" ? t.description : "Unknown",
        amount: typeof t.amount === "number" ? Math.abs(t.amount) : 0,
        category: typeof t.category === "string" ? t.category : "Other",
      }))
      .filter((t) => t.amount > 0);
  } catch {
    return NextResponse.json({ error: "AI could not parse this statement format. Supported banks: HDFC, SBI, ICICI, Axis, Kotak." }, { status: 422 });
  }

  if (transactions.length === 0) {
    return NextResponse.json({ error: "No debit transactions found in this statement." }, { status: 422 });
  }

  return NextResponse.json({ transactions });
}
