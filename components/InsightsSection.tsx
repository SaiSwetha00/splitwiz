"use client";

import { useCallback, useEffect, useState } from "react";

type InsightContent = {
  body?: string;
  icon?: string;
  action_step?: string;
};

type Insight = {
  id: string;
  type: string;
  title: string;
  content: InsightContent | null;
  generated_at: string;
  expires_at: string | null;
  dismissed: boolean;
};

const CACHE_KEY = "splitwiz_insights_ts_v1";

function getCachedTs(): number {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

function setCachedTs() {
  try {
    localStorage.setItem(CACHE_KEY, String(Date.now()));
  } catch {}
}

function typeIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("saving") || t.includes("goal")) return "💰";
  if (t.includes("spend") || t.includes("expense")) return "📊";
  if (t.includes("sub") || t.includes("bill")) return "🔔";
  if (t.includes("budget")) return "🎯";
  if (t.includes("tip") || t.includes("advice")) return "💡";
  return "✨";
}

function typeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("saving") || t.includes("goal")) return "#10b981";
  if (t.includes("spend") || t.includes("expense")) return "#6366f1";
  if (t.includes("sub") || t.includes("bill")) return "#f59e0b";
  if (t.includes("budget")) return "#3b82f6";
  return "#8b5cf6";
}

function minutesAgo(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded-full bg-border" />
        <div className="h-3.5 w-20 animate-pulse rounded-md bg-border" />
      </div>
      <div className="h-4 w-3/4 animate-pulse rounded-md bg-border" />
      <div className="h-3 w-full animate-pulse rounded-md bg-border" />
      <div className="h-3 w-5/6 animate-pulse rounded-md bg-border" />
      <div className="mt-1 h-7 w-full animate-pulse rounded-lg bg-border" />
    </div>
  );
}

export function InsightsSection() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const applyInsights = useCallback((list: Insight[]) => {
    setInsights(list);
    if (list.length > 0) setLastGenerated(list[0].generated_at);
  }, []);

  const fetchInsights = useCallback(async () => {
    const res = await fetch("/api/ai/insights");
    if (res.ok) {
      const data = (await res.json()) as { insights: Insight[] };
      applyInsights(data.insights ?? []);
    }
  }, [applyInsights]);

  async function generate(manual: boolean) {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insights");
      setCachedTs();
      await fetchInsights();
    } catch (e) {
      if (manual) setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const res = await fetch("/api/ai/insights");
      if (cancelled) return;
      if (res.ok) {
        const data = (await res.json()) as { insights: Insight[] };
        const list = data.insights ?? [];
        if (!cancelled) {
          applyInsights(list);
          setLoading(false);
          if (list.length === 0 && Date.now() - getCachedTs() > 3_600_000) {
            generate(false);
          }
        }
      } else if (!cancelled) {
        setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only effect
  }, []);

  async function dismiss(id: string) {
    const res = await fetch(`/api/ai/insights/${id}`, { method: "PATCH" });
    if (res.ok) {
      setInsights((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">✨ AI Insights</h2>
          {lastGenerated && !generating && (
            <p className="mt-0.5 text-xs text-muted">
              Updated {minutesAgo(lastGenerated)}
            </p>
          )}
          {generating && (
            <p className="mt-0.5 text-xs text-accent">Generating insights…</p>
          )}
        </div>
        <button
          onClick={() => generate(true)}
          disabled={generating || loading}
          className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {generating
            ? "Generating…"
            : insights.length === 0
            ? "Generate"
            : "Regenerate"}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-negative">{error}</p>}

      {loading || generating ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-2xl">🤖</p>
          <p className="font-medium">No insights yet</p>
          <p className="max-w-xs text-sm text-muted">
            Get personalised tips based on your budgets, savings goals, and
            subscriptions.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => {
            const color = typeColor(insight.type);
            const icon = typeIcon(insight.type);
            const body = insight.content?.body ?? "";
            const action = insight.content?.action_step ?? "";
            return (
              <div
                key={insight.id}
                className="relative flex flex-col gap-2.5 rounded-2xl border bg-surface p-4"
                style={{
                  borderColor: `${color}30`,
                  borderLeftWidth: 3,
                  borderLeftColor: color,
                }}
              >
                <button
                  onClick={() => dismiss(insight.id)}
                  className="absolute right-3 top-3 text-xs text-muted transition-colors hover:text-foreground"
                  title="Dismiss"
                >
                  ✕
                </button>

                <div className="flex items-center gap-2 pr-5">
                  <span className="text-base leading-none">{icon}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: `${color}20`, color }}
                  >
                    {insight.type.replace(/_/g, " ")}
                  </span>
                </div>

                <p className="pr-4 text-sm font-semibold leading-tight">
                  {insight.title}
                </p>

                {body && (
                  <p className="text-xs leading-relaxed text-muted">{body}</p>
                )}

                {action && (
                  <div
                    className="rounded-lg px-3 py-2 text-xs font-medium"
                    style={{ background: `${color}12`, color }}
                  >
                    → {action}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
