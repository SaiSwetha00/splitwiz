"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Expense, TripState } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { inputClass } from "@/components/ui";
import AddExpenseForm from "@/components/AddExpenseForm";

type Tab = "expenses" | "balances" | "settle" | "people";

export default function TripPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toUpperCase();

  const [trip, setTrip] = useState<TripState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("expenses");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${code}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = (await res.json()) as TripState;
      setTrip(data);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted">
        Loading…
      </main>
    );
  }

  if (notFound || !trip) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">Trip not found</p>
        <p className="text-sm text-muted">
          The code <span className="font-mono">{code}</span> doesn&apos;t match
          any trip.
        </p>
        <Link href="/" className="font-medium text-accent">
          ← Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
      <TripHeader trip={trip} />

      <nav className="sticky top-0 z-10 -mx-4 mb-4 flex gap-1 border-b border-border bg-background px-4 pt-2 text-sm font-medium">
        {(
          [
            ["expenses", "Expenses"],
            ["balances", "Balances"],
            ["settle", "Settle up"],
            ["people", "People"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-2.5 py-2 ${
              tab === key
                ? "border-accent text-foreground"
                : "border-transparent text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "expenses" && (
        <ExpensesTab
          trip={trip}
          onEdit={(e) => setEditing(e)}
          onChanged={load}
        />
      )}
      {tab === "balances" && <BalancesTab trip={trip} />}
      {tab === "settle" && <SettleTab trip={trip} />}
      {tab === "people" && <PeopleTab trip={trip} onChanged={load} />}

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-lg"
      >
        + Add expense
      </button>

      {(showAdd || editing) && (
        <AddExpenseForm
          trip={trip}
          expense={editing ?? undefined}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </main>
  );
}

function TripHeader({ trip }: { trip: TripState }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* user dismissed share sheet */
    }
  }

  return (
    <header className="mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{trip.name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            Code <span className="font-mono font-semibold">{trip.code}</span> ·{" "}
            {trip.members.length} people
          </p>
        </div>
        <button
          onClick={share}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium"
        >
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
      <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Total spent
        </p>
        <p className="text-2xl font-bold">
          {formatMoney(trip.totalSpent, trip.currency)}
        </p>
      </div>
    </header>
  );
}

function ExpensesTab({
  trip,
  onEdit,
  onChanged,
}: {
  trip: TripState;
  onEdit: (e: Expense) => void;
  onChanged: () => void;
}) {
  async function del(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/trips/${trip.code}/expenses/${id}`, { method: "DELETE" });
    onChanged();
  }

  if (trip.expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        subtitle="Tap “Add expense” to record your first one."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {trip.expenses.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{e.description}</p>
            <p className="text-xs text-muted">
              {e.paidByName} paid
              {e.category ? ` · ${e.category}` : ""} ·{" "}
              {e.splitType === "EQUAL" ? "split equally" : "custom split"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {formatMoney(e.amount, trip.currency)}
            </p>
            <div className="mt-1 flex justify-end gap-2 text-xs">
              <button onClick={() => onEdit(e)} className="text-accent">
                Edit
              </button>
              <button onClick={() => del(e.id)} className="text-negative">
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function BalancesTab({ trip }: { trip: TripState }) {
  return (
    <ul className="flex flex-col gap-2">
      {trip.balances.map((b) => {
        const settled = b.net === 0;
        return (
          <li
            key={b.memberId}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
          >
            <div>
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-muted">
                paid {formatMoney(b.paid, trip.currency)} · share{" "}
                {formatMoney(b.owed, trip.currency)}
              </p>
            </div>
            <p
              className={`text-right text-sm font-semibold ${
                settled
                  ? "text-muted"
                  : b.net > 0
                  ? "text-positive"
                  : "text-negative"
              }`}
            >
              {settled
                ? "settled up"
                : b.net > 0
                ? `gets back ${formatMoney(b.net, trip.currency)}`
                : `owes ${formatMoney(-b.net, trip.currency)}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function SettleTab({ trip }: { trip: TripState }) {
  if (trip.settlements.length === 0) {
    return (
      <EmptyState
        title="All settled up 🎉"
        subtitle="Nobody owes anybody right now."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {trip.settlements.map((s, i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
        >
          <p className="text-sm">
            <span className="font-semibold">{s.fromName}</span>
            <span className="text-muted"> pays </span>
            <span className="font-semibold">{s.toName}</span>
          </p>
          <p className="font-semibold text-accent">
            {formatMoney(s.amount, trip.currency)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function PeopleTab({
  trip,
  onChanged,
}: {
  trip: TripState;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setError(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${trip.code}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add");
      setName("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch(`/api/trips/${trip.code}/members/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not remove member");
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {trip.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
          >
            <span className="font-medium">{m.name}</span>
            <button
              onClick={() => remove(m.id)}
              className="text-sm text-muted hover:text-negative"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Add a person"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          onClick={add}
          disabled={busy}
          className="shrink-0 rounded-lg bg-accent px-4 font-semibold text-accent-foreground disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-1 text-center">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted">{subtitle}</p>
    </div>
  );
}
