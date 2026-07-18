"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

type SearchTrip = { id: string; code: string; name: string; currency: string; created_at: string };
type SearchExpense = { id: string; title: string; amount_cents: number; category: string | null; created_at: string; trip: { code: string; name: string; currency: string } | null };
type SearchSubscription = { id: string; name: string; amount_cents: number };
type SearchGoal = { id: string; name: string; target_cents: number; current_cents: number };

type SearchResults = {
  trips: SearchTrip[];
  expenses: SearchExpense[];
  subscriptions: SearchSubscription[];
  goals: SearchGoal[];
};

type FlatItem = { label: string; sub: string; icon: string; path: string };

const RECENT_KEY = "splitwiz_recent_pages_v1";

function getRecent(): FlatItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as FlatItem[]; }
  catch { return []; }
}

function saveRecent(item: FlatItem) {
  const list = getRecent().filter((p) => p.path !== item.path);
  list.unshift(item);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
}

const QUICK_LINKS: FlatItem[] = [
  { label: "Dashboard", sub: "Overview & stats", icon: "🏠", path: "/dashboard" },
  { label: "Trips", sub: "All your trips", icon: "✈️", path: "/dashboard/trips" },
  { label: "Analytics", sub: "Spending charts", icon: "📊", path: "/dashboard/analytics" },
  { label: "Subscriptions", sub: "Manage subscriptions", icon: "💳", path: "/dashboard/subscriptions" },
  { label: "Savings Goals", sub: "Track savings", icon: "🎯", path: "/dashboard/savings" },
  { label: "Notifications", sub: "Your alerts", icon: "🔔", path: "/dashboard/notifications" },
];

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentPages, setRecentPages] = useState<FlatItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent pages on open (RAF to avoid synchronous setState-in-effect lint error)
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setRecentPages(getRecent()));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Cmd/Ctrl+K to open; Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults((await res.json()) as SearchResults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  // Build flat list for keyboard nav
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!query.trim() || query.trim().length < 2) {
      return recentPages.length > 0 ? recentPages : QUICK_LINKS;
    }
    if (!results) return [];
    const items: FlatItem[] = [];
    results.trips.forEach((t) =>
      items.push({ label: t.name, sub: `${t.currency} · ${t.code}`, icon: "✈️", path: `/trip/${t.code}` })
    );
    results.expenses.forEach((e) =>
      items.push({ label: e.title || "Expense", sub: e.trip?.name ?? "", icon: "💸", path: `/trip/${e.trip?.code ?? ""}` })
    );
    results.subscriptions.forEach((s) =>
      items.push({ label: s.name, sub: `₹${(s.amount_cents / 100).toFixed(0)} · Subscription`, icon: "💳", path: "/dashboard/subscriptions" })
    );
    results.goals.forEach((g) => {
      const pct = g.target_cents > 0 ? Math.round((g.current_cents / g.target_cents) * 100) : 0;
      items.push({ label: g.name, sub: `${pct}% complete · Savings goal`, icon: "🎯", path: "/dashboard/savings" });
    });
    return items;
  }, [query, results, recentPages]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActiveIndex(-1));
    return () => cancelAnimationFrame(frame);
  }, [flatItems]);

  function navigate(item: FlatItem) {
    saveRecent(item);
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(item.path);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0 && flatItems[activeIndex]) {
      e.preventDefault();
      navigate(flatItems[activeIndex]);
    }
  }

  const hasQuery = query.trim().length >= 2;
  const hasResults = results && (
    results.trips.length > 0 || results.expenses.length > 0 ||
    results.subscriptions.length > 0 || results.goals.length > 0
  );

  let runIdx = 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
        <input
          ref={inputRef}
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-16 text-sm outline-none transition focus:border-accent"
          placeholder="Search… (⌘K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {loading ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse text-xs text-muted">···</span>
        ) : (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden text-[11px] text-muted/50 sm:block">⌘K</span>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[28rem] overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg">

          {/* Empty query: recent pages or quick links */}
          {!hasQuery && (
            <section>
              <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {recentPages.length > 0 ? "Recent" : "Quick Access"}
              </p>
              {(recentPages.length > 0 ? recentPages : QUICK_LINKS).map((item) => {
                const idx = runIdx++;
                return (
                  <ResultRow key={item.path} item={item} active={activeIndex === idx} onSelect={() => navigate(item)} />
                );
              })}
            </section>
          )}

          {/* No results */}
          {hasQuery && !loading && !hasResults && (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Results */}
          {hasQuery && hasResults && results && (
            <>
              {results.trips.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Trips</p>
                  {results.trips.map((t) => {
                    const item: FlatItem = { label: t.name, sub: `${t.currency} · ${t.code}`, icon: "✈️", path: `/trip/${t.code}` };
                    const idx = runIdx++;
                    return <ResultRow key={t.id} item={item} active={activeIndex === idx} onSelect={() => navigate(item)} />;
                  })}
                </section>
              )}

              {results.expenses.length > 0 && (
                <section className={results.trips.length > 0 ? "border-t border-border/60" : ""}>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Expenses</p>
                  {results.expenses.map((e) => {
                    const item: FlatItem = { label: e.title || "Expense", sub: e.trip?.name ?? "", icon: "💸", path: `/trip/${e.trip?.code ?? ""}` };
                    const idx = runIdx++;
                    return (
                      <button
                        key={e.id}
                        onClick={() => navigate(item)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${activeIndex === idx ? "bg-accent/10" : "hover:bg-background"}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0">💸</span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{e.title || "Expense"}</p>
                            <p className="truncate text-xs text-muted">
                              {e.trip?.name ?? ""}
                              {e.category ? ` · ${e.category}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {e.trip ? formatMoney(e.amount_cents, e.trip.currency) : ""}
                        </span>
                      </button>
                    );
                  })}
                </section>
              )}

              {results.subscriptions.length > 0 && (
                <section className={results.trips.length > 0 || results.expenses.length > 0 ? "border-t border-border/60" : ""}>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Subscriptions</p>
                  {results.subscriptions.map((s) => {
                    const item: FlatItem = { label: s.name, sub: `₹${(s.amount_cents / 100).toFixed(0)} / mo`, icon: "💳", path: "/dashboard/subscriptions" };
                    const idx = runIdx++;
                    return <ResultRow key={s.id} item={item} active={activeIndex === idx} onSelect={() => navigate(item)} />;
                  })}
                </section>
              )}

              {results.goals.length > 0 && (
                <section className={results.trips.length > 0 || results.expenses.length > 0 || results.subscriptions.length > 0 ? "border-t border-border/60" : ""}>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Savings Goals</p>
                  {results.goals.map((g) => {
                    const pct = g.target_cents > 0 ? Math.round((g.current_cents / g.target_cents) * 100) : 0;
                    const item: FlatItem = { label: g.name, sub: `${pct}% complete`, icon: "🎯", path: "/dashboard/savings" };
                    const idx = runIdx++;
                    return <ResultRow key={g.id} item={item} active={activeIndex === idx} onSelect={() => navigate(item)} />;
                  })}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  item,
  active,
  onSelect,
}: {
  item: FlatItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${active ? "bg-accent/10" : "hover:bg-background"}`}
    >
      <span className="shrink-0">{item.icon}</span>
      <div className="min-w-0">
        <p className="truncate font-medium">{item.label}</p>
        {item.sub && <p className="truncate text-xs text-muted">{item.sub}</p>}
      </div>
    </button>
  );
}
