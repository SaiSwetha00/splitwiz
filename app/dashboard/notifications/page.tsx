"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

type FilterTab = "all" | "unread" | "trips" | "budgets" | "savings" | "system";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "trips", label: "Trips" },
  { id: "budgets", label: "Budgets" },
  { id: "savings", label: "Savings" },
  { id: "system", label: "System" },
];

function matchesTab(n: Notification, tab: FilterTab): boolean {
  const t = n.type.toLowerCase();
  switch (tab) {
    case "all": return true;
    case "unread": return !n.read;
    case "trips": return t.includes("expense") || t.includes("settlement") || t.includes("trip") || t.includes("unsettled") || t.includes("balance");
    case "budgets": return t.includes("budget");
    case "savings": return t.includes("saving") || t.includes("goal");
    case "system": return t.includes("weekly") || t.includes("summary");
    default: return true;
  }
}

function dateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  if (d >= weekAgo) return "This Week";
  return "Older";
}

function notifIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("budget_exceeded")) return "🚨";
  if (t.includes("budget_warning")) return "⚠️";
  if (t.includes("sub_today")) return "🚨";
  if (t.includes("sub_soon")) return "💳";
  if (t.includes("sub_week")) return "📅";
  if (t.includes("savings_overdue")) return "⏰";
  if (t.includes("savings_deadline")) return "🎯";
  if (t.includes("settlement_received")) return "✅";
  if (t.includes("settlement_paid")) return "💸";
  if (t.includes("unsettled") || t.includes("balance")) return "💰";
  if (t.includes("expense")) return "💸";
  if (t.includes("weekly") || t.includes("summary")) return "📊";
  if (t.includes("trip")) return "✈️";
  return "🔔";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");
  const [clearConfirm, setClearConfirm] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.title = "Notifications — Splitwiz";
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/notifications");
      if (!cancelled && res.ok) {
        const data = (await res.json()) as { notifications: Notification[] };
        setNotifications(data.notifications ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [tick]);

  async function markRead(id: string, actionUrl: string | null) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    if (actionUrl) router.push(actionUrl);
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function clearAll() {
    await fetch("/api/notifications", { method: "DELETE" });
    setNotifications([]);
    setClearConfirm(false);
  }

  const filtered = notifications.filter((n) => matchesTab(n, tab));
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group filtered by date
  const groups = ["Today", "Yesterday", "This Week", "Older"] as const;
  const grouped = groups.reduce<Record<string, Notification[]>>((acc, g) => {
    const items = filtered.filter((n) => dateGroup(n.created_at) === g);
    if (items.length > 0) acc[g] = items;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-muted">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted hover:border-accent hover:text-foreground transition-colors"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => setClearConfirm(true)}
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-negative/70 hover:border-negative hover:text-negative transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = t.id === "unread"
            ? notifications.filter((n) => !n.read).length
            : t.id === "all"
            ? notifications.length
            : notifications.filter((n) => matchesTab(n, t.id)).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface border border-border text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`ml-1.5 ${tab === t.id ? "opacity-80" : "opacity-60"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-border" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-border" />
                <div className="h-3 w-full animate-pulse rounded-md bg-border" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-3xl">✓</p>
          <p className="font-medium">You&apos;re all caught up!</p>
          <p className="text-sm text-muted">
            {tab === "all"
              ? "No notifications yet."
              : `No ${tab} notifications.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`group flex items-start gap-3 rounded-2xl border bg-surface p-4 transition-all ${
                      !n.read ? "border-accent/40" : "border-border"
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ background: "var(--background)" }}
                    >
                      {notifIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : "font-medium"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="text-[11px] text-muted/60">{timeAgo(n.created_at)}</span>
                        {n.action_url && (
                          <button
                            onClick={() => markRead(n.id, n.action_url)}
                            className="text-xs text-accent hover:underline"
                          >
                            View →
                          </button>
                        )}
                        {!n.read && (
                          <button
                            onClick={() => markRead(n.id, null)}
                            className="text-xs text-muted hover:text-foreground transition-colors"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="shrink-0 pt-0.5 text-xs text-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear all confirmation */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold">Clear all notifications?</h3>
            <p className="mt-2 text-sm text-muted">
              This will permanently delete all {notifications.length} notifications.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setClearConfirm(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={clearAll}
                className="flex-1 rounded-xl bg-negative py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden refresh trigger */}
      <button className="sr-only" onClick={() => setTick((t) => t + 1)}>Refresh</button>
    </div>
  );
}
