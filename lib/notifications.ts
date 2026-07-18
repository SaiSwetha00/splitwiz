import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type NotifyParams = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
};

const EMAIL_TYPES = new Set([
  "expense_added",
  "settlement_reminder",
  "budget_warning",
  "budget_exceeded",
  "weekly_summary",
]);

async function sendEmailForNotification(
  admin: AdminClient,
  notificationId: string,
  userId: string,
  type: string,
  body: string | undefined,
): Promise<void> {
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) return;

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost")
        ? "https://expense-splitter-two-flax.vercel.app"
        : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://expense-splitter-two-flax.vercel.app");

    let subject = "SplitWiz Notification";
    const emailType = type;
    const data: Record<string, unknown> = {};

    if (type === "weekly_summary") {
      subject = "Your SplitWiz week in review 📊";
      const match = body?.match(/₹([\d.]+).*?(\d+)\s+categor/);
      data.totalSpent = match ? parseFloat(match[1]) : 0;
      data.categories = match ? parseInt(match[2]) : 0;
      data.unsettledCount = 0;
    } else if (type.startsWith("budget_")) {
      subject = `⚠️ Budget Alert`;
      const pctMatch = body?.match(/(\d+)%/);
      const remainMatch = body?.match(/₹([\d.]+)\s+remaining/);
      data.budgetName = body?.split(" budget")[0] ?? "Budget";
      data.percent = pctMatch ? parseInt(pctMatch[1]) : 80;
      data.remaining = remainMatch ? parseFloat(remainMatch[1]) : 0;
      data.actionUrl = "/dashboard/budgets";
    } else {
      return; // other types handled inline
    }

    await fetch(`${appUrl}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, type: emailType, data, notificationId }),
    });
  } catch {
    // Email sending is non-critical — never throw
  }
}

async function sendPushNotification(userId: string, title: string, body: string, actionUrl?: string): Promise<void> {
  try {
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost")
        ? "https://expense-splitter-two-flax.vercel.app"
        : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://expense-splitter-two-flax.vercel.app");

    await fetch(`${appUrl}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body, url: actionUrl ?? "/dashboard" }),
    });
  } catch {
    // Push sending is non-critical — never throw
  }
}

export async function createNotification(params: NotifyParams): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    action_url: params.actionUrl ?? null,
  }).select("id").single();

  // Send email for relevant types
  if (row?.id && EMAIL_TYPES.has(params.type.replace(/_[0-9a-f-]{36}$/, ""))) {
    void sendEmailForNotification(admin, row.id as string, params.userId, params.type, params.body);
  }

  // Send push notification for all types
  void sendPushNotification(params.userId, params.title, params.body ?? "", params.actionUrl);
}

type CollabNotifyParams = {
  tripId: string;
  tripOwnerId: string;
  actorUserId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
};

export async function notifyTripCollaborators(
  params: CollabNotifyParams
): Promise<void> {
  const admin = createAdminClient();

  const { data: collabs } = await admin
    .from("trip_collaborators")
    .select("user_id")
    .eq("trip_id", params.tripId)
    .neq("user_id", params.actorUserId);

  const recipients = new Set((collabs ?? []).map((c) => c.user_id));

  if (params.tripOwnerId !== params.actorUserId) {
    recipients.add(params.tripOwnerId);
  }

  if (recipients.size === 0) return;

  const rows = Array.from(recipients).map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    body: params.body,
    action_url: params.actionUrl,
  }));

  await admin.from("notifications").insert(rows);
}

// Inserts a notification only if no identical type+user notification exists today
async function createAutoNotification(
  admin: AdminClient,
  params: NotifyParams
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await admin
    .from('notifications')
    .select('id')
    .eq('user_id', params.userId)
    .eq('type', params.type)
    .gte('created_at', today)
    .limit(1);

  if (existing && existing.length > 0) return;

  await admin.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    action_url: params.actionUrl ?? null,
    read: false,
  });
}

