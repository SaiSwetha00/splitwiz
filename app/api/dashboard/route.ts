import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { checkAndCreateAutoNotifications } from '@/lib/notifications';
import type { DashboardStats } from '@/types/dashboard';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tripsRes, expensesRes, savingsRes, subsRes, notifRes, txRes] = await Promise.all([
    admin.from('trips').select('id, currency, status').eq('user_id', user.id),

    admin
      .from('expenses')
      .select('amount, amount_cents, category, date, trip_id')
      .eq('created_by', user.id)
      .gte('date', sixMonthsAgo)
      .order('date', { ascending: true }),

    admin
      .from('savings_goals')
      .select('id, name, target_cents, current_cents, deadline')
      .eq('user_id', user.id)
      .eq('completed', false),

    admin
      .from('subscriptions')
      .select('id, name, amount_cents, billing_cycle, next_billing_date')
      .eq('user_id', user.id)
      .eq('active', true),

    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),

    admin
      .from('transactions')
      .select('id, type, amount, currency, description, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const trips = tripsRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const goals = savingsRes.data ?? [];
  const subs = subsRes.data ?? [];
  const unreadCount = notifRes.count ?? 0;
  const txRows = txRes.data ?? [];

  // Monthly expense stats
  function expenseAmt(e: { amount: number | null; amount_cents: number }): number {
    return Number(e.amount) > 0 ? Number(e.amount) : e.amount_cents / 100;
  }
  const thisMonth = expenses.filter(e => e.date >= thisMonthStart);
  const lastMonth = expenses.filter(e => e.date >= lastMonthStart && e.date <= lastMonthEnd);
  const thisMonthTotal = thisMonth.reduce((s, e) => s + expenseAmt(e), 0);
  const lastMonthTotal = lastMonth.reduce((s, e) => s + expenseAmt(e), 0);

  // Daily expense data (last 6 months) for chart
  const dailyMap = new Map<string, number>();
  for (const e of expenses) {
    const key = e.date.split('T')[0];
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + expenseAmt(e));
  }
  const dailyData = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

  // Category breakdown (this month)
  const catMap = new Map<string, number>();
  for (const e of thisMonth) {
    const cat = e.category ?? 'Other';
    catMap.set(cat, (catMap.get(cat) ?? 0) + expenseAmt(e));
  }
  const categoryData = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));

  // Savings
  const totalTarget = goals.reduce((s, g) => s + g.target_cents, 0) / 100;
  const totalSaved = goals.reduce((s, g) => s + g.current_cents, 0) / 100;

  // Subscriptions
  const monthlyTotal = subs.reduce((sum, s) => {
    if (s.billing_cycle === 'monthly') return sum + s.amount_cents;
    if (s.billing_cycle === 'yearly') return sum + Math.round(s.amount_cents / 12);
    if (s.billing_cycle === 'weekly') return sum + s.amount_cents * 4;
    return sum;
  }, 0) / 100;

  const dueSoon = subs.filter(s => s.next_billing_date && s.next_billing_date <= sevenDaysLater);
  const dueSoonTotal = dueSoon.reduce((s, sub) => s + sub.amount_cents, 0) / 100;

  // Net balance from transactions
  let moneyIn = 0;
  let moneyOut = 0;
  for (const tx of txRows) {
    if (tx.type === 'settlement_received') moneyIn += Number(tx.amount);
    else if (tx.type === 'settlement_paid') moneyOut += Number(tx.amount);
  }
  const net = Math.round((moneyIn - moneyOut) * 100) / 100;

  // Balance sparkline (last 7 days, daily net)
  const sparkMap = new Map<string, number>();
  for (const tx of txRows.filter(t => t.created_at >= sevenDaysAgo)) {
    const day = tx.created_at.split('T')[0];
    const delta =
      tx.type === 'settlement_received' ? Number(tx.amount) :
      tx.type === 'settlement_paid' ? -Number(tx.amount) : 0;
    sparkMap.set(day, (sparkMap.get(day) ?? 0) + delta);
  }
  const sparkline = Array.from(sparkMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));

  // Active trips count and default currency
  const activeTripsCount = trips.filter(t => !t.status || t.status === 'active').length;
  const currency = trips[0]?.currency ?? 'INR';

  const stats: DashboardStats = {
    trips: { count: trips.length, activeCount: activeTripsCount },
    expenses: { thisMonthTotal, lastMonthTotal, dailyData },
    categoryData,
    savings: {
      totalSaved,
      totalTarget,
      goalsCount: goals.length,
      goals: goals.map(g => ({
        id: g.id, name: g.name, deadline: g.deadline,
        current_cents: g.current_cents, target_cents: g.target_cents,
      })),
    },
    subscriptions: {
      monthlyTotal,
      dueSoon: dueSoon.map(s => ({
        id: s.id, name: s.name, amount_cents: s.amount_cents,
        billing_cycle: s.billing_cycle, next_billing_date: s.next_billing_date,
      })),
      dueSoonTotal,
      dueSoonCount: dueSoon.length,
    },
    notifications: { unreadCount },
    balance: { net, moneyIn, moneyOut, sparkline },
    recent: txRows.slice(0, 8).map(t => ({
      id: t.id, type: t.type, amount: Number(t.amount),
      currency: t.currency, description: t.description,
      status: t.status, created_at: t.created_at,
    })),
    currency,
  };

  void checkAndCreateAutoNotifications(user.id);

  return NextResponse.json(stats);
}
