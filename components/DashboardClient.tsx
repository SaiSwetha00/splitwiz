'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { format, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { currencySymbol } from '@/lib/money';
import type { DashboardStats, DailyExpense } from '@/types/dashboard';

type ChartPeriod = 'daily' | 'weekly' | 'monthly';

interface Props {
  userId: string;
  displayName: string;
}

// ─── Greeting ────────────────────────────────────────────────────────────────

function getSmartGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Working late';
}

function getSmartSubtitle(data: DashboardStats): string {
  const sym = currencySymbol(data.currency);

  // 1. Net balance owed to you
  if (data.balance.net > 0) {
    return `You're owed ${sym}${data.balance.net.toFixed(2)} 💰`;
  }

  // 2. Subscription due today
  const todaySub = data.subscriptions.dueSoon.find(s => s.next_billing_date && isToday(parseISO(s.next_billing_date)));
  if (todaySub) {
    return `${todaySub.name} renews today — ${sym}${(todaySub.amount_cents / 100).toFixed(0)} 💳`;
  }

  // 3. Subscription due in ≤ 3 days
  const soonSub = data.subscriptions.dueSoon.find(s => {
    if (!s.next_billing_date) return false;
    const d = differenceInDays(parseISO(s.next_billing_date), new Date());
    return d >= 1 && d <= 3;
  });
  if (soonSub && soonSub.next_billing_date) {
    const d = differenceInDays(parseISO(soonSub.next_billing_date), new Date());
    const when = isTomorrow(parseISO(soonSub.next_billing_date)) ? 'tomorrow' : `in ${d} days`;
    return `${soonSub.name} renews ${when}`;
  }

  // 4. Savings goal deadline in 7 days
  const urgentGoal = data.savings.goals.find(g => {
    if (!g.deadline) return false;
    const d = differenceInDays(parseISO(g.deadline), new Date());
    return d >= 0 && d <= 7;
  });
  if (urgentGoal && urgentGoal.deadline) {
    const d = differenceInDays(parseISO(urgentGoal.deadline), new Date());
    const pct = urgentGoal.target_cents > 0
      ? Math.round((urgentGoal.current_cents / urgentGoal.target_cents) * 100)
      : 0;
    return `${urgentGoal.name} deadline in ${d} days — ${pct}% complete 🎯`;
  }

  return "Here's what's happening with your finances";
}

// ─── Count-up animation ──────────────────────────────────────────────────────

function useCountUp(target: number, enabled: boolean, duration = 900): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target === 0) {
      // Use RAF to avoid synchronous setState in effect body
      rafRef.current = requestAnimationFrame(() => setCurrent(target));
      return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    }
    let start: number | null = null;
    function step(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, enabled, duration]);

  return current;
}

// ─── Sparkline SVG ──────────────────────────────────────────────────────────