async function checkBudgets(admin: AdminClient, userId: string): Promise<void> {
  const { data: budgets } = await admin
    .from('budgets')
    .select('id, name, amount_cents, period, start_date, categories(id, name)')
    .eq('user_id', userId);

  if (!budgets?.length) return;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  for (const budget of budgets) {
    const catName = (budget.categories as { id: string; name: string } | null)?.name ?? null;

    let periodStart: string;
    switch (budget.period as string) {
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0];
        break;
      case 'weekly': {
        const d = new Date(now);
        d.setDate(now.getDate() - now.getDay());
        periodStart = d.toISOString().split('T')[0];
        break;
      }
      case 'daily':
        periodStart = today;
        break;
      case 'yearly':
        periodStart = `${now.getFullYear()}-01-01`;
        break;
      default:
        periodStart = (budget.start_date as string | null) ?? today;
    }

    let query = admin
      .from('expenses')
      .select('amount')
      .eq('created_by', userId)
      .gte('date', periodStart)
      .lte('date', today);

    if (catName) query = query.eq('category', catName);

    const { data: expenses } = await query;
    const spent = (expenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const limit = (budget.amount_cents as number) / 100;
    if (limit <= 0) continue;
    const ratio = spent / limit;

    if (ratio >= 1.0) {
      await createAutoNotification(admin, {
        userId,
        type: `budget_exceeded_${budget.id as string}`,
        title: '🚨 Over Budget!',
        body: `${budget.name as string} budget exceeded by ₹${(spent - limit).toFixed(0)}`,
        actionUrl: '/dashboard/budgets',
      });
    } else if (ratio >= 0.8) {
      await createAutoNotification(admin, {
        userId,
        type: `budget_warning_${budget.id as string}`,
        title: '⚠️ Budget Warning',
        body: `${budget.name as string} is at ${Math.round(ratio * 100)}% — ₹${(limit - spent).toFixed(0)} remaining`,
        actionUrl: '/dashboard/budgets',
      });
    }
  }
}

async function checkSubscriptions(admin: AdminClient, userId: string): Promise<void> {
  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, name, amount_cents, next_billing_date')
    .eq('user_id', userId)
    .eq('active', true)
    .not('next_billing_date', 'is', null);

  if (!subs?.length) return;

  const now = new Date();

  for (const sub of subs) {
    const billing = new Date(sub.next_billing_date as string);
    const daysUntil = Math.round((billing.getTime() - now.getTime()) / 86400000);
    const amount = ((sub.amount_cents as number) / 100).toFixed(0);
    const name = sub.name as string;

    if (daysUntil <= 0) {
      await createAutoNotification(admin, {
        userId,
        type: `sub_today_${sub.id as string}`,
        title: '🚨 Subscription Renewing Today',
        body: `${name} renews TODAY — ₹${amount}`,
        actionUrl: '/dashboard/subscriptions',
      });
    } else if (daysUntil <= 3) {
      await createAutoNotification(admin, {
        userId,
        type: `sub_soon_${sub.id as string}`,
        title: '💳 Subscription Renewing Soon',
        body: `${name} renews in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — ₹${amount}`,
        actionUrl: '/dashboard/subscriptions',
      });
    } else if (daysUntil <= 7) {
      await createAutoNotification(admin, {
        userId,
        type: `sub_week_${sub.id as string}`,
        title: '📅 Subscription Due This Week',
        body: `${name} due this week — ₹${amount}`,
        actionUrl: '/dashboard/subscriptions',
      });
    }
  }
}

async function checkSavingsDeadlines(admin: AdminClient, userId: string): Promise<void> {
  const { data: goals } = await admin
    .from('savings_goals')
    .select('id, name, target_cents, current_cents, deadline')
    .eq('user_id', userId)
    .eq('completed', false)
    .not('deadline', 'is', null);

  if (!goals?.length) return;

  const now = new Date();

  for (const goal of goals) {
    const deadline = new Date(goal.deadline as string);
    const daysRemaining = Math.round((deadline.getTime() - now.getTime()) / 86400000);
    const target = goal.target_cents as number;
    const current = goal.current_cents as number;
    const pct = target > 0 ? Math.round((current / target) * 100) : 0;
    const name = goal.name as string;

    if (daysRemaining < 0) {
      await createAutoNotification(admin, {
        userId,
        type: `savings_overdue_${goal.id as string}`,
        title: '⏰ Savings Deadline Passed',
        body: `${name} deadline passed — ${pct}% complete`,
        actionUrl: '/dashboard/savings',
      });
    } else if (daysRemaining <= 7) {
      await createAutoNotification(admin, {
        userId,
        type: `savings_deadline_${goal.id as string}`,
        title: '🎯 Savings Deadline Approaching',
        body: `${name} deadline in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} — ${pct}% complete`,
        actionUrl: '/dashboard/savings',
      });
    }
  }
}

