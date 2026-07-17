"use client";
import { useState, useEffect } from "react";
import { fromCents, toCents, SUPPORTED_CURRENCIES } from "@/lib/money";

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type Subscription = {
  id: string;
  name: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string | null;
  active: boolean;
  created_at: string;
  category: Category | null;
};

const BILLING_CYCLES = ["weekly", "monthly", "yearly"] as const;

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [nextBilling, setNextBilling] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/subscriptions").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([sd, cd]) => {
        setSubs(sd.subscriptions ?? []);
        setCategories(cd.categories ?? []);
      })
      .catch(() => setFetchError("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setAmount("");
    setCurrency("USD");
    setBillingCycle("monthly");
    setNextBilling("");
    setCategoryId("");
    setFormError("");
    setShowForm(true);
  }

  function openEdit(s: Subscription) {
    setEditing(s);
    setName(s.name);
    setDescription(s.description ?? "");
    setAmount(String(fromCents(s.amount_cents)));
    setCurrency(s.currency);
    setBillingCycle(s.billing_cycle);
    setNextBilling(s.next_billing_date ?? "");
    setCategoryId(s.category?.id ?? "");
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
        description: description.trim() || null,
        amount_cents: cents,
        currency,
        billing_cycle: billingCycle,
        next_billing_date: nextBilling || null,
        category_id: categoryId || null,
      };
      const url = editing ? `/api/subscriptions/${editing.id}` : "/api/subscriptions";
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
        setSubs((prev) => prev.map((s) => (s.id === editing.id ? data.subscription : s)));
      } else {
        setSubs((prev) => [data.subscription, ...prev]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this subscription?")) return;
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    if (res.ok) setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  async function toggleActive(s: Subscription) {
    const res = await fetch(`/api/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubs((prev) => prev.map((sub) => (sub.id === s.id ? data.subscription : sub)));
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted">Loading...</p>
      </main>
    );
  }

  const activeSubs = subs.filter((s) => s.active);
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    if (s.billing_cycle === "monthly") return sum + s.amount_cents;
    if (s.billing_cycle === "yearly") return sum + Math.round(s.amount_cents / 12);
    if (s.billing_cycle === "weekly") return sum + s.amount_cents * 4;
    return sum;
  }, 0);
  const yearlyTotal = activeSubs.reduce((sum, s) => {
    if (s.billing_cycle === "monthly") return sum + s.amount_cents * 12;
    if (s.billing_cycle === "yearly") return sum + s.amount_cents;
    if (s.billing_cycle === "weekly") return sum + s.amount_cents * 52;
    return sum;
  }, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="mt-0.5 text-sm text-muted">Manage recurring payments</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            + Add subscription
          </button>
        )}
      </div>

      {fetchError && (
        <p className="mb-4 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {fetchError}
        </p>
      )}

      {activeSubs.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Monthly estimate</p>
            <p className="mt-1 text-xl font-bold">
              $
              {fromCents(monthlyTotal).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Annual estimate</p>
            <p className="mt-1 text-xl font-bold">
              $
              {fromCents(yearlyTotal).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-border bg-surface p-5"
        >
          <h2 className="mb-4 font-semibold">
            {editing ? "Edit subscription" : "New subscription"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Netflix"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">
                Description (optional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Streaming plan"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15.99"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Billing cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                {BILLING_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">
                Next billing date (optional)
              </label>
              <input
                type="date"
                value={nextBilling}
                onChange={(e) => setNextBilling(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
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
          </div>
          {formError && <p className="mt-3 text-sm text-negative">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Add"}
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

      {subs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-3xl">🔄</p>
          <p className="font-medium">No subscriptions yet</p>
          <p className="text-sm text-muted">
            Add your recurring payments to track monthly and annual costs.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {subs.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 ${
                !s.active ? "opacity-50" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  {s.category?.icon && (
                    <span className="text-lg">{s.category.icon}</span>
                  )}
                  <span className="font-medium">{s.name}</span>
                  {s.description && (
                    <span className="text-xs text-muted">· {s.description}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                  <span className="font-semibold text-foreground">
                    $
                    {fromCents(s.amount_cents).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {s.currency}
                  </span>
                  <span>·</span>
                  <span>{s.billing_cycle}</span>
                  {s.category && (
                    <>
                      <span>·</span>
                      <span>{s.category.name}</span>
                    </>
                  )}
                  {s.next_billing_date && (
                    <>
                      <span>·</span>
                      <span>
                        Next:{" "}
                        {new Date(s.next_billing_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => toggleActive(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    s.active
                      ? "border-positive/30 text-positive hover:border-positive"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {s.active ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
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
