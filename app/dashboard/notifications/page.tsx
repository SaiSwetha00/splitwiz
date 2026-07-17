"use client";

import { useCallback, useEffect, useState } from "react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-foreground"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-3xl">🔔</p>
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm text-muted">
            You&apos;ll be notified when collaborators add expenses or invite
            you to trips.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 rounded-2xl border bg-surface p-4 transition ${
                !n.read ? "border-accent/40" : "border-border"
              }`}
            >
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
              )}
              <div className={`min-w-0 flex-1 ${n.read ? "pl-5" : ""}`}>
                <p className="font-medium leading-snug">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted/60">
                    {timeAgo(n.created_at)}
                  </span>
                  {n.action_url && (
                    <a
                      href={n.action_url}
                      onClick={() => markRead(n.id)}
                      className="text-xs text-accent hover:underline"
                    >
                      View →
                    </a>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
