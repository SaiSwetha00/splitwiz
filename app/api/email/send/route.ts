import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost")
  ? "https://expense-splitter-two-flax.vercel.app"
  : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://expense-splitter-two-flax.vercel.app");

// ── HTML helpers ──────────────────────────────────────────────────────────────
function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;margin:0;padding:0}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7}
  .header{background:#6366f1;padding:24px 32px;color:#fff}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:4px 0 0;opacity:.85;font-size:14px}
  .body{padding:28px 32px}
  .card{background:#f9f9fb;border-radius:12px;padding:18px 20px;margin:16px 0;border:1px solid #e4e4e7}
  .amount{font-size:28px;font-weight:700;color:#6366f1;margin:0}
  .label{font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px}
  .btn{display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-top:8px}
  .progress-bar-bg{background:#e4e4e7;border-radius:99px;height:10px;margin:8px 0}
  .progress-bar{background:#6366f1;border-radius:99px;height:10px}
  .footer{padding:16px 32px;text-align:center;font-size:12px;color:#a1a1aa;border-top:1px solid #f4f4f5}
</style></head>
<body><div class="wrap">${body}<div class="footer">SplitWiz · <a href="${APP_URL}" style="color:#6366f1">splitwiz.app</a></div></div></body>
</html>`;
}

function expenseAddedHtml(d: { adderName: string; expenseTitle: string; tripName: string; yourShare: number; tripId: string }): string {
  return baseHtml(`${d.adderName} added ${d.expenseTitle}`, `
    <div class="header"><h1>New Expense Added</h1><p>${d.tripName}</p></div>
    <div class="body">
      <p style="margin:0 0 12px"><strong>${d.adderName}</strong> added a new expense to <strong>${d.tripName}</strong>.</p>
      <div class="card">
        <p class="label">Expense</p><p style="margin:0;font-weight:600;font-size:18px">${d.expenseTitle}</p>
        <p class="label" style="margin-top:12px">Your Share</p>
        <p class="amount">₹${d.yourShare.toFixed(2)}</p>
      </div>
      <a href="${APP_URL}/dashboard/trips/${d.tripId}" class="btn">View Trip</a>
    </div>`);
}

function settlementReminderHtml(d: { fromName: string; amount: number; tripName: string; tripId: string }): string {
  return baseHtml(`Reminder: ₹${d.amount} from ${d.tripName}`, `
    <div class="header"><h1>Settlement Reminder</h1><p>${d.tripName}</p></div>
    <div class="body">
      <p style="margin:0 0 12px"><strong>${d.fromName}</strong> sent you a settlement reminder.</p>
      <div class="card">
        <p class="label">Amount Due</p><p class="amount">₹${d.amount.toFixed(2)}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#71717a">Trip: ${d.tripName}</p>
      </div>
      <a href="${APP_URL}/dashboard/trips/${d.tripId}" class="btn">Settle Now</a>
    </div>`);
}

function budgetAlertHtml(d: { budgetName: string; percent: number; remaining: number; actionUrl: string }): string {
  const pct = Math.min(d.percent, 100);
  return baseHtml(`⚠️ ${d.budgetName} is almost full`, `
    <div class="header"><h1>Budget Alert</h1><p>${d.budgetName}</p></div>
    <div class="body">
      <div class="card">
        <p class="label">Budget</p><p style="margin:0;font-weight:600">${d.budgetName}</p>
        <div class="progress-bar-bg"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p style="margin:4px 0;font-size:13px;color:#71717a">${pct}% used · ₹${d.remaining.toFixed(0)} remaining</p>
      </div>
      <a href="${APP_URL}${d.actionUrl}" class="btn">View Budget</a>
    </div>`);
}

function weeklySummaryHtml(d: { totalSpent: number; categories: number; unsettledCount: number }): string {
  return baseHtml("Your SplitWiz week in review", `
    <div class="header"><h1>Weekly Summary</h1><p>Your spending this week</p></div>
    <div class="body">
      <div class="card" style="display:flex;gap:24px;flex-wrap:wrap">
        <div><p class="label">Total Spent</p><p class="amount">₹${d.totalSpent.toFixed(0)}</p></div>
        <div><p class="label">Categories</p><p class="amount" style="font-size:20px">${d.categories}</p></div>
        <div><p class="label">Unsettled</p><p class="amount" style="font-size:20px">${d.unsettledCount}</p></div>
      </div>
      <a href="${APP_URL}/dashboard" class="btn">View Dashboard</a>
    </div>`);
}

function welcomeHtml(d: { name: string }): string {
  return baseHtml("Welcome to SplitWiz!", `
    <div class="header"><h1>Welcome to SplitWiz! 🎉</h1><p>Smart Group Expense Manager</p></div>
    <div class="body">
      <p style="margin:0 0 16px">Hi <strong>${d.name}</strong>, great to have you!</p>
      <div class="card">
        <p style="margin:0 0 8px;font-weight:600">Get started in 3 easy steps:</p>
        <p style="margin:6px 0;font-size:14px">1️⃣ Create a trip and add members</p>
        <p style="margin:6px 0;font-size:14px">2️⃣ Log expenses as you go</p>
        <p style="margin:6px 0;font-size:14px">3️⃣ Settle up with one tap</p>
      </div>
      <a href="${APP_URL}/dashboard/trips/new" class="btn">Create First Trip</a>
    </div>`);
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    to: string;
    subject: string;
    type: string;
    data: Record<string, unknown>;
    notificationId?: string;
  };
  const { to, subject, type, data, notificationId } = body;

  if (!to || !subject || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check for duplicate if notificationId provided
  if (notificationId) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("notifications")
      .select("email_sent")
      .eq("id", notificationId)
      .single();
    if (existing?.email_sent) {
      return NextResponse.json({ skipped: true });
    }
  }

  let html = "";
  switch (type) {
    case "expense_added":
      html = expenseAddedHtml(data as Parameters<typeof expenseAddedHtml>[0]); break;
    case "settlement_reminder":
      html = settlementReminderHtml(data as Parameters<typeof settlementReminderHtml>[0]); break;
    case "budget_warning":
    case "budget_exceeded":
      html = budgetAlertHtml(data as Parameters<typeof budgetAlertHtml>[0]); break;
    case "weekly_summary":
      html = weeklySummaryHtml(data as Parameters<typeof weeklySummaryHtml>[0]); break;
    case "welcome":
      html = welcomeHtml(data as Parameters<typeof welcomeHtml>[0]); break;
    default:
      return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark notification as email sent
  if (notificationId) {
    const admin = createAdminClient();
    await admin
      .from("notifications")
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq("id", notificationId);
  }

  return NextResponse.json({ success: true });
}