async function checkUnsettledBalances(admin: AdminClient, userId: string): Promise<void> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const { data: myMembers } = await admin
    .from('trip_members')
    .select('id, trip_id')
    .eq('user_id', userId);

  if (!myMembers?.length) return;

  const memberIds = myMembers.map(m => m.id as string);
  const tripIds = myMembers.map(m => m.trip_id as string);

  const { data: tripRows } = await admin
    .from('trips')
    .select('id, name')
    .in('id', tripIds);

  const tripMap = new Map(
    (tripRows ?? []).map(t => [t.id as string, t.name as string])
  );

  const { data: expenses } = await admin
    .from('expenses')
    .select('id, title, trip_id, date, paid_by_member_id')
    .in('paid_by_member_id', memberIds)
    .lte('date', threeDaysAgo);

  if (!expenses?.length) return;

  const expenseIds = expenses.map(e => e.id as string);

  const { data: splitRows } = await admin
    .from('expense_splits')
    .select('expense_id, member_id, amount')
    .in('expense_id', expenseIds);

  const splitsMap = new Map<string, { member_id: string; amount: number }[]>();
  for (const s of splitRows ?? []) {
    const key = s.expense_id as string;
    if (!splitsMap.has(key)) splitsMap.set(key, []);
    splitsMap.get(key)!.push({ member_id: s.member_id as string, amount: Number(s.amount) });
  }

  for (const expense of expenses) {
    const splits = splitsMap.get(expense.id as string) ?? [];
    const othersOwed = splits
      .filter(s => s.member_id !== (expense.paid_by_member_id as string))
      .reduce((sum, s) => sum + s.amount, 0);

    if (othersOwed > 0.5) {
      const tripName = tripMap.get(expense.trip_id as string) ?? 'your trip';
      const daysAgo = Math.floor(
        (Date.now() - new Date(expense.date as string).getTime()) / 86400000
      );
      await createAutoNotification(admin, {
        userId,
        type: `unsettled_${expense.id as string}`,
        title: '💰 Unsettled Balance',
        body: `₹${othersOwed.toFixed(0)} owed to you from "${expense.title as string}" in ${tripName} · ${daysAgo} days ago`,
        actionUrl: `/dashboard/trips/${expense.trip_id as string}`,
      });
    }
  }
}

async function checkWeeklySummary(admin: AdminClient, userId: string): Promise<void> {
  const now = new Date();
  if (now.getDay() !== 0) return;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const { data: expenses } = await admin
    .from('expenses')
    .select('amount, category')
    .eq('created_by', userId)
    .gte('date', sevenDaysAgo)
    .lte('date', today);

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const cats = new Set((expenses ?? []).map(e => e.category).filter(Boolean));

  await createAutoNotification(admin, {
    userId,
    type: 'weekly_summary',
    title: '📊 Weekly Summary',
    body: `You spent ₹${total.toFixed(0)} this week across ${cats.size} categor${cats.size === 1 ? 'y' : 'ies'}`,
    actionUrl: '/dashboard/analytics',
  });
}

export async function checkAndCreateAutoNotifications(userId: string): Promise<void> {
  const admin = createAdminClient();
  await Promise.allSettled([
    checkBudgets(admin, userId),
    checkSubscriptions(admin, userId),
    checkSavingsDeadlines(admin, userId),
    checkUnsettledBalances(admin, userId),
    checkWeeklySummary(admin, userId),
  ]);
}
