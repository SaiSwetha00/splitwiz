"use client";
import { useState, useEffect } from "react";
import { fromCents, toCents } from "@/lib/money";

type SavingsGoal = {
  id: string;
  name: string;
  icon: string | null;
  target_cents: number;
  current_cents: number;
  deadline: string | null;
  completed: boolean;
  created_at: string;
};

const GOAL_ICONS = ["🏦", "🏠", "🚗", "✈️", "💻", "🎓", "💍", "🏖️", "🛡️", "💡"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏦");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  // Add funds state
  const [addingFundsId, setAddingFundsId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [addingFunds, setAddingFunds] = useState(false);

  useEffect(() => {
    fetch("/api/savings")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []))
      .catch(() => setFetchError("Failed to load goals. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setIcon("🏦");
    setTarget("");
    setDeadline("");
    setFormError("");
    setShowForm(true);
  }

  function openEdit(g: SavingsGoal) {
    setEditing(g);
    setName(g.name);
    setIcon(g.icon ?? "🏦");
    setTarget(String(fromCents(g.target_cents)));
    setDeadline(g.deadline ?? "");
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
    const cents = toCents(target);
    if (!name.trim() || isNaN(cents) || cents <= 0) {
      setFormError("Name and a positive target amount are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: name.trim(),
        icon,
        target_cents: cents,
        deadline: deadline || null,
      };
      const url = editing ? `/api/savings/${editing.id}` : "/api/savings";
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
        setGoals((prev) => prev.map((g) => (g.id === editing.id ? data.goal : g)));
      } else {
        setGoals((prev) => [data.goal, ...prev]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this savings goal?")) return;
    const res = await fetch(`/api/savings/${id}`, { method: "DELETE" });
    if (res.ok) setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleAddFunds(goalId: string) {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAddingFunds(true);
    const goal = goals.find((g) => g.id === goalId)!;
    const newCents = goal.current_cents + toCents(fundAmount);
    const completed = newCents >= goal.target_cents;
    try {
      const res = await fetch(`/api/savings/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_cents: newCents, completed }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal : g)));
        setAddingFundsId(null);
        setFundAmount("");
      }
    } finally {
      setAddingFunds(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Savings Goals</h1>
          <p className="mt-0.5 text-sm text-muted">Track progress toward your targets</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            + New goal
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
            {editing ? "Edit goal" : "New savings goal"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emergency fund"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Target amount ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="10000.00"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Icon</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`rounded-lg border p-2 text-lg leading-none transition ${
                      icon === ic
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">
                Deadline (optional)
              </label>
              <input
                type="date"
                value={deadline}
                min={todayStr()}
                onChange={(e) => setDeadline(e.target.value)}
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

      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-3xl">🏦</p>
          <p className="font-medium">No savings goals yet</p>
          <p className="text-sm text-muted">
            Create a goal to track your progress toward financial milestones.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeGoals.map((g) => {
            const pct =
              g.target_cents > 0
                ? Math.min(100, Math.round((g.current_cents / g.target_cents) * 100))
                : 0;

            return (
              <div
                key={g.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{g.icon ?? "🏦"}</span>
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      {g.deadline && (
                        <p className="text-xs text-muted">
                          Deadline:{" "}
                          {new Date(g.deadline).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setAddingFundsId(g.id);
                        setFundAmount("");
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-positive hover:border-positive/30"
                    >
                      + Funds
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-negative hover:border-negative/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-end justify-between text-sm">
                    <span className="font-semibold">
                      $
                      {fromCents(g.current_cents).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-muted">
                      of $
                      {fromCents(g.target_cents).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-positive transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {addingFundsId === g.id && (
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Amount to add"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddFunds(g.id)}
                      disabled={addingFunds}
                      className="rounded-lg bg-positive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {addingFunds ? "..." : "Add"}
                    </button>
                    <button
                      onClick={() => setAddingFundsId(null)}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {completedGoals.length > 0 && (
            <div className="mt-2">
              <p className="mb-3 text-sm font-medium text-muted">Completed</p>
              <div className="flex flex-col gap-3">
                {completedGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{g.icon ?? "🏦"}</span>
                      <div>
                        <p className="font-medium">{g.name}</p>
                        <p className="text-xs text-positive">
                          Goal reached · $
                          {fromCents(g.target_cents).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-negative hover:border-negative/30"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
