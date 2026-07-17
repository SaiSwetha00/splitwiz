"use client";

import { useEffect, useMemo, useState } from "react";
import type { Expense, TripState } from "@/lib/types";
import { formatMoney, splitEqual, toCents } from "@/lib/money";
import { Field, inputClass } from "./ui";

const CATEGORIES = [
  "Food",
  "Lodging",
  "Transport",
  "Activities",
  "Shopping",
  "Other",
];

export default function AddExpenseForm({
  trip,
  expense,
  onClose,
  onSaved,
}: {
  trip: TripState;
  expense?: Expense;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(expense);
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(
    expense ? (expense.amount / 100).toString() : ""
  );
  const [category, setCategory] = useState(expense?.category ?? "");
  const [paidById, setPaidById] = useState(
    expense?.paidById ?? trip.members[0]?.id ?? ""
  );
  const [splitType, setSplitType] = useState<"EQUAL" | "CUSTOM">(
    expense?.splitType ?? "EQUAL"
  );

  // Which members are part of this expense.
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        expense ? expense.shares.map((s) => s.memberId) : trip.members.map((m) => m.id)
      )
  );

  // Custom amounts, as strings keyed by member id.
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {};
      if (expense && expense.splitType === "CUSTOM") {
        for (const s of expense.shares)
          init[s.memberId] = (s.amount / 100).toString();
      }
      return init;
    }
  );

  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (description.trim().length < 3) {
      setSuggestedCategory(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: description.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestedCategory(data.category ?? null);
        }
      } finally {
        setSuggesting(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [description]);

  const totalCents = toCents(amount || 0);
  const selectedIds = trip.members
    .map((m) => m.id)
    .filter((id) => selected.has(id));

  // Live preview of the equal split.
  const equalShares = useMemo(() => {
    if (splitType !== "EQUAL" || !Number.isFinite(totalCents)) return {};
    const amounts = splitEqual(totalCents, selectedIds.length);
    const map: Record<string, number> = {};
    selectedIds.forEach((id, i) => (map[id] = amounts[i] ?? 0));
    return map;
  }, [splitType, totalCents, selectedIds]);

  const customSumCents = selectedIds.reduce(
    (sum, id) => sum + (toCents(customAmounts[id] || 0) || 0),
    0
  );
  const customRemaining = totalCents - customSumCents;

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function splitRemainingEqually() {
    const amounts = splitEqual(totalCents, selectedIds.length);
    const next: Record<string, string> = {};
    selectedIds.forEach((id, i) => (next[id] = ((amounts[i] ?? 0) / 100).toFixed(2)));
    setCustomAmounts(next);
  }

  async function submit() {
    setError(null);
    if (!description.trim()) return setError("Add a description");
    if (!Number.isFinite(totalCents) || totalCents <= 0)
      return setError("Enter an amount greater than 0");
    if (selectedIds.length === 0)
      return setError("Select at least one participant");

    const participants =
      splitType === "EQUAL"
        ? selectedIds.map((id) => ({ memberId: id }))
        : selectedIds.map((id) => ({
            memberId: id,
            amount: customAmounts[id] || 0,
          }));

    if (splitType === "CUSTOM" && customRemaining !== 0) {
      return setError("Custom shares must add up to the total");
    }

    setSaving(true);
    try {
      const url = editing
        ? `/api/trips/${trip.code}/expenses/${expense!.id}`
        : `/api/trips/${trip.code}/expenses`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: Number(amount),
          category: category || null,
          paidById,
          splitType,
          participants,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save expense");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing ? "Edit expense" : "Add expense"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Description">
            <input
              className={inputClass}
              placeholder="Dinner, taxi, hotel…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Amount (${trip.currency})`}>
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">—</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {suggesting && (
                <p className="mt-1 text-xs text-muted">✨ Thinking…</p>
              )}
              {!suggesting &&
                suggestedCategory &&
                suggestedCategory !== category && (
                  <button
                    type="button"
                    onClick={() => setCategory(suggestedCategory)}
                    className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
                  >
                    <span>✨</span>
                    <span>{suggestedCategory}</span>
                  </button>
                )}
            </Field>
          </div>

          <Field label="Paid by">
            <select
              className={inputClass}
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
            >
              {trip.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Split
              </span>
              <div className="flex rounded-lg border border-border p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSplitType("EQUAL")}
                  className={`rounded-md px-2.5 py-1 ${
                    splitType === "EQUAL"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted"
                  }`}
                >
                  Equally
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType("CUSTOM")}
                  className={`rounded-md px-2.5 py-1 ${
                    splitType === "CUSTOM"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {trip.members.map((m) => {
                const isOn = selected.has(m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleMember(m.id)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="flex-1 text-sm">{m.name}</span>
                    {isOn && splitType === "EQUAL" && (
                      <span className="text-sm text-muted">
                        {formatMoney(equalShares[m.id] ?? 0, trip.currency)}
                      </span>
                    )}
                    {isOn && splitType === "CUSTOM" && (
                      <input
                        className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-accent"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={customAmounts[m.id] ?? ""}
                        onChange={(e) =>
                          setCustomAmounts((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {splitType === "CUSTOM" && (
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={splitRemainingEqually}
                  className="font-medium text-accent"
                >
                  Split equally
                </button>
                <span
                  className={
                    customRemaining === 0 ? "text-positive" : "text-negative"
                  }
                >
                  {customRemaining === 0
                    ? "Balanced ✓"
                    : `${formatMoney(
                        Math.abs(customRemaining),
                        trip.currency
                      )} ${customRemaining > 0 ? "left" : "over"}`}
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-3 font-semibold text-muted"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
