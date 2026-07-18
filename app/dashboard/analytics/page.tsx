"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, ComposedChart, Line,
} from "recharts";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineEntry = { date: string; amount: number };
type CategoryEntry = { name: string; amount: number; count: number };
type BudgetEntry = { id: string; name: string; limit: number; spent: number };
type TripEntry = { id: string; name: string; code: string; total: number };
type MonthEntry = { label: string; key: string; total: number; average?: number };
type MemberEntry = { name: string; paid: number };
type TableExpense = {
  id: string; date: string; title: string; category: string | null;
  tripName: string; tripCode: string; paidByName: string;
  amount: number; currency: string; note: string | null;
};

type Analytics2Data = {
  currency: string;
  totalSpent: number; expenseCount: number; avgPerDay: number;
  biggestExpense: { amount: number; title: string } | null;
  timeline: TimelineEntry[]; categories: CategoryEntry[];
  budgets: BudgetEntry[]; trips: TripEntry[]; monthly: MonthEntry[];
  members?: MemberEntry[]; expenses: TableExpense[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_COLORS = [
  "#6366f1","#14b8a6","#f59e0b","#ef4444","#8b5cf6",
  "#ec4899","#10b981","#3b82f6","#f97316","#06b6d4",
];

const RANGE_TABS = ["Today", "Week", "Month", "Year", "Custom"] as const;
type RangeKey = (typeof RANGE_TABS)[number];

const PAGE_SIZE = 10;
type SortKey = "date" | "title" | "category" | "trip" | "amount";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(amount: number, currency: string) {
  return formatMoney(Math.round(amount * 100), currency);
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function computeRange(key: RangeKey, cf: string, ct: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  switch (key) {
    case "Today": return { from: today, to: today };
    case "Week": {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
    case "Year": return { from: `${now.getFullYear()}-01-01`, to: today };
    case "Custom": return { from: cf || today, to: ct || today };
    case "Month":
    default: {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
  }
}

function currentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8 text-muted">Loading analytics…</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function AnalyticsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeKey = (searchParams.get("range") ?? "Month") as RangeKey;
  const customFrom = searchParams.get("from") ?? "";
  const customTo   = searchParams.get("to")   ?? "";
  const [cfInput, setCfInput] = useState(customFrom);
  const [ctInput, setCtInput] = useState(customTo);

  const { from, to } = useMemo(
    () => computeRange(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo]
  );

  function setRange(key: RangeKey, cf?: string, ct?: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("range", key);
    if (cf) p.set("from", cf); else p.delete("from");
    if (ct) p.set("to", ct);   else p.delete("to");
    router.replace(`${pathname}?${p.toString()}`);
  }

  // ── Data ──
  const [data, setData] = useState<Analytics2Data | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics2?from=${from}&to=${to}`);
      if (res.ok) setData(await res.json() as Analytics2Data);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLoading(true));
    void loadData();
    return () => cancelAnimationFrame(frame);
  }, [loadData]);

  // ── Table state ──
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sortKey, setSortKey]     = useState<SortKey>("date");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("desc");
  const [tSearch, setTSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [tripFilter, setTripFilter] = useState("");
  const [page, setPage]           = useState(1);

  const tableExpenses = useMemo<TableExpense[]>(() => {
    if (!data) return [];
    let list = [...data.expenses];
    if (activeCat) list = list.filter(e => (e.category ?? "Uncategorized") === activeCat);
    if (catFilter)  list = list.filter(e => (e.category ?? "Uncategorized") === catFilter);
    if (tripFilter) list = list.filter(e => e.tripName === tripFilter);
    if (tSearch.trim()) {
      const q = tSearch.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || (e.category ?? "").toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date")     cmp = a.date.localeCompare(b.date);
      else if (sortKey === "title")    cmp = a.title.localeCompare(b.title);
      else if (sortKey === "category") cmp = (a.category ?? "").localeCompare(b.category ?? "");
      else if (sortKey === "trip")     cmp = a.tripName.localeCompare(b.tripName);
      else if (sortKey === "amount")   cmp = a.amount - b.amount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [data, activeCat, catFilter, tripFilter, tSearch, sortKey, sortDir]);

  const totalPages   = Math.max(1, Math.ceil(tableExpenses.length / PAGE_SIZE));
  const pageExpenses = tableExpenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }

  const uniqueCats  = useMemo(() => [...new Set((data?.expenses ?? []).map(e => e.category ?? "Uncategorized"))].sort(), [data]);
  const uniqueTrips = useMemo(() => [...new Set((data?.expenses ?? []).map(e => e.tripName))].sort(), [data]);

  // ── Monthly trend enrichment ──
  const monthlyWithAvg = useMemo<MonthEntry[]>(() => {
    if (!data?.monthly) return [];
    const avg = data.monthly.reduce((s, m) => s + m.total, 0) / Math.max(1, data.monthly.length);
    return data.monthly.map(m => ({ ...m, average: avg }));
  }, [data]);

  // ── Budget reference line ──
  const totalBudget = useMemo(() => (data?.budgets ?? []).reduce((s, b) => s + b.limit, 0), [data]);

  // ── CSV Export ──
  function exportCsv() {
    if (!data) return;
    const header = ["Date","Description","Category","Amount","Currency","Trip","Paid By","Note"];
    const rows = tableExpenses.map(e => [
      e.date,
      `"${e.title.replace(/"/g, '""')}"`,
      e.category ?? "",
      e.amount.toFixed(2),
      e.currency,
      `"${e.tripName.replace(/"/g, '""')}"`,
      e.paidByName,
      `"${(e.note ?? "").replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `analytics-${from}-to-${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const currency = data?.currency ?? "INR";
  const curKey   = currentMonthKey();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted">Spending insights · {from} → {to}</p>
        </div>
        <button
          onClick={exportCsv}
          className="shrink-0 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:border-accent hover:text-foreground"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* ── Date range pills ── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {RANGE_TABS.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              rangeKey === r
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
        {rangeKey === "Custom" && (
          <div className="flex items-center gap-2 mt-2 w-full sm:w-auto sm:mt-0">
            <input
              type="date"
              value={cfInput}
              onChange={e => setCfInput(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <span className="text-muted text-xs">to</span>
            <input
              type="date"
              value={ctInput}
              onChange={e => setCtInput(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => setRange("Custom", cfInput, ctInput)}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <AnalyticsSkeleton />
      ) : !data || data.expenseCount === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-3xl">📊</p>
          <p className="font-medium">No expenses in this period</p>
          <Link href="/dashboard/trips/new" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
            Create a trip
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Spent" value={fmtMoney(data.totalSpent, currency)} />
            <StatCard label="Transactions" value={String(data.expenseCount)} />
            <StatCard label="Avg per Day" value={fmtMoney(data.avgPerDay, currency)} />
            <StatCard
              label="Biggest Expense"
              value={data.biggestExpense ? fmtMoney(data.biggestExpense.amount, currency) : "—"}
              sub={data.biggestExpense?.title ?? undefined}
            />
          </div>

          {/* ── Chart 1: Timeline ── */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Spending Timeline
            </h2>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 320 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.timeline} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => v.slice(5)}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `₹${(v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0))}`}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v) => [fmtMoney(Number(v ?? 0), currency), "Spent"]}
                      labelFormatter={(l) => fmtDate(String(l))}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    />
                    {totalBudget > 0 && (
                      <ReferenceLine
                        y={totalBudget}
                        stroke="var(--negative)"
                        strokeDasharray="6 3"
                        label={{ value: "Budget", position: "insideTopRight", fontSize: 10, fill: "var(--negative)" }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      fill="url(#spendGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ── Charts 2 + 3 (half width) ── */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart 2: Category Donut */}
            {data.categories.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  By Category
                </h2>
                {activeCat && (
                  <button onClick={() => setActiveCat(null)} className="mb-2 text-xs text-accent hover:underline">
                    ✕ Clear filter: {activeCat}
                  </button>
                )}
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.categories}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive
                      onClick={(d) => {
                        const name = (d as { name?: string }).name;
                        if (typeof name === "string") {
                          setActiveCat(prev => prev === name ? null : name);
                          setPage(1);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {data.categories.map((_, i) => (
                        <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [fmtMoney(Number(v ?? 0), currency), ""]}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend
                      formatter={(value, entry) => {
                        const payload = (entry as { payload?: { amount?: number } }).payload;
                        const pct = data.totalSpent > 0 ? Math.round((Number(payload?.amount ?? 0) / data.totalSpent) * 100) : 0;
                        return `${String(value)} ${pct}%`;
                      }}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </section>
            )}

            {/* Chart 3: Budget vs Actual */}
            {data.budgets.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  Budget vs Actual
                </h2>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: 260 }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.budgets} margin={{ top: 5, right: 5, bottom: 30, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          tickLine={false}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          tickLine={false}
                          axisLine={false}
                          width={44}
                        />
                        <Tooltip
                          formatter={(v, name) => [fmtMoney(Number(v ?? 0), currency), name === "limit" ? "Budget" : "Spent"]}
                          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                        />
                        <Bar dataKey="limit" name="limit" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="spent" name="spent" radius={[4, 4, 0, 0]} maxBarSize={28}>
                          {data.budgets.map((b, i) => (
                            <Cell key={i} fill={b.spent > b.limit ? "#ef4444" : "#10b981"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── Chart 4: Trip Comparison (full width, horizontal) ── */}
          {data.trips.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                Trip Comparison — click to open
              </h2>
              <div className="overflow-x-auto">
                <div style={{ minWidth: 320 }}>
                  <ResponsiveContainer width="100%" height={Math.max(180, data.trips.length * 42)}>
                    <BarChart
                      data={data.trips}
                      layout="vertical"
                      margin={{ top: 0, right: 60, bottom: 0, left: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        tick={{ fontSize: 11, fill: "var(--muted)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 12, fill: "var(--foreground)" }}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v) => [fmtMoney(Number(v ?? 0), currency), "Total"]}
                        contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      />
                      <Bar
                        dataKey="total"
                        fill="#6366f1"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={28}
                        onClick={(d) => {
                          const code = (d as { code?: string }).code;
                          if (typeof code === "string" && code) router.push(`/trip/${code}`);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          {/* ── Chart 5: Monthly Trend (full width) ── */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
              12-Month Trend — current month highlighted
            </h2>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 320 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyWithAvg} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      tickLine={false}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v, name) => [
                        fmtMoney(Number(v ?? 0), currency),
                        name === "average" ? "12-mo avg" : "Spent",
                      ]}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="total" maxBarSize={32} radius={[4, 4, 0, 0]}>
                      {monthlyWithAvg.map((m, i) => (
                        <Cell key={i} fill={m.key === curKey ? "#6366f1" : "#14b8a6"} />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ── Chart 6: Member Spending (only if members data present) ── */}
          {data.members && data.members.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface p-5 md:w-1/2">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                Member Spending
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.members} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v) => [fmtMoney(Number(v ?? 0), currency), "Paid"]}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="paid" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* ── Transactions Table ── */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Transactions ({tableExpenses.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="search"
                  value={tSearch}
                  onChange={e => { setTSearch(e.target.value); setPage(1); }}
                  placeholder="Search…"
                  className="w-36 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                />
                <select
                  value={catFilter}
                  onChange={e => { setCatFilter(e.target.value); setPage(1); setActiveCat(null); }}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">All categories</option>
                  {uniqueCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={tripFilter}
                  onChange={e => { setTripFilter(e.target.value); setPage(1); }}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">All trips</option>
                  {uniqueTrips.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 560 }}>
                <thead>
                  <tr className="border-b border-border text-left">
                    {(["date", "title", "category", "trip", "amount"] as SortKey[]).map(k => (
                      <th
                        key={k}
                        onClick={() => handleSort(k)}
                        className="cursor-pointer pb-2 pr-4 text-xs font-semibold capitalize text-muted hover:text-foreground select-none"
                      >
                        {k === "title" ? "Description" : k}
                        {sortKey === k && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                      </th>
                    ))}
                    <th className="pb-2 text-xs font-semibold text-muted">Paid By</th>
                  </tr>
                </thead>
                <tbody>
                  {pageExpenses.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">No transactions found</td></tr>
                  ) : pageExpenses.map(e => (
                    <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-background/50">
                      <td className="py-2.5 pr-4 tabular-nums text-muted text-xs">{fmtDate(e.date)}</td>
                      <td className="py-2.5 pr-4 max-w-[160px] truncate font-medium">{e.title}</td>
                      <td className="py-2.5 pr-4 text-xs text-muted">{e.category ?? "—"}</td>
                      <td className="py-2.5 pr-4 max-w-[100px] truncate text-xs text-muted">{e.tripName}</td>
                      <td className="py-2.5 pr-4 tabular-nums font-semibold">{fmtMoney(e.amount, e.currency)}</td>
                      <td className="py-2.5 text-xs text-muted">{e.paidByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted">
                <span>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tableExpenses.length)} of {tableExpenses.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-border px-2.5 py-1 hover:border-accent disabled:opacity-30"
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const pg = totalPages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
                    if (pg < 1 || pg > totalPages) return null;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`min-w-[28px] rounded-lg border px-2 py-1 ${
                          pg === page ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border hover:border-accent"
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-border px-2.5 py-1 hover:border-accent disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="truncate text-xl font-bold leading-tight">{value}</span>
      {sub && <span className="truncate text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-surface border border-border" />
        ))}
      </div>
      <div className="h-52 rounded-2xl bg-surface border border-border" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-60 rounded-2xl bg-surface border border-border" />
        <div className="h-60 rounded-2xl bg-surface border border-border" />
      </div>
      <div className="h-52 rounded-2xl bg-surface border border-border" />
    </div>
  );
}
