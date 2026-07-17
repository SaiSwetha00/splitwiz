"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney, fromCents } from "@/lib/money";

type MonthlyBucket = { label: string; total: number };
type CategoryItem = { category: string; total: number; count: number };
type TripItem = { name: string; code: string; total: number };
type BudgetItem = {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  categoryName: string | null;
};

type AnalyticsData = {
  currency: string;
  monthlySpending: MonthlyBucket[];
  categoryBreakdown: CategoryItem[];
  topTrips: TripItem[];
  budgetUtilization: BudgetItem[];
  totalSpent: number;
  tripCount: number;
  expenseCount: number;
  otherCurrencies: string[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = "Analytics — Splitwiz"; }, []);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d as AnalyticsData);
      })
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-muted">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-negative">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const avgPerTrip =
    data.tripCount > 0 ? Math.round(data.totalSpent / data.tripCount) : 0;

  const hasData = data.expenseCount > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Spending insights in {data.currency}
            {data.otherCurrencies.length > 0 && (
              <span>
                {" "}
                · other currencies ({data.otherCurrencies.join(", ")}) excluded
              </span>
            )}
          </p>
        </div>
        <a
          href="/api/export/personal"
          download
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:border-accent hover:text-foreground"
        >
          ⬇ Export all data
        </a>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total spent"
          value={formatMoney(data.totalSpent, data.currency)}
        />
        <StatCard label="Trips" value={String(data.tripCount)} />
        <StatCard label="Expenses" value={String(data.expenseCount)} />
        <StatCard
          label="Avg per trip"
          value={data.tripCount > 0 ? formatMoney(avgPerTrip, data.currency) : "—"}
        />
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-3xl">📊</p>
          <p className="font-medium">No expense data yet</p>
          <p className="text-sm text-muted">
            Add expenses to your trips to see spending analytics here.
          </p>
          <Link
            href="/dashboard/trips/new"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Create a trip
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Monthly spending */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Monthly Spending
            </h2>
            <BarChart data={data.monthlySpending} currency={data.currency} />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Category breakdown */}
            {data.categoryBreakdown.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  By Category
                </h2>
                <CategoryBars
                  data={data.categoryBreakdown}
                  currency={data.currency}
                />
              </section>
            )}

            {/* Top trips */}
            {data.topTrips.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  Top Trips by Spend
                </h2>
                <ul className="flex flex-col gap-2">
                  {data.topTrips.map((t, i) => (
                    <li key={t.code} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold text-muted">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/trip/${t.code}`}
                          className="truncate text-sm font-medium hover:text-accent"
                        >
                          {t.name}
                        </Link>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatMoney(t.total, data.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Budget utilization */}
          {data.budgetUtilization.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                Budget Utilization
              </h2>
              <ul className="flex flex-col gap-4">
                {data.budgetUtilization.map((b) => {
                  const pct = Math.min(
                    100,
                    b.budgeted > 0
                      ? Math.round((b.spent / b.budgeted) * 100)
                      : 0
                  );
                  const over = b.spent > b.budgeted;
                  return (
                    <li key={b.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <span className="font-medium">{b.name}</span>
                          {b.categoryName && (
                            <span className="ml-2 text-xs text-muted">
                              {b.categoryName}
                            </span>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            over ? "text-negative" : "text-muted"
                          }`}
                        >
                          {formatMoney(b.spent, data.currency)} /{" "}
                          {formatMoney(b.budgeted, data.currency)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: over
                              ? "var(--negative)"
                              : "var(--accent)",
                          }}
                        />
                      </div>
                      <p className="text-right text-[11px] text-muted">
                        {pct}% used
                        {over && (
                          <span className="ml-1 text-negative">
                            · {formatMoney(b.spent - b.budgeted, data.currency)}{" "}
                            over
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="truncate text-xl font-bold leading-tight">{value}</span>
    </div>
  );
}

function BarChart({
  data,
  currency,
}: {
  data: MonthlyBucket[];
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const W = 480;
  const H = 110;
  const cols = data.length || 1;
  const colW = W / cols;
  const barW = Math.max(colW - 12, 8);
  const pad = (colW - barW) / 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H + 30}`}
        className="w-full"
        style={{ minWidth: 260, maxHeight: 180 }}
        aria-label="Monthly spending chart"
      >
        {/* Zero line */}
        <line
          x1={0}
          y1={H}
          x2={W}
          y2={H}
          style={{ stroke: "var(--border)", strokeWidth: 1 }}
        />

        {data.map((d, i) => {
          const barH = Math.max((d.total / max) * H, d.total > 0 ? 4 : 0);
          const x = i * colW + pad;
          const y = H - barH;
          const labelY = H + 18;

          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                style={{
                  fill: d.total > 0 ? "var(--accent)" : "var(--border)",
                  opacity: d.total > 0 ? 1 : 0.4,
                }}
              />
              <text
                x={x + barW / 2}
                y={labelY}
                textAnchor="middle"
                style={{ fill: "var(--muted)", fontSize: 10 }}
              >
                {d.label}
              </text>
              {d.total > 0 && (
                <text
                  x={x + barW / 2}
                  y={Math.max(y - 5, 12)}
                  textAnchor="middle"
                  style={{
                    fill: "var(--foreground)",
                    fontSize: 9,
                    fontWeight: "600",
                  }}
                >
                  {fromCents(d.total).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[10px] text-muted">
        Amounts in {currency}
      </p>
    </div>
  );
}

function CategoryBars({
  data,
  currency,
}: {
  data: CategoryItem[];
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((item) => {
        const pct = Math.round((item.total / max) * 100);
        return (
          <li key={item.category} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{item.category}</span>
              <span className="shrink-0 text-xs text-muted">
                {formatMoney(item.total, currency)} · {item.count}×
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%`, background: "var(--accent)" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
