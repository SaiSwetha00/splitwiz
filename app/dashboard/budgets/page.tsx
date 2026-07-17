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

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

  useEffect(() => {
    Promise.all([
      fetch("/api/budgets").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([bd, cd]) => {
        setBudgets(bd.budgets ?? []);
        setCategories(cd.categories ?? []);
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
      </main>
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
          {budgets.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  {b.category?.icon && <span className="text-lg">{b.category.icon}</span>}
                  <span className="font-medium">{b.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                  <span className="font-semibold text-foreground">
                    $
                    {fromCents(b.amount_cents).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span>·</span>
                  <span>{b.period}</span>
                  {b.category && (
                    <>
                      <span>·</span>
                      <span>{b.category.name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>
                    From{" "}
                    {new Date(b.start_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {b.end_date &&
                      ` — ${new Date(b.end_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => openEdit(b)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-negative hover:border-negative/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