function Sparkline({ data, color, w = 64, h = 28 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  href: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub: string;
  color: string;
  sparkData?: number[];
  valueColor?: string;
  animated?: boolean;
  icon: React.ReactNode;
}

function StatCard({ href, label, value, prefix = '', suffix = '', sub, color, sparkData, valueColor, animated = true, icon }: StatCardProps) {
  const displayed = useCountUp(value, animated);
  const displayStr = Number.isInteger(value)
    ? Math.round(displayed).toLocaleString()
    : displayed.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 transition-all hover:border-accent hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <span
            className="text-2xl font-bold leading-none tracking-tight tabular-nums"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {prefix}{displayStr}{suffix}
          </span>
          <p className="mt-1 text-xs text-muted leading-snug">{sub}</p>
        </div>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
    </Link>
  );
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

type AlertSeverity = 'urgent' | 'warning' | 'tip' | 'good';

interface Alert {
  id: string;
  severity: AlertSeverity;
  emoji: string;
  text: string;
}

const DISMISSED_KEY = 'splitwiz_dismissed_alerts_v1';

function getDismissed(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DISMISSED_KEY) : null;
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

function generateAlerts(data: DashboardStats): Alert[] {
  const alerts: Alert[] = [];
  const sym = currencySymbol(data.currency);

  // Good: all trips settled (net = 0 and no recent transactions)
  if (data.trips.count > 0 && data.balance.net === 0 && data.recent.length === 0) {
    alerts.push({ id: 'all-settled', severity: 'good', emoji: '✅', text: 'All balances are settled! 🎉' });
  }

  // Good: under budget (spending less than last month)
  if (data.expenses.lastMonthTotal > 0 && data.expenses.thisMonthTotal < data.expenses.lastMonthTotal * 0.9) {
    alerts.push({ id: 'under-budget', severity: 'good', emoji: '✅', text: `You're spending less than last month — great job!` });
  }

  // Good: savings milestone (saved this month)
  if (data.savings.totalSaved > 0 && data.savings.totalTarget > 0) {
    const pct = Math.round((data.savings.totalSaved / data.savings.totalTarget) * 100);
    if (pct >= 50 && pct < 100) {
      alerts.push({ id: `savings-${pct}`, severity: 'good', emoji: '✅', text: `You've reached ${pct}% of your savings goals!` });
    }
  }

  // Warning: subscription due in 1-3 days
  for (const s of data.subscriptions.dueSoon) {
    if (!s.next_billing_date) continue;
    const d = differenceInDays(parseISO(s.next_billing_date), new Date());
    if (d >= 1 && d <= 3) {
      alerts.push({
        id: `sub-due-${s.id}`,
        severity: 'warning',
        emoji: '⚠️',
        text: `${s.name} renews in ${d} day${d !== 1 ? 's' : ''} — ${sym}${(s.amount_cents / 100).toFixed(0)}`,
      });
    }
    if (d === 0) {
      alerts.push({
        id: `sub-today-${s.id}`,
        severity: 'urgent',
        emoji: '🚨',
        text: `${s.name} renews today — ${sym}${(s.amount_cents / 100).toFixed(0)}`,
      });
    }
  }

  // Tip: weekend spending pattern
  const dailyData = data.expenses.dailyData;
  if (dailyData.length >= 14) {
    let weekendTotal = 0, weekendDays = 0, weekdayTotal = 0, weekdayDays = 0;
    for (const { date, amount } of dailyData) {
      const dow = parseISO(date).getDay();
      if (dow === 0 || dow === 6) { weekendTotal += amount; weekendDays++; }
      else { weekdayTotal += amount; weekdayDays++; }
    }
    const weekendAvg = weekendDays > 0 ? weekendTotal / weekendDays : 0;
    const weekdayAvg = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0;
    if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.4) {
      const extra = Math.round(((weekendAvg / weekdayAvg) - 1) * 100);
      alerts.push({ id: 'weekend-spend', severity: 'tip', emoji: '💡', text: `You spend ~${extra}% more on weekends` });
    }
  }

  return alerts.slice(0, 3);
}

const ALERT_COLORS: Record<AlertSeverity, { bg: string; border: string; text: string }> = {
  urgent:  { bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.3)',   text: '#dc2626' },
  warning: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  text: '#b45309' },
  tip:     { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.3)',  text: '#1d4ed8' },
  good:    { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)',  text: '#059669' },
};

