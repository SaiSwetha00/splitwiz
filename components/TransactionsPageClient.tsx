"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import type { Transaction, TransactionSummary, TransactionType, TransactionStatus } from "@/types/transactions";
import { CsvImporter } from "./CsvImporter";
import { BankStatementImporter } from "./BankStatementImporter";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number, type: TransactionType): string {
  const abs = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (type === "settlement_paid") return `−${abs}`;
  if (type === "settlement_received") return `+${abs}`;
  return abs;
}

function amountColor(type: TransactionType): string {
  if (type === "settlement_paid") return "#FE1514";
  if (type === "settlement_received") return "#45D881";
  return "#ffffff";
}

function typeIcon(type: TransactionType | string): string {
  if (type === "settlement_paid") return "💸";
  if (type === "settlement_received") return "💰";
  if (type === "expense") return "🧾";
  return "🔄";
}

function iconBg(type: TransactionType | string): React.CSSProperties {
  if (type === "settlement_paid")
    return { background: "linear-gradient(135deg, #7f1d1d 0%, rgba(254,21,20,0.6) 100%)" };
  if (type === "settlement_received")
    return { background: "linear-gradient(135deg, #065f46 0%, rgba(69,216,129,0.6) 100%)" };
  if (type === "expense")
    return { background: "linear-gradient(135deg, #92400e 0%, rgba(245,158,11,0.6) 100%)" };
  return { background: "linear-gradient(135deg, #1e1b4b 0%, rgba(99,102,241,0.6) 100%)" };
}

function typeLabel(type: TransactionType | string): string {
  if (type === "settlement_paid") return "Paid";
  if (type === "settlement_received") return "Received";
  if (type === "expense") return "Expense";
  return type;
}

function statusBadge(status: TransactionStatus | string): { label: string; style: React.CSSProperties } {
  if (status === "completed")
    return { label: "Completed", style: { background: "rgba(69,216,129,0.12)", color: "#45D881" } };
  if (status === "pending")
    return { label: "Pending", style: { background: "rgba(245,158,11,0.12)", color: "#F59E0B" } };
  if (status === "failed")
    return { label: "Failed", style: { background: "rgba(254,21,20,0.12)", color: "#FE1514" } };
  return { label: status, style: { background: "rgba(255,255,255,0.06)", color: "#94a3b8" } };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function applyDateRange(txns: Transaction[], range: string): Transaction[] {
  if (range === "all") return txns;
  const now = new Date();

  if (range === "week") {
    const start = startOfWeek(now);
    return txns.filter((t) => new Date(t.created_at) >= start);
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return txns.filter((t) => new Date(t.created_at) >= start);
  }
  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return txns.filter((t) => new Date(t.created_at) >= start);
  }
  return txns;
}

// ─── filter tab type ──────────────────────────────────────────────────────────

type FilterTab = "all" | "paid" | "received" | "pending";

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(transactions: Transaction[]): void {
  const header = ["Date", "Description", "Type", "Amount", "Currency", "Status"];
  const rows = transactions.map((t) => [
    new Date(t.created_at).toISOString().slice(0, 10),
    `"${(t.description ?? typeLabel(t.type)).replace(/"/g, '""')}"`,
    typeLabel(t.type),
    t.amount.toFixed(2),
    t.currency,
    t.status,
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── component ────────────────────────────────────────────────────────────────

type TripOption = { id: string; name: string };

type Props = {
  transactions: Transaction[];
  summary: TransactionSummary;
  trips?: TripOption[];
};

export function TransactionsPageClient({ transactions, summary, trips = [] }: Props) {
  const [tab, setTab] = useState<FilterTab>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [showBankImporter, setShowBankImporter] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchRaw.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchRaw]);

  const filtered = useMemo(() => {
    let list = transactions;

    // Tab filter
    if (tab === "paid") list = list.filter((t) => t.type === "settlement_paid");
    else if (tab === "received") list = list.filter((t) => t.type === "settlement_received");
    else if (tab === "pending") list = list.filter((t) => t.status === "pending");

    // Date range
    list = applyDateRange(list, dateRange);

    // Text search (client-side on description)
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description ?? "").toLowerCase().includes(lower) ||
          typeLabel(t.type).toLowerCase().includes(lower) ||
          (t.trip_name ?? "").toLowerCase().includes(lower) ||
          (t.expense_title ?? "").toLowerCase().includes(lower)
      );
    }

    return list;
  }, [transactions, tab, dateRange, search]);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "received", label: "Received" },
    { key: "pending", label: "Pending" },
  ];

  const DATE_RANGES = [
    { value: "all", label: "All time" },
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "year", label: "This year" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="mt-0.5 text-sm text-muted">All your payments and settlements</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setShowBankImporter(true)}
            className="rounded-xl border border-accent bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent hover:text-white"
          >
            Import Statement
          </button>
          <button
            onClick={() => setShowImporter(true)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-foreground"
          >
            Import CSV
          </button>
          <button
            onClick={() => exportCsv(filtered)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Money In (this month)</p>
          <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
            +
            {summary.money_in.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Money Out (this month)</p>
          <p className="mt-1 text-xl font-bold text-red-500">
            −
            {summary.money_out.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex rounded-xl border border-border bg-surface p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="search"
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            placeholder="Search description…"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 pl-8 text-sm focus:border-accent focus:outline-none"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">
            🔍
          </span>
        </div>
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-3xl">🧾</p>
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm text-muted">
            Your settlements and expenses will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => {
            const badge = statusBadge(t.status);
            const isExpanded = expandedId === t.id;

            return (
              <div
                key={t.id}
                className="rounded-2xl transition"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "#0f0f1a",
                }}
              >
                {/* Main row — click to toggle expand */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  {/* Icon */}
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={iconBg(t.type)}
                    aria-hidden="true"
                  >
                    {typeIcon(t.type)}
                  </span>

                  {/* Middle */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.description ?? typeLabel(t.type)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
                      <span>{formatDate(t.created_at)}</span>
                      {t.trip_name && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[140px]">{t.trip_name}</span>
                        </>
                      )}
                      {t.expense_title && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[140px]">{t.expense_title}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + badge */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: amountColor(t.type), fontFamily: "'Clash Display', sans-serif" }}
                    >
                      {formatAmount(t.amount, t.type)}{" "}
                      <span className="text-xs font-normal text-muted">{t.currency}</span>
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={badge.style}
                    >
                      {badge.label}
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-muted">Type</dt>
                        <dd className="mt-0.5 font-medium">{typeLabel(t.type)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Currency</dt>
                        <dd className="mt-0.5 font-medium">{t.currency}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Status</dt>
                        <dd className="mt-0.5 font-medium">{badge.label}</dd>
                      </div>
                      {t.payment_card_id && (
                        <div>
                          <dt className="text-muted">Payment method</dt>
                          <dd className="mt-0.5 font-medium text-muted italic">Card on file</dd>
                        </div>
                      )}
                      {t.trip_name && (
                        <div>
                          <dt className="text-muted">Trip</dt>
                          <dd className="mt-0.5 font-medium">{t.trip_name}</dd>
                        </div>
                      )}
                      {t.expense_title && (
                        <div>
                          <dt className="text-muted">Expense</dt>
                          <dd className="mt-0.5 font-medium">{t.expense_title}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-muted">Date</dt>
                        <dd className="mt-0.5 font-medium">
                          {new Date(t.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showImporter && <CsvImporter onClose={() => setShowImporter(false)} />}
      {showBankImporter && <BankStatementImporter onClose={() => setShowBankImporter(false)} trips={trips} />}
    </div>
  );
}
