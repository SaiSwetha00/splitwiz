"use client";

import { useCallback, useEffect, useState } from "react";

type Insight = {
  id: string;
  type: string;
  title: string;
  content: unknown;
  generated_at: string;
  expires_at: string | null;
  dismissed: boolean;
};

export function InsightsSection() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/insights");
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insights");
      await fetchInsights();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function dismiss(id: string) {
    const res = await fetch(`/api/ai/insights/${id}`, { method: "PATCH" });
    if (res.ok) {
      setInsights((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">✨ AI Insights</h2>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
        >
          {generating
            ? "Generating…"
            : insights.length === 0
            ? "Generate"
            : "Refresh"}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-2xl">🤖</p>
          <p className="font-medium">No insights yet</p>
          <p className="text-sm text-muted">
            Generate personalised tips based on your budgets, savings goals,
            and subscriptions.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => {
            const body =
              typeof insight.content === "object" && insight.content !== null
                ? ((insight.content as Record<string, unknown>).body as
                    | string
                    | undefined) ?? ""
                : "";
            return (
              <div
                key={insight.id}
                className="relative flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
              >
                <button
                  onClick={() => dismiss(insight.id)}
                  className="absolute right-3 top-3 text-xs text-muted hover:text-foreground"
                  title="Dismiss insight"
                >
                  ✕
                </button>
                <p className="pr-6 text-sm font-semibold">{insight.title}</p>
                <p className="text-xs leading-relaxed text-muted">{body}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