function AlertsBar({ data }: { data: DashboardStats }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());

  const alerts = useMemo(() => generateAlerts(data), [data]);
  const visible = alerts.filter(a => !dismissed.has(a.id));

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  }

  if (visible.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {visible.map(alert => {
        const c = ALERT_COLORS[alert.severity];
        return (
          <div
            key={alert.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.875rem', borderRadius: '0.875rem',
              background: c.bg, border: `1px solid ${c.border}`,
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{alert.emoji}</span>
            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500, color: c.text }}>{alert.text}</span>
            <button
              onClick={() => dismiss(alert.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, opacity: 0.6, fontSize: '0.9rem', lineHeight: 1, padding: '0 2px' }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({ data }: { data: DashboardStats }) {
  const hasTrips = data.trips.count > 0;
  const hasBalance = data.balance.net < 0;

  const actions = [
    { emoji: '📷', label: 'Scan Receipt', href: '/dashboard/trips' },
    { emoji: '✨', label: 'Ask AI', href: '#insights' },
    hasTrips
      ? { emoji: '➕', label: 'Add Expense', href: '/dashboard/trips' }
      : { emoji: '✈️', label: 'New Trip', href: '/dashboard/trips' },
    hasBalance
      ? { emoji: '💸', label: 'Settle Up', href: '/dashboard/trips' }
      : { emoji: '🎯', label: 'Add Savings', href: '/dashboard/savings' },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {actions.map(a => (
        <Link
          key={a.label}
          href={a.href}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', borderRadius: '999px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)',
            textDecoration: 'none', transition: 'border-color 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
        >
          <span style={{ fontSize: '1rem' }}>{a.emoji}</span>
          {a.label}
        </Link>
      ))}
    </div>
  );
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

function groupByWeek(daily: DailyExpense[]): { date: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const { date, amount } of daily) {
    const d = parseISO(date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    map.set(key, (map.get(key) ?? 0) + amount);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));
}

function groupByMonth(daily: DailyExpense[]): { date: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const { date, amount } of daily) {
    const key = date.slice(0, 7); // YYYY-MM
    map.set(key, (map.get(key) ?? 0) + amount);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));
}

function labelForPeriod(date: string, period: ChartPeriod): string {
  try {
    if (period === 'monthly') {
      return format(parseISO(`${date}-01`), 'MMM');
    }
    return format(parseISO(date), 'MMM d');
  } catch { return date; }
}

// ─── Spending Chart ──────────────────────────────────────────────────────────

function SpendingChart({ data, sym }: { data: DashboardStats; sym: string }) {
  const [period, setPeriod] = useState<ChartPeriod>('daily');

  const chartData = useMemo(() => {
    const all = data.expenses.dailyData;
    if (period === 'weekly') return groupByWeek(all);
    if (period === 'monthly') return groupByMonth(all);
    // Daily: last 30 data points
    return all.slice(-30);
  }, [data.expenses.dailyData, period]);

  const labeled = useMemo(
    () => chartData.map(d => ({ ...d, label: labelForPeriod(d.date, period) })),
    [chartData, period],
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-5" style={{ flex: '1 1 0', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Spending Overview</h3>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['daily', 'weekly', 'monthly'] as ChartPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem',
                fontWeight: 600, border: '1px solid',
                borderColor: period === p ? 'var(--accent)' : 'var(--border)',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? 'var(--accent-foreground)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={labeled} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${sym}${Number(v).toFixed(0)}`}
          />
          <Tooltip
            formatter={(v) => [`${sym}${Number(v ?? 0).toFixed(2)}`, 'Spent']}
            labelFormatter={l => String(l)}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#tealGrad)"
            dot={false}
            activeDot={{ r: 3, fill: '#14b8a6' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Category Chart ──────────────────────────────────────────────────────────

const CAT_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#f97316'];

function CategoryChart({ data, sym }: { data: DashboardStats; sym: string }) {
  const catData = data.categoryData;
  const total = catData.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5" style={{ width: '33%', minWidth: 200, flexShrink: 0 }}>
      <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>By Category</h3>
      {catData.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', padding: '2rem 0' }}>
          No expenses this month
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <PieChart width={160} height={160}>
              <Pie
                data={catData}
                cx={75}
                cy={75}
                innerRadius={52}
                outerRadius={72}
                dataKey="amount"
                strokeWidth={0}
              >
                {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{sym}{total.toFixed(0)}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>total</span>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {catData.slice(0, 5).map((c, i) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{total > 0 ? Math.round((c.amount / total) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Recent Transactions ─────────────────────────────────────────────────────

const TX_ICONS: Record<string, string> = {
  settlement_paid:     '💸',
  settlement_received: '💰',
  expense:             '🧾',
};

function RecentTransactions({ data, sym }: { data: DashboardStats; sym: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent Transactions</h3>
        <Link href="/dashboard/transactions" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          View All →
        </Link>
      </div>
      {data.recent.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center', padding: '1.5rem 0' }}>No transactions yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          {data.recent.map(tx => {
            const isIn = tx.type === 'settlement_received';
            const date = (() => {
              try { return format(parseISO(tx.created_at), 'MMM d'); } catch { return ''; }
            })();
            return (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.55rem 0.25rem', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {TX_ICONS[tx.type] ?? '💳'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description ?? tx.type.replace(/_/g, ' ')}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{date}</p>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isIn ? 'var(--positive)' : 'var(--negative)', flexShrink: 0 }}>
                  {isIn ? '+' : '-'}{sym}{tx.amount.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 animate-pulse">
      <div style={{ height: 12, width: '50%', background: 'var(--border)', borderRadius: 4 }} />
      <div style={{ height: 28, width: '65%', background: 'var(--border)', borderRadius: 4 }} />
      <div style={{ height: 10, width: '75%', background: 'var(--border)', borderRadius: 4 }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient({ displayName }: Props) {
  const { data, loading, error } = useDashboardData();
  const [greeting] = useState(getSmartGreeting);
  const animated = data !== null;

  const sym = data ? currencySymbol(data.currency) : '₹';

  // Sparkline arrays for cards
  const balSpark = useMemo(() => data?.balance.sparkline.map(p => p.value) ?? [], [data]);
  const expSpark = useMemo(() => data?.expenses.dailyData.slice(-30).map(d => d.amount) ?? [], [data]);

  const subtitle = useMemo(() => data ? getSmartSubtitle(data) : "Here's what's happening with your finances", [data]);

  // Month-over-month label
  const momLabel = useMemo(() => {
    if (!data) return '';
    const { thisMonthTotal, lastMonthTotal } = data.expenses;
    if (lastMonthTotal === 0) return 'first month tracked';
    const pct = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
  }, [data]);

  // Savings pct
  const savingsPct = data && data.savings.totalTarget > 0
    ? Math.round((data.savings.totalSaved / data.savings.totalTarget) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {greeting}, {displayName} 👋
          </h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <Link
          href="/dashboard/trips"
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          + New trip
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : error ? (
          <div className="col-span-4 rounded-2xl border border-border bg-surface p-4 text-sm text-muted text-center">
            Failed to load dashboard data
          </div>
        ) : data ? (
          <>
            {/* Card 1: Net Balance */}
            <StatCard
              href="/dashboard/trips"
              label="Net Balance"
              value={Math.abs(data.balance.net)}
              prefix={sym}
              sub={`across ${data.trips.activeCount} active trip${data.trips.activeCount !== 1 ? 's' : ''}`}
              color={data.balance.net > 0 ? '#10b981' : data.balance.net < 0 ? '#ef4444' : '#9ca3af'}
              valueColor={data.balance.net > 0 ? 'var(--positive)' : data.balance.net < 0 ? 'var(--negative)' : undefined}
              sparkData={balSpark}
              animated={animated}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
            />
            {/* Card 2: Monthly Expenses */}
            <StatCard
              href="/dashboard/analytics"
              label="This Month"
              value={data.expenses.thisMonthTotal}
              prefix={sym}
              sub={momLabel}
              color="#6366f1"
              sparkData={expSpark}
              animated={animated}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              }
            />
            {/* Card 3: Savings */}
            <StatCard
              href="/dashboard/savings"
              label="Savings Progress"
              value={savingsPct}
              suffix="%"
              sub={`${sym}${data.savings.totalSaved.toFixed(0)} of ${sym}${data.savings.totalTarget.toFixed(0)} goal`}
              color="#10b981"
              animated={animated}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
            {/* Card 4: Upcoming Payments */}
            <StatCard
              href="/dashboard/subscriptions"
              label="Due This Week"
              value={data.subscriptions.dueSoonTotal}
              prefix={sym}
              sub={`${data.subscriptions.dueSoonCount} payment${data.subscriptions.dueSoonCount !== 1 ? 's' : ''} this week`}
              color="#f59e0b"
              animated={animated}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            />
          </>
        ) : null}
      </div>

      {/* Alerts */}
      {data && <AlertsBar data={data} />}

      {/* Quick actions */}
      {data && <QuickActions data={data} />}

      {/* Charts */}
      {data && (
        <div className="mb-6" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <SpendingChart data={data} sym={sym} />
          <CategoryChart data={data} sym={sym} />
        </div>
      )}

      {/* Recent transactions */}
      {data && (
        <div className="mb-8">
          <RecentTransactions data={data} sym={sym} />
        </div>
      )}
    </div>
  );
}
