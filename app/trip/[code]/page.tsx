"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Expense, TripState } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { inputClass } from "@/components/ui";
import AddExpenseForm from "@/components/AddExpenseForm";

type Tab = "expenses" | "balances" | "settle" | "people" | "access" | "activity" | "ai";

type AiSummary = {
  summary: string;
  breakdown: { category: string; amount?: number; percentage?: number }[];
  insights: string[];
  suggestions: string[];
};

type Collaborator = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

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

  const canWrite =
    !trip.isOwned ||
    trip.userRole === "owner" ||
    trip.userRole === "editor";

  const tabs: [Tab, string][] = [
    ["expenses", "Expenses"],
    ["balances", "Balances"],
    ["settle", "Settle up"],
    ["people", "People"],
    ...(trip.isOwned ? [["access", "Access"] as [Tab, string]] : []),
    ["activity", "Activity"] as [Tab, string],
    ["ai", "✨ AI"] as [Tab, string],
  ];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
      <TripHeader trip={trip} />

      <nav className="sticky top-0 z-10 -mx-4 mb-4 flex gap-1 border-b border-border bg-background px-4 pt-2 text-sm font-medium">
        {tabs.map(([key, label]) => (
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
          canWrite={canWrite}
          onEdit={(e) => setEditing(e)}
          onChanged={load}
        />
      )}
      {tab === "balances" && <BalancesTab trip={trip} />}
      {tab === "settle" && <SettleTab trip={trip} />}
      {tab === "people" && (
        <PeopleTab trip={trip} canWrite={canWrite} onChanged={load} />
      )}
      {tab === "access" && <AccessTab trip={trip} />}
      {tab === "activity" && <ActivityTab trip={trip} />}
      {tab === "ai" && <AiTab trip={trip} />}

      {canWrite && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-lg"
        >
          + Add expense
        </button>
      )}

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

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    editor:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    viewer: "bg-surface text-muted border border-border",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[role] ?? styles.viewer
      }`}
    >
      {role}
    </span>
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{trip.name}</h1>
            {trip.isOwned && trip.userRole && (
              <RoleBadge role={trip.userRole} />
            )}
            {trip.isOwned && !trip.userRole && (
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                view only
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Code{" "}
            <span className="font-mono font-semibold">{trip.code}</span> ·{" "}
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
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
          <span className="text-xs text-muted">Export:</span>
          <a
            href={`/api/trips/${trip.code}/export`}
            download
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted hover:border-accent hover:text-foreground"
          >
            ⬇ CSV
          </a>
          <a
            href={`/api/trips/${trip.code}/export?format=html`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted hover:border-accent hover:text-foreground"
          >
            🖨 Print
          </a>
        </div>
      </div>
    </header>
  );
}

type ReceiptItem = {
  id: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  signedUrl: string | null;
};

type FilterState = {
  search: string;
  category: string;
  paidBy: string;
  sort: "newest" | "oldest" | "highest" | "lowest";
};

function ExpensesTab({
  trip,
  canWrite,
  onEdit,
  onChanged,
}: {
  trip: TripState;
  canWrite: boolean;
  onEdit: (e: Expense) => void;
  onChanged: () => void;
}) {
  const [openReceiptsId, setOpenReceiptsId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    paidBy: "",
    sort: "newest",
  });

  const categories = [
    ...new Set(
      trip.expenses.map((e) => e.category).filter(Boolean) as string[]
    ),
  ].sort();

  const payerNames = [
    ...new Map(
      trip.expenses.map((e) => [e.paidById, e.paidByName])
    ).values(),
  ].sort();

  const hasActiveFilters =
    !!filters.search ||
    !!filters.category ||
    !!filters.paidBy ||
    filters.sort !== "newest";

  const filtered = trip.expenses
    .filter((e) => {
      if (
        filters.search &&
        !e.description.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.paidBy && e.paidByName !== filters.paidBy) return false;
      return true;
    })
    .sort((a, b) => {
      switch (filters.sort) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "highest":
          return b.amount - a.amount;
        case "lowest":
          return a.amount - b.amount;
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

  async function del(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/trips/${trip.code}/expenses/${id}`, { method: "DELETE" });
    onChanged();
  }

  function resetFilters() {
    setFilters({ search: "", category: "", paidBy: "", sort: "newest" });
  }

  const selectCls =
    "rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent";

  if (trip.expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        subtitle={
          canWrite
            ? 'Tap "Add expense" to record your first one.'
            : "No expenses have been added yet."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {filtered.length} of {trip.expenses.length} expense
          {trip.expenses.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowFilters((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            hasActiveFilters
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted hover:border-accent hover:text-foreground"
          }`}
        >
          <span>⚙</span>
          <span>Filter{hasActiveFilters ? " (on)" : ""}</span>
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-accent"
            placeholder="Search expenses…"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
          <div className="flex flex-wrap gap-2">
            <select
              className={selectCls}
              value={filters.category}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className={selectCls}
              value={filters.paidBy}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, paidBy: e.target.value }))
              }
            >
              <option value="">All payers</option>
              {payerNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              className={selectCls}
              value={filters.sort}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sort: e.target.value as FilterState["sort"],
                }))
              }
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted hover:text-negative"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="font-medium">No matching expenses</p>
          <button onClick={resetFilters} className="text-sm text-accent">
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="flex items-center gap-3 p-3">
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
                  {canWrite && (
                    <div className="mt-1 flex justify-end gap-2 text-xs">
                      <button onClick={() => onEdit(e)} className="text-accent">
                        Edit
                      </button>
                      <button
                        onClick={() => del(e.id)}
                        className="text-negative"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  setOpenReceiptsId((prev) => (prev === e.id ? null : e.id))
                }
                className="flex items-center gap-1.5 border-t border-border/60 px-3 py-1.5 text-left text-xs text-muted transition-colors hover:bg-background hover:text-foreground"
              >
                <span>📎</span>
                <span>Receipts</span>
                <span className="ml-auto opacity-60">
                  {openReceiptsId === e.id ? "▲" : "▼"}
                </span>
              </button>
              {openReceiptsId === e.id && (
                <ReceiptsPanel
                  tripCode={trip.code}
                  expenseId={e.id}
                  canWrite={canWrite}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
  canWrite,
  onChanged,
}: {
  trip: TripState;
  canWrite: boolean;
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
            {canWrite && (
              <button
                onClick={() => remove(m.id)}
                className="text-sm text-muted hover:text-negative"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {canWrite && (
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
      )}
      {error && <p className="text-sm text-negative">{error}</p>}
    </div>
  );
}

function AccessTab({ trip }: { trip: TripState }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(true);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = trip.userRole === "owner";

  const fetchCollabs = useCallback(async () => {
    const res = await fetch(`/api/trips/${trip.code}/collaborators`);
    if (res.ok) {
      const data = await res.json();
      setCollaborators(data.collaborators ?? []);
    }
    setLoadingCollabs(false);
  }, [trip.code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount is a blessed effect use case (react.dev/learn/you-might-not-need-an-effect#fetching-data)
    fetchCollabs();
  }, [fetchCollabs]);

  async function invite() {
    setInviteError(null);
    setInviteSuccess(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${trip.code}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add collaborator");
      setEmail("");
      setInviteSuccess(`Added ${email.trim()} as ${inviteRole}.`);
      await fetchCollabs();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function removeCollab(userId: string) {
    const res = await fetch(
      `/api/trips/${trip.code}/collaborators/${userId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    }
  }

  async function changeRole(userId: string, newRole: string) {
    const res = await fetch(
      `/api/trips/${trip.code}/collaborators/${userId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      }
    );
    if (res.ok) {
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, role: newRole } : c))
      );
    }
  }

  if (!trip.userRole) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
        <p className="font-semibold">View-only access</p>
        <p className="text-sm text-muted">
          You can see this trip because you have its code, but you&apos;re not
          a collaborator. Ask the owner to add you by email.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {loadingCollabs ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {collaborators.map((c) => {
            const displayName =
              c.profile?.display_name ?? `User ${c.userId.slice(0, 8)}`;
            const isCreatorRow = c.role === "owner";
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <p className="min-w-0 flex-1 truncate font-medium">
                  {displayName}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {isOwner && !isCreatorRow ? (
                    <select
                      value={c.role}
                      onChange={(e) => changeRole(c.userId, e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <RoleBadge role={c.role} />
                  )}
                  {isOwner && !isCreatorRow && (
                    <button
                      onClick={() => removeCollab(c.userId)}
                      className="text-xs text-muted hover:text-negative"
                      title="Remove collaborator"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isOwner && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Invite collaborator
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              type="email"
              placeholder="their@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "editor" | "viewer")
              }
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            onClick={invite}
            disabled={busy || !email.trim()}
            className="rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Adding…" : "Add collaborator"}
          </button>
          {inviteError && (
            <p className="text-sm text-negative">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="text-sm text-positive">{inviteSuccess}</p>
          )}
          <p className="text-xs text-muted">
            <strong>Editor</strong> — can add, edit, and delete expenses and
            people.
            <br />
            <strong>Viewer</strong> — read-only access.
            <br />
            The person must already have a SplitWiz account.
          </p>
        </div>
      )}
    </div>
  );
}

type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actorName: string;
};

function activityIcon(action: string): string {
  switch (action) {
    case "trip_created": return "✈️";
    case "expense_added": return "💸";
    case "expense_updated": return "✏️";
    case "expense_deleted": return "🗑️";
    case "member_added": return "👤";
    case "member_removed": return "👤";
    case "collaborator_added": return "🤝";
    case "collaborator_removed": return "🚪";
    default: return "📝";
  }
}

function describeLog(log: ActivityLog): { label: string; detail?: string } {
  const m = log.metadata;
  switch (log.action) {
    case "trip_created":
      return { label: "created this trip" };
    case "expense_added":
      return { label: "added an expense", detail: m?.description as string | undefined };
    case "expense_updated":
      return { label: "updated an expense", detail: m?.description as string | undefined };
    case "expense_deleted":
      return { label: "deleted an expense", detail: m?.description as string | undefined };
    case "member_added":
      return { label: `added member`, detail: m?.name as string | undefined };
    case "member_removed":
      return { label: `removed member`, detail: m?.name as string | undefined };
    case "collaborator_added":
      return { label: `added a collaborator as ${m?.role ?? "editor"}` };
    case "collaborator_removed":
      return { label: "removed a collaborator" };
    default:
      return { label: log.action.replace(/_/g, " ") };
  }
}

function activityTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActivityTab({ trip }: { trip: TripState }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${trip.code}/activity`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setLogs(d.logs ?? []);
      })
      .catch(() => setError("Failed to load activity"))
      .finally(() => setLoading(false));
  }, [trip.code]);

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-muted">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 text-center text-sm text-negative">{error}</div>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        subtitle="Actions like adding expenses and members will appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {logs.map((log) => {
        const { label, detail } = describeLog(log);
        return (
          <li
            key={log.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <span className="mt-0.5 text-xl leading-none">
              {activityIcon(log.action)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold">{log.actorName}</span>{" "}
                <span className="text-muted">{label}</span>
              </p>
              {detail && (
                <p className="mt-0.5 truncate text-xs text-muted">
                  &ldquo;{detail}&rdquo;
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-muted/60">
                {activityTimeAgo(log.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AiTab({ trip }: { trip: TripState }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function generate() {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/trips/${trip.code}/ai-summary`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate summary");
      setSummary(data as AiSummary);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (trip.expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        subtitle="Add expenses first, then come back for an AI analysis."
      />
    );
  }

  if (status === "idle" || status === "error") {
    return (
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <p className="text-3xl">🤖</p>
        <p className="font-semibold">AI Trip Analysis</p>
        <p className="text-sm text-muted">
          Get a spending breakdown, key insights, and money-saving suggestions
          for this trip.
        </p>
        {errorMsg && <p className="text-sm text-negative">{errorMsg}</p>}
        <button
          onClick={generate}
          className="rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground"
        >
          Generate Analysis
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <p className="text-3xl">🤖</p>
        <p className="text-sm text-muted">Analysing your trip expenses…</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Summary
        </p>
        <p className="text-sm leading-relaxed">{summary.summary}</p>
      </div>

      {summary.breakdown && summary.breakdown.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Spending Breakdown
          </p>
          <div className="flex flex-col gap-2.5">
            {summary.breakdown.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-sm font-medium">
                  {item.category}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-2 rounded-full bg-accent transition-all"
                    style={{ width: `${Math.min(100, item.percentage ?? 0)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-muted">
                  {item.percentage ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.insights && summary.insights.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Insights
          </p>
          <ul className="flex flex-col gap-1.5">
            {summary.insights.map((ins, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-accent">•</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.suggestions && summary.suggestions.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Suggestions
          </p>
          <ul className="flex flex-col gap-1.5">
            {summary.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-positive">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={generate}
        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-foreground"
      >
        ↺ Regenerate
      </button>
    </div>
  );
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null): string {
  if (!mime) return "📎";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  return "📎";
}

function ReceiptsPanel({
  tripCode,
  expenseId,
  canWrite,
}: {
  tripCode: string;
  expenseId: string;
  canWrite: boolean;
}) {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const apiBase = `/api/trips/${tripCode}/expenses/${expenseId}/receipts`;

  useEffect(() => {
    fetch(apiBase)
      .then((r) => r.json())
      .then((d) => setReceipts(d.receipts ?? []))
      .catch(() => setReceiptError("Failed to load receipts"))
      .finally(() => setLoadingReceipts(false));
  }, [apiBase]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setReceiptError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(apiBase, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setReceiptError(data.error ?? "Upload failed");
        return;
      }
      setReceipts((prev) => [...prev, data.receipt]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteReceipt(receiptId: string) {
    if (!confirm("Delete this receipt?")) return;
    const res = await fetch(`${apiBase}/${receiptId}`, { method: "DELETE" });
    if (res.ok) {
      setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    } else {
      const data = await res.json().catch(() => ({}));
      setReceiptError(data.error ?? "Could not delete receipt");
    }
  }

  return (
    <div className="border-t border-border/60 bg-background px-3 py-3">
      {loadingReceipts ? (
        <p className="text-xs text-muted">Loading receipts…</p>
      ) : receipts.length === 0 ? (
        <p className="text-xs text-muted">No receipts attached.</p>
      ) : (
        <ul className="mb-2 flex flex-col gap-1.5">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-xs">
              <span className="text-base leading-none">{fileIcon(r.mime_type)}</span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {r.file_name ?? "receipt"}
              </span>
              <span className="shrink-0 text-muted">{formatBytes(r.file_size)}</span>
              {r.signedUrl && (
                <a
                  href={r.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-accent hover:underline"
                >
                  View
                </a>
              )}
              {canWrite && (
                <button
                  onClick={() => handleDeleteReceipt(r.id)}
                  className="shrink-0 text-muted hover:text-negative"
                  title="Delete receipt"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {receiptError && (
        <p className="mb-1.5 text-xs text-negative">{receiptError}</p>
      )}

      {canWrite && (
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent">
          {uploading ? (
            "Uploading…"
          ) : (
            <>
              <span>+</span>
              <span>Attach receipt</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </>
          )}
        </label>
      )}
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
