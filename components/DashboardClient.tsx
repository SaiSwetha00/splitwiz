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

  if (data.balance.net > 0) {
    return `You're owed ${sym}${data.balance.net.toFixed(2)} 💰`;
  }

  const todaySub = data.subscriptions.dueSoon.find(s => s.next_billing_date && isToday(parseISO(s.next_billing_date)));
  if (todaySub) {
    return `${todaySub.name} renews today — ${sym}${(todaySub.amount_cents / 100).toFixed(0)} 💳`;
  }

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
  gradFrom: string;
  gradTo: string;
  sparkData?: number[];
  valueColor?: string;
  animated?: boolean;
  icon: React.ReactNode;
}

function StatCard({ href, label, value, prefix = '', suffix = '', sub, color, gradFrom, gradTo, sparkData, valueColor, animated = true, icon }: StatCardProps) {
  const displayed = useCountUp(value, animated);
  const displayStr = Number.isInteger(value)
    ? Math.round(displayed).toLocaleString()
    : displayed.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <Link
      href={href}
      className="group stat-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0f0f1a',
        padding: '1rem',
        textDecoration: 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px ${gradTo}25`;
        el.style.borderColor = `${gradTo}30`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = '';
        el.style.borderColor = 'rgba(255,255,255,0.06)';
      }}
    >
      {/* Label + gradient icon box */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>
          {label}
        </span>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${gradTo}50`,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value + sub */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <span
            style={{
              display: 'block',
              fontFamily: "'Clash Display', sans-serif",
              fontSize: '1.625rem',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: valueColor ?? '#ffffff',
            }}
          >
            {prefix}{displayStr}{suffix}
          </span>
          <p style={{ marginTop: 5, fontSize: 12, color: '#94a3b8', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
            {sub}
          </p>
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

  if (data.trips.count > 0 && data.balance.net === 0 && data.recent.length === 0) {
    alerts.push({ id: 'all-settled', severity: 'good', emoji: '✅', text: 'All balances are settled! 🎉' });
  }

  if (data.expenses.lastMonthTotal > 0 && data.expenses.thisMonthTotal < data.expenses.lastMonthTotal * 0.9) {
    alerts.push({ id: 'under-budget', severity: 'good', emoji: '✅', text: `You're spending less than last month — great job!` });
  }

  if (data.savings.totalSaved > 0 && data.savings.totalTarget > 0) {
    const pct = Math.round((data.savings.totalSaved / data.savings.totalTarget) * 100);
    if (pct >= 50 && pct < 100) {
      alerts.push({ id: `savings-${pct}`, severity: 'good', emoji: '✅', text: `You've reached ${pct}% of your savings goals!` });
    }
  }

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
  urgent:  { bg: 'rgba(254,21,20,0.08)',    border: 'rgba(254,21,20,0.25)',   text: '#FE1514' },
  warning: { bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.25)',  text: '#F59E0B' },
  tip:     { bg: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.25)',  text: '#818cf8' },
  good:    { bg: 'rgba(69,216,129,0.08)',   border: 'rgba(69,216,129,0.25)', text: '#45D881' },
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
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map(alert => {
        const c = ALERT_COLORS[alert.severity];
        return (
          <div
            key={alert.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.875rem', borderRadius: 12,
              background: c.bg, border: `1px solid ${c.border}`,
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{alert.emoji}</span>
            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500, color: c.text, fontFamily: "'DM Sans', sans-serif" }}>{alert.text}</span>
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

const QA_ACTIONS = [
  {
    key: 'scan',
    label: 'Scan Receipt',
    href: '/dashboard/trips',
    color: '#06b6d4',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    key: 'ai',
    label: 'Ask AI',
    href: '#insights',
    color: '#8b5cf6',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.45 4.45L18 9l-4.55 1.55L12 15l-1.45-4.45L6 9l4.55-1.55L12 3z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
      </svg>
    ),
  },
  {
    key: 'expense',
    label: 'Add Expense',
    href: '/dashboard/trips',
    color: '#6366f1',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    key: 'savings',
    label: 'Add Savings',
    href: '/dashboard/savings',
    color: '#45D881',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
];

function QuickActions() {
  return (
    <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {QA_ACTIONS.map(a => (
        <Link
          key={a.key}
          href={a.href}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', borderRadius: 999,
            background: '#0f0f1a',
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: 13, fontWeight: 600,
            color: '#ffffff',
            textDecoration: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = `${a.color}40`;
            el.style.boxShadow = `0 0 0 1px ${a.color}20, 0 4px 12px ${a.color}15`;
            el.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(255,255,255,0.06)';
            el.style.boxShadow = '';
            el.style.transform = '';
          }}
        >
          <span style={{ color: a.color }}>{a.icon}</span>
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
    const key = date.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + amount);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));
}

function labelForPeriod(date: string, period: ChartPeriod): string {
  try {
    if (period === 'monthly') return format(parseISO(`${date}-01`), 'MMM');
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
    return all.slice(-30);
  }, [data.expenses.dailyData, period]);

  const labeled = useMemo(
    () => chartData.map(d => ({ ...d, label: labelForPeriod(d.date, period) })),
    [chartData, period],
  );

  return (
    <div
      style={{
        flex: '1 1 0', minWidth: 0,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0f0f1a',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.875rem', fontFamily: "'Clash Display', sans-serif", margin: 0 }}>
          Spending Overview
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['daily', 'weekly', 'monthly'] as ChartPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem',
                fontWeight: 600, border: '1px solid',
                borderColor: period === p ? '#6366f1' : 'rgba(255,255,255,0.06)',
                background: period === p ? '#6366f1' : 'transparent',
                color: period === p ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s',
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
            <linearGradient id="tealIndigoArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="tealIndigoLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${sym}${Number(v).toFixed(0)}`}
          />
          <Tooltip
            formatter={(v) => [`${sym}${Number(v ?? 0).toFixed(2)}`, 'Spent']}
            labelFormatter={l => String(l)}
            contentStyle={{
              background: '#0f0f1a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontFamily: "'DM Sans', sans-serif",
            }}
            itemStyle={{ color: '#06b6d4' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="url(#tealIndigoLine)"
            strokeWidth={2}
            fill="url(#tealIndigoArea)"
            dot={false}
            activeDot={{ r: 4, fill: '#06b6d4', stroke: '#0f0f1a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Category Chart ──────────────────────────────────────────────────────────

const CAT_COLORS = ['#6366f1', '#06b6d4', '#F59E0B', '#ec4899', '#8b5cf6', '#45D881', '#3b82f6', '#f97316'];

function CategoryChart({ data, sym }: { data: DashboardStats; sym: string }) {
  const catData = data.categoryData;
  const total = catData.reduce((s, c) => s + c.amount, 0);

  return (
    <div
      style={{
        width: '33%', minWidth: 200, flexShrink: 0,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0f0f1a',
        padding: '1.25rem',
      }}
    >
      <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem', fontFamily: "'Clash Display', sans-serif", margin: '0 0 12px' }}>
        By Category
      </h3>
      {catData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#6366f1',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <line x1="2" y1="20" x2="22" y2="20" />
            </svg>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif" }}>No expenses this month</p>
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
              <span style={{ fontWeight: 700, fontSize: '0.875rem', fontFamily: "'Clash Display', sans-serif" }}>{sym}{total.toFixed(0)}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>total</span>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {catData.slice(0, 5).map((c, i) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{c.name}</span>
                <span style={{ color: '#94a3b8', flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>{total > 0 ? Math.round((c.amount / total) * 100) : 0}%</span>
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
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0f0f1a',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, fontFamily: "'Clash Display', sans-serif" }}>
          Recent Transactions
        </h3>
        <Link
          href="/dashboard/transactions"
          style={{ fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
        >
          View All →
        </Link>
      </div>
      {data.recent.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0', fontFamily: "'DM Sans', sans-serif" }}>
          No transactions yet
        </p>
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
                padding: '0.55rem 0.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {TX_ICONS[tx.type] ?? '💳'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
                    {tx.description ?? tx.type.replace(/_/g, ' ')}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem', fontFamily: "'DM Sans', sans-serif" }}>{date}</p>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isIn ? '#45D881' : '#FE1514', flexShrink: 0, fontFamily: "'Clash Display', sans-serif" }}>
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
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0f0f1a',
        padding: '1rem',
        animation: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ height: 12, width: '45%', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }} />
      </div>
      <div style={{ height: 28, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 10, width: '75%', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient({ displayName }: Props) {
  const { data, loading, error } = useDashboardData();
  const [greeting] = useState(getSmartGreeting);
  const animated = data !== null;

  const sym = data ? currencySymbol(data.currency) : '₹';

  const balSpark = useMemo(() => data?.balance.sparkline.map(p => p.value) ?? [], [data]);
  const expSpark = useMemo(() => data?.expenses.dailyData.slice(-30).map(d => d.amount) ?? [], [data]);

  const subtitle = useMemo(() => data ? getSmartSubtitle(data) : "Here's what's happening with your finances", [data]);

  const momLabel = useMemo(() => {
    if (!data) return '';
    const { thisMonthTotal, lastMonthTotal } = data.expenses;
    if (lastMonthTotal === 0) return 'first month tracked';
    const pct = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
  }, [data]);

  const savingsPct = data && data.savings.totalTarget > 0
    ? Math.round((data.savings.totalSaved / data.savings.totalTarget) * 100)
    : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            {greeting}, {displayName} 👋
          </h2>
          <p style={{ marginTop: 6, fontSize: '0.875rem', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>
            {subtitle}
          </p>
        </div>
        <Link
          href="/dashboard/trips"
          className="btn-shimmer"
          style={{
            flexShrink: 0,
            borderRadius: 12,
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#ffffff',
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          + New Trip
        </Link>
      </div>

      {/* Stat cards */}
      <div className="stagger-fade grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : error ? (
          <div style={{ gridColumn: 'span 4', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: '#0f0f1a', padding: 16, fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
            Failed to load dashboard data
          </div>
        ) : data ? (
          <>
            <StatCard
              href="/dashboard/trips"
              label="Net Balance"
              value={Math.abs(data.balance.net)}
              prefix={sym}
              sub={`across ${data.trips.activeCount} active trip${data.trips.activeCount !== 1 ? 's' : ''}`}
              color="#06b6d4"
              gradFrom="#0e7490"
              gradTo="#06b6d4"
              valueColor={data.balance.net > 0 ? '#45D881' : data.balance.net < 0 ? '#FE1514' : undefined}
              sparkData={balSpark}
              animated={animated}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
            />
            <StatCard
              href="/dashboard/analytics"
              label="This Month"
              value={data.expenses.thisMonthTotal}
              prefix={sym}
              sub={momLabel}
              color="#45D881"
              gradFrom="#065f46"
              gradTo="#45D881"
              sparkData={expSpark}
              animated={animated}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              }
            />
            <StatCard
              href="/dashboard/savings"
              label="Savings Progress"
              value={savingsPct}
              suffix="%"
              sub={`${sym}${data.savings.totalSaved.toFixed(0)} of ${sym}${data.savings.totalTarget.toFixed(0)} goal`}
              color="#6366f1"
              gradFrom="#3730a3"
              gradTo="#6366f1"
              animated={animated}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              }
            />
            <StatCard
              href="/dashboard/subscriptions"
              label="Due This Week"
              value={data.subscriptions.dueSoonTotal}
              prefix={sym}
              sub={`${data.subscriptions.dueSoonCount} payment${data.subscriptions.dueSoonCount !== 1 ? 's' : ''} this week`}
              color="#F59E0B"
              gradFrom="#92400e"
              gradTo="#F59E0B"
              animated={animated}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      {data && <QuickActions />}

      {/* Charts */}
      {data && (
        <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <SpendingChart data={data} sym={sym} />
          <CategoryChart data={data} sym={sym} />
        </div>
      )}

      {/* Recent transactions */}
      {data && (
        <div style={{ marginBottom: 32 }}>
          <RecentTransactions data={data} sym={sym} />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
