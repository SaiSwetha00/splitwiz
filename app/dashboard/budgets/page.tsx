"use client";
import { useState, useEffect } from "react";
import { fromCents, toCents } from "@/lib/money";

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type Budget = {
  id: string;
  name: string;
  amount_cents: number;
  period: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  category: Category | null;
};

const PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type BudgetUtilization = { id: string; spent: number };

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spentById, setSpentById] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => { document.title = "Budgets — Splitwiz"; }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/budgets").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/analytics").then((r) => r.json()),
    ])
      .then(([bd, cd, ad]) => {
        setBudgets(bd.budgets ?? []);
        setCategories(cd.categories ?? []);
        const utilization: BudgetUtilization[] = ad.budgetUtilization ?? [];
        setSpentById(new Map(utilization.map((u) => [u.id, u.spent])));
      })
      .catch(() => setFetchError("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setAmount("");
    setPeriod("monthly");
    setStartDate(todayStr());
    setEndDate("");
    setCategoryId("");
    setFormError("");
    setShowForm(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setName(b.name);
    setAmount(String(fromCents(b.amount_cents)));
    setPeriod(b.period);
    setStartDate(b.start_date);
    setEndDate(b.end_date ?? "");
    setCategoryId(b.category?.id ?? "");
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = toCents(amount);
    if (!name.trim() || isNaN(cents) || cents <= 0) {
      setFormError("Name and a positive amount are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: name.trim(),
        amount_cents: cents,
        period,
        start_date: startDate,
        end_date: endDate || null,
        category_id: categoryId || null,
      };
      const url = editing ? `/api/budgets/${editing.id}` : "/api/budgets";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save");
        return;
      }
      if (editing) {
        setBudgets((prev) => prev.map((b) => (b.id === editing.id ? data.budget : b)));
      } else {
        setBudgets((prev) => [data.budget, ...prev]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this budget?")) return;
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    if (res.ok) setBudgets((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="mt-0.5 text-sm text-muted">Set spending limits by period</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            + Create budget
          </button>
        )}
      </div>

      {fetchError && (
        <p className="mb-4 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {fetchError}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-border bg-surface p-5"
        >
          <h2 className="mb-4 font-semibold">
            {editing ? "Edit budget" : "New budget"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly groceries"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Amount ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">
                Category (optional)
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">
                End date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          {formError && <p className="mt-3 text-sm text-negative">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Create"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-3xl">💰</p>
          <p className="font-medium">No budgets yet</p>
          <p className="text-sm text-muted">
            Create a budget to set spending limits and track them over time.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {budgets.map((b) => {
            const spent = spentById.get(b.id) ?? 0;
            const pct = b.amount_cents > 0 ? Math.min(100, (spent / b.amount_cents) * 100) : 0;
            const over = spent > b.amount_cents;
            const barBg = over ? "#FE1514" : pct >= 80 ? "#6366f1" : "#06b6d4";
            return (
              <div
                key={b.id}
                style={{
                  display: "flex", flexDirection: "column", gap: 12,
                  borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
                  background: "#0f0f1a", padding: "16px 20px",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                className="budget-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {b.category?.icon ? (
                      <div style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: `linear-gradient(135deg, ${b.category.color ?? "#3730a3"} 0%, ${b.category.color ? b.category.color + "cc" : "#6366f1"} 100%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0,
                      }}>
                        {b.category.icon}
                      </div>
                    ) : (
                      <div style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: "linear-gradient(135deg, #3730a3, #6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 12V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2v-3" />
                          <path d="M16 12h6" /><circle cx="19" cy="12" r="1" fill="currentColor" />
                        </svg>
                      </div>
                    )}
                    <span style={{ fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#fff" }}>
                      {b.name}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                      color: "#94a3b8", background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6,
                      padding: "2px 8px", marginLeft: 2,
                    }}>
                      {b.period}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px", fontSize: 12, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
                    <span style={{ fontWeight: 700, color: over ? "#FE1514" : "#ffffff" }}>
                      ${fromCents(spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span>of ${fromCents(b.amount_cents).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {b.category && <><span>·</span><span>{b.category.name}</span></>}
                    <span>·</span>
                    <span>
                      From {new Date(b.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      {b.end_date && ` — ${new Date(b.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                    </span>
                  </div>
                  <div style={{ height: 6, maxWidth: 320, width: "100%", borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}
                    role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.name} budget usage`}>
                    <div style={{ height: "100%", borderRadius: 999, width: `${pct}%`, background: barBg, transition: "width 0.6s ease" }} />
                  </div>
                  {over && (
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#FE1514", fontFamily: "'DM Sans', sans-serif" }}>
                      Over budget by ${fromCents(spent - b.amount_cents).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexShrink: 0, gap: 6 }}>
                  <button
                    onClick={() => openEdit(b)}
                    style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s, border-color 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    style={{ borderRadius: 8, border: "1px solid rgba(254,21,20,0.2)", padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: "#FE1514", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s, border-color 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(254,21,20,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(254,21,20,0.35)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(254,21,20,0.2)"; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
