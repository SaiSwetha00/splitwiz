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

  useEffect(() => { document.title = "Savings — Splitwiz"; }, []);

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
                style={{
                  borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
                  background: "#0f0f1a", padding: 20,
                  transition: "border-color 0.2s, transform 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: "linear-gradient(135deg, #065f46, #45D881)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {g.icon ?? "🏦"}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#fff", margin: 0 }}>{g.name}</p>
                      {g.deadline && (
                        <span style={{
                          display: "inline-block", marginTop: 4,
                          fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                          color: "#F59E0B", background: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6,
                          padding: "1px 8px",
                        }}>
                          📅 {new Date(g.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexShrink: 0, gap: 6 }}>
                    <button
                      onClick={() => { setAddingFundsId(g.id); setFundAmount(""); }}
                      style={{ borderRadius: 8, border: "1px solid rgba(6,182,212,0.35)", padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: "#06b6d4", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.08)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      + Add Funds
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      style={{ borderRadius: 8, border: "1px solid rgba(254,21,20,0.2)", padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: "#FE1514", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 16, color: "#06b6d4" }}>
                      ${fromCents(g.current_cents).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
                      of ${fromCents(g.target_cents).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 999, width: `${pct}%`, background: "linear-gradient(90deg, #065f46, #06b6d4)", transition: "width 0.6s ease" }} />
                  </div>
                </div>

                {addingFundsId === g.id && (
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number" min="0.01" step="0.01"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Amount to add"
                      style={{ flex: 1, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "#090912", color: "#fff", padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddFunds(g.id)}
                      disabled={addingFunds}
                      style={{ borderRadius: 8, background: "linear-gradient(135deg, #065f46, #06b6d4)", color: "#fff", border: "none", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: addingFunds ? 0.5 : 1 }}
                    >
                      {addingFunds ? "..." : "Add"}
                    </button>
                    <button
                      onClick={() => setAddingFundsId(null)}
                      style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#94a3b8", padding: "8px 12px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
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
