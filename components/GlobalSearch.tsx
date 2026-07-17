"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

type SearchTrip = {
  id: string;
  code: string;
  name: string;
  currency: string;
  created_at: string;
};

type SearchExpense = {
  id: string;
  description: string;
  amount_cents: number;
  category: string | null;
  created_at: string;
  trip: { code: string; name: string; currency: string } | null;
};

type SearchResults = {
  trips: SearchTrip[];
  expenses: SearchExpense[];
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = (await res.json()) as SearchResults;
        setResults(data);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  function navigate(path: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(path);
  }

  const hasResults =
    results && (results.trips.length > 0 || results.expenses.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          🔍
        </span>
        <input
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-accent"
          placeholder="Search trips and expenses…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results) setOpen(true);
          }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse text-xs text-muted">
            ···
          </span>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg">
          {!hasResults ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <>
              {results!.trips.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Trips
                  </p>
                  {results!.trips.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/trip/${t.code}`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-background"
                    >
                      <span className="shrink-0 text-base">✈️</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="text-xs text-muted">
                          {t.currency} · {t.code}
                        </p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {results!.expenses.length > 0 && (
                <section
                  className={
                    results!.trips.length > 0 ? "border-t border-border/60" : ""
                  }
                >
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Expenses
                  </p>
                  {results!.expenses.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(`/trip/${e.trip?.code ?? ""}`)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-background"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{e.description}</p>
                        <p className="text-xs text-muted">
                          {e.trip?.name ?? ""}
                          {e.category ? ` · ${e.category}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold">
                        {e.trip
                          ? formatMoney(e.amount_cents, e.trip.currency)
                          : String(e.amount_cents)}
                      </span>
                    </button>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
